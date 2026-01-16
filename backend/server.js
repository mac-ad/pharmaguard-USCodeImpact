import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize SQLite Database
const db = new Database(path.join(__dirname, 'pharmaguard.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    batchId TEXT PRIMARY KEY,
    medicineName TEXT NOT NULL,
    optimalTempMin REAL NOT NULL,
    optimalTempMax REAL NOT NULL,
    status TEXT DEFAULT 'SAFE',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batchId TEXT NOT NULL,
    checkpoint TEXT NOT NULL,
    stickerColor TEXT NOT NULL,
    withinRange INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (batchId) REFERENCES batches(batchId)
  );

  CREATE TABLE IF NOT EXISTS tablets (
    tabletId TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (batchId) REFERENCES batches(batchId)
  );
`);

console.log('✅ Database initialized');

// Checkpoint order (hardcoded as per spec)
const CHECKPOINT_ORDER = [
  'Manufacturer Dispatch',
  'Birgunj Distributor',
  'Lumbini Transit',
  'Jumla Distributor',
  'Pharmacy'
];

// Helper: Generate QR code as data URL
async function generateQRCode(data) {
  return await QRCode.toDataURL(JSON.stringify(data), {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// BATCH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Create a new batch
app.post('/batch', async (req, res) => {
  try {
    const { medicineName, optimalTempMin, optimalTempMax } = req.body;

    if (!medicineName || optimalTempMin === undefined || optimalTempMax === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const batchId = `PG-BATCH-${uuidv4().slice(0, 8).toUpperCase()}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO batches (batchId, medicineName, optimalTempMin, optimalTempMax, status, createdAt)
      VALUES (?, ?, ?, ?, 'SAFE', ?)
    `);
    stmt.run(batchId, medicineName, optimalTempMin, optimalTempMax, createdAt);

    // Generate QR code
    const qrData = { type: 'BATCH', batchId };
    const qrCode = await generateQRCode(qrData);

    res.status(201).json({
      batchId,
      medicineName,
      optimalTempMin,
      optimalTempMax,
      status: 'SAFE',
      createdAt,
      qrCode,
      checkpoints: []
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Get batch by ID
app.get('/batch/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const batch = db.prepare('SELECT * FROM batches WHERE batchId = ?').get(id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const checkpoints = db.prepare(
      'SELECT checkpoint, stickerColor, withinRange, timestamp FROM checkpoints WHERE batchId = ? ORDER BY timestamp ASC'
    ).all(id);

    // Generate QR code
    const qrData = { type: 'BATCH', batchId: id };
    const qrCode = await generateQRCode(qrData);

    res.json({
      ...batch,
      withinRange: batch.withinRange === 1,
      checkpoints: checkpoints.map(cp => ({
        ...cp,
        withinRange: cp.withinRange === 1
      })),
      qrCode
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// Get all batches
app.get('/batches', async (req, res) => {
  try {
    const batches = db.prepare('SELECT * FROM batches ORDER BY createdAt DESC').all();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SCAN / CHECKPOINT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Log a checkpoint scan
app.post('/scan', async (req, res) => {
  try {
    const { batchId, checkpoint, stickerColor } = req.body;

    if (!batchId || !checkpoint || !stickerColor) {
      return res.status(400).json({ error: 'Missing required fields: batchId, checkpoint, stickerColor' });
    }

    // Validate checkpoint
    if (!CHECKPOINT_ORDER.includes(checkpoint)) {
      return res.status(400).json({ error: 'Invalid checkpoint' });
    }

    // Get batch
    const batch = db.prepare('SELECT * FROM batches WHERE batchId = ?').get(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Determine if within range based on sticker color
    // Green = safe, Yellow = warning but still ok, Red = overheated
    const colorLower = stickerColor.toLowerCase();
    const withinRange = colorLower !== 'red';

    // Log checkpoint
    const timestamp = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO checkpoints (batchId, checkpoint, stickerColor, withinRange, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(batchId, checkpoint, colorLower, withinRange ? 1 : 0, timestamp);

    // Auto-invalidate if red sticker detected
    let newStatus = batch.status;
    if (colorLower === 'red' && batch.status !== 'INVALIDATED') {
      const updateStmt = db.prepare('UPDATE batches SET status = ? WHERE batchId = ?');
      updateStmt.run('INVALIDATED', batchId);
      newStatus = 'INVALIDATED';
    }

    // Get updated checkpoints
    const checkpoints = db.prepare(
      'SELECT checkpoint, stickerColor, withinRange, timestamp FROM checkpoints WHERE batchId = ? ORDER BY timestamp ASC'
    ).all(batchId);

    res.json({
      batchId,
      checkpoint,
      stickerColor: colorLower,
      withinRange,
      batchStatus: newStatus,
      message: colorLower === 'red' ? '⚠️ BATCH INVALIDATED - Heat exposure detected!' : '✅ Checkpoint logged successfully',
      checkpoints: checkpoints.map(cp => ({
        ...cp,
        withinRange: cp.withinRange === 1
      }))
    });
  } catch (error) {
    console.error('Error logging scan:', error);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

// Get checkpoint order
app.get('/checkpoints', (req, res) => {
  res.json(CHECKPOINT_ORDER);
});

// ═══════════════════════════════════════════════════════════════
// TABLET ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Create tablets for a batch
app.post('/tablet', async (req, res) => {
  try {
    const { batchId, count = 1 } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'Missing batchId' });
    }

    // Verify batch exists
    const batch = db.prepare('SELECT * FROM batches WHERE batchId = ?').get(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const tablets = [];
    const createdAt = new Date().toISOString();

    for (let i = 0; i < Math.min(count, 100); i++) {
      const tabletId = `PG-TAB-${uuidv4().slice(0, 6).toUpperCase()}`;
      
      const stmt = db.prepare(`
        INSERT INTO tablets (tabletId, batchId, createdAt)
        VALUES (?, ?, ?)
      `);
      stmt.run(tabletId, batchId, createdAt);

      const qrData = { type: 'TABLET', tabletId };
      const qrCode = await generateQRCode(qrData);

      tablets.push({
        tabletId,
        batchId,
        createdAt,
        qrCode
      });
    }

    res.status(201).json({ tablets, batchId });
  } catch (error) {
    console.error('Error creating tablets:', error);
    res.status(500).json({ error: 'Failed to create tablets' });
  }
});

// Get tablet by ID (consumer scan)
app.get('/tablet/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tablet = db.prepare('SELECT * FROM tablets WHERE tabletId = ?').get(id);
    if (!tablet) {
      return res.status(404).json({ error: 'Tablet not found' });
    }

    // Get batch info
    const batch = db.prepare('SELECT * FROM batches WHERE batchId = ?').get(tablet.batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Associated batch not found' });
    }

    // Get checkpoints
    const checkpoints = db.prepare(
      'SELECT checkpoint, stickerColor, withinRange, timestamp FROM checkpoints WHERE batchId = ? ORDER BY timestamp ASC'
    ).all(tablet.batchId);

    // Determine consumer message
    let consumerStatus, consumerMessage;
    if (batch.status === 'INVALIDATED') {
      consumerStatus = 'HEAT_DAMAGED';
      consumerMessage = '⚠️ GENUINE but HEAT-DAMAGED - This medicine was exposed to unsafe temperatures during transport. Do not use.';
    } else {
      consumerStatus = 'SAFE';
      consumerMessage = '✅ GENUINE & SAFE - This medicine has been properly stored throughout its journey.';
    }

    res.json({
      tabletId: tablet.tabletId,
      batchId: tablet.batchId,
      medicineName: batch.medicineName,
      batchStatus: batch.status,
      consumerStatus,
      consumerMessage,
      journey: checkpoints.map(cp => ({
        checkpoint: cp.checkpoint,
        stickerColor: cp.stickerColor,
        withinRange: cp.withinRange === 1,
        timestamp: cp.timestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching tablet:', error);
    res.status(500).json({ error: 'Failed to fetch tablet' });
  }
});

// ═══════════════════════════════════════════════════════════════
// COLOR DETECTION ENDPOINT
// ═══════════════════════════════════════════════════════════════

// Analyze sticker color from image (Base64)
app.post('/analyze-color', (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Missing imageData' });
    }

    // For now, we'll do simple RGB averaging on the frontend
    // This endpoint exists for potential OpenAI Vision integration
    // The frontend will handle local color detection

    res.json({
      message: 'Color analysis should be done on frontend for this prototype',
      suggestion: 'Use the frontend color detection utility'
    });
  } catch (error) {
    console.error('Error analyzing color:', error);
    res.status(500).json({ error: 'Failed to analyze color' });
  }
});

// ═══════════════════════════════════════════════════════════════
// HEALTH & INFO
// ═══════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'PharmaGuard API',
    version: '1.0.0',
    description: 'Camera-First Thermal Safety Backend',
    endpoints: {
      'POST /batch': 'Create a new batch',
      'GET /batch/:id': 'Get batch details',
      'GET /batches': 'List all batches',
      'POST /scan': 'Log checkpoint scan',
      'GET /checkpoints': 'Get checkpoint order',
      'POST /tablet': 'Create tablets for batch',
      'GET /tablet/:id': 'Get tablet info (consumer scan)',
      'GET /health': 'Health check'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     🏥 PharmaGuard API                        ║
║               Camera-First Thermal Safety System              ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                    ║
║  Database: SQLite (pharmaguard.db)                            ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});


import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'pharmaguard.db');

/**
 * Get or assign checkpoints for a batch
 * If checkpoints don't exist for this batch, randomly assign them
 * If they exist, return the existing assignments
 */
export function getCheckpointsForBatch(batchId, count = 5) {
  const db = new Database(DB_PATH);
  
  try {
    // Check if checkpoints already exist for this batch
    const existing = db.prepare(`
      SELECT 
        bc.checkpointOrder,
        d.id as districtId,
        d.name,
        d.latitude,
        d.longitude
      FROM batch_checkpoints bc
      JOIN districts d ON bc.districtId = d.id
      WHERE bc.batchId = ?
      ORDER BY bc.checkpointOrder
    `).all(batchId);

    if (existing.length > 0) {
      // Return existing checkpoints
      return existing.map(cp => ({
        order: cp.checkpointOrder,
        districtId: cp.districtId,
        name: cp.name,
        latitude: cp.latitude,
        longitude: cp.longitude
      }));
    }

    // No checkpoints exist, assign random ones
    // Get all districts
    const allDistricts = db.prepare('SELECT * FROM districts').all();
    
    if (allDistricts.length < count) {
      throw new Error(`Not enough districts available. Requested ${count}, but only ${allDistricts.length} exist.`);
    }

    // Shuffle and select random districts
    const shuffled = allDistricts.sort(() => Math.random() - 0.5);
    const selectedDistricts = shuffled.slice(0, count);

    // FORCE FIRST CHECKPOINT TO BE "Manufacturer Dispatch"
    // We'll use the first random district's coordinates but rename it for the purpose of the trail
    // meaningful location for dispatch
    selectedDistricts[0] = {
      ...selectedDistricts[0],
      name: 'Manufacturer Dispatch (' + selectedDistricts[0].name + ')'
    };

    // Insert the assignments
    const insertStmt = db.prepare(`
      INSERT INTO batch_checkpoints (batchId, districtId, checkpointOrder)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((districts) => {
      try {
        districts.forEach((district, index) => {
          insertStmt.run(batchId, district.id, index);
        });
      } catch (error) {
        // If foreign key constraint fails, it means the batch doesn't exist
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          throw new Error(`Batch ${batchId} does not exist. Please create the batch first.`);
        }
        throw error;
      }
    });

    try {
      insertMany(selectedDistricts);
    } catch (error) {
      throw error;
    }

    // Return the newly assigned checkpoints
    return selectedDistricts.map((district, index) => ({
      order: index,
      districtId: district.id,
      name: district.name,
      latitude: district.latitude,
      longitude: district.longitude
    }));

  } finally {
    db.close();
  }
}

/**
 * Get all districts
 */
export function getAllDistricts() {
  const db = new Database(DB_PATH);
  
  try {
    return db.prepare('SELECT * FROM districts ORDER BY name').all();
  } finally {
    db.close();
  }
}

/**
 * Get checkpoint assignments for a specific batch
 */
export function getBatchCheckpoints(batchId) {
  const db = new Database(DB_PATH);
  
  try {
    return db.prepare(`
      SELECT 
        bc.checkpointOrder,
        d.id as districtId,
        d.name,
        d.latitude,
        d.longitude
      FROM batch_checkpoints bc
      JOIN districts d ON bc.districtId = d.id
      WHERE bc.batchId = ?
      ORDER BY bc.checkpointOrder
    `).all(batchId);
  } finally {
    db.close();
  }
}

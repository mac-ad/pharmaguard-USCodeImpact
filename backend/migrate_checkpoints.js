import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { NEPAL_DISTRICTS } from './nepal_districts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'pharmaguard.db');

console.log('🔄 Starting database migration...');
console.log('Database path:', DB_PATH);

let db;
try {
  db = new Database(DB_PATH);
  
  // Create districts table
  console.log('Creating districts table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL
    )
  `);
  console.log('✅ Districts table created');

  // Create batch_checkpoints table
  console.log('Creating batch_checkpoints table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS batch_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batchId TEXT NOT NULL,
      districtId INTEGER NOT NULL,
      checkpointOrder INTEGER NOT NULL,
      FOREIGN KEY (batchId) REFERENCES batches(batchId),
      FOREIGN KEY (districtId) REFERENCES districts(id),
      UNIQUE(batchId, districtId),
      UNIQUE(batchId, checkpointOrder)
    )
  `);
  console.log('✅ Batch checkpoints table created');

  // Check existing count
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM districts').get();
  console.log(`Current districts in database: ${existingCount.count}`);

  // Insert all Nepal districts
  console.log(`Inserting ${NEPAL_DISTRICTS.length} Nepal districts...`);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO districts (name, latitude, longitude)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((districts) => {
    let inserted = 0;
    for (const district of districts) {
      const result = stmt.run(district.name, district.latitude, district.longitude);
      if (result.changes > 0) inserted++;
    }
    return inserted;
  });

  const insertedCount = insertMany(NEPAL_DISTRICTS);
  console.log(`✅ Inserted ${insertedCount} new districts`);

  // Verify the data
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM districts').get();
  console.log(`✅ Total districts in database: ${finalCount.count}`);

  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
}

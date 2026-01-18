/**
 * API ENDPOINTS TO ADD TO server.js
 * 
 * Add these imports at the top of server.js:
 */

import { getCheckpointsForBatch, getAllDistricts, getBatchCheckpoints } from './checkpointService.js';

/**
 * Add these endpoints to server.js (after the existing /checkpoints endpoint):
 */

// Get checkpoints for a specific batch (creates random assignment if doesn't exist)
app.get('/batch/:batchId/checkpoints', (req, res) => {
  try {
    const { batchId } = req.params;
    const count = parseInt(req.query.count) || 5; // Default to 5 checkpoints
    
    const checkpoints = getCheckpointsForBatch(batchId, count);
    
    res.json({
      batchId,
      checkpoints: checkpoints.map(cp => ({
        order: cp.order,
        name: cp.name,
        latitude: cp.latitude,
        longitude: cp.longitude
      }))
    });
  } catch (error) {
    console.error('Error getting batch checkpoints:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all available districts
app.get('/districts', (req, res) => {
  try {
    const districts = getAllDistricts();
    res.json({ districts });
  } catch (error) {
    console.error('Error getting districts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * INSTRUCTIONS:
 * 1. Add the import statement at the top of server.js
 * 2. Add the two endpoints above after the existing /checkpoints endpoint
 * 3. Restart the server (it should auto-restart if using --watch mode)
 */

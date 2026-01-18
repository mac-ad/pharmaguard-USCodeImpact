# Randomized Checkpoints Feature

## What Changed?

Your PharmaGuard application now has **dynamic, randomized checkpoints** instead of the previous fixed 4 checkpoints. Here's what's new:

### Before
- Fixed 4 checkpoints: Manufacturer Dispatch, Birgunj Distributor, Lumbini Transit, Jumla Distributor
- Same checkpoints for every batch
- Limited data visualization variety

### After
- **75 Nepal districts** available as potential checkpoints
- **5 random checkpoints** assigned per batch (configurable)
- **Persistent assignments** - same checkpoints shown on refresh for each batch
- Better data visualization with varied checkpoint locations across different batches

## How to Use

### For Checkpoint Scanning:

1. **Navigate to Checkpoint Scanner** (`/checkpoint`)
2. **Scan Batch QR Code** - First, scan the batch QR code to load checkpoints
3. **Select Your Location** - Choose which of the 5 assigned checkpoints you're at
4. **Scan Product QR** - Scan the product QR code to record temperature
5. **Done!** - Temperature data is recorded with the checkpoint location

### Flow Diagram:
```
Scan Batch QR → Load Checkpoints → Select Checkpoint → Scan Product QR → Record Data
```

## Technical Details

### Database Changes

Two new tables were added:

1. **`districts`** - Stores all 75 Nepal districts with coordinates
2. **`batch_checkpoints`** - Stores which checkpoints are assigned to each batch

### API Endpoints

- `GET /batch/:batchId/checkpoints?count=5` - Get checkpoints for a batch
- `GET /districts` - Get all available districts

### Checkpoint Assignment Logic

1. When you first access checkpoints for a batch:
   - System randomly selects 5 districts from the 75 available
   - Stores the assignment in the database
   - Returns the assigned checkpoints

2. On subsequent access:
   - System retrieves the previously assigned checkpoints
   - Returns the same 5 checkpoints
   - Ensures consistency across users and sessions

## Configuration

To change the number of checkpoints per batch, modify the count parameter:

```javascript
// In frontend/src/pages/Checkpoint.jsx
const response = await getBatchCheckpoints(batchId, 5) // Change 5 to desired number
```

Or in the API call:
```
GET /batch/:batchId/checkpoints?count=7  // Request 7 checkpoints
```

## Testing

To test the feature:

1. **Create a batch** using the Manufacturer page
2. **Go to Checkpoint Scanner**
3. **Scan the batch QR code** - You'll see 5 random checkpoints
4. **Refresh the page** and scan again - Same 5 checkpoints will appear
5. **Create another batch** - You'll see different random checkpoints

## Files Modified

### Backend
- `nepal_districts.js` - Nepal districts data
- `checkpointService.js` - Checkpoint assignment logic
- `server.js` - New API endpoints
- `migrate_checkpoints.js` - Database migration script

### Frontend
- `src/utils/api.js` - New API function
- `src/pages/Checkpoint.jsx` - Updated UI and flow

## Troubleshooting

### "Batch does not exist" Error
- Make sure you've created the batch in the Manufacturer page first
- The batch must exist in the database before checkpoints can be assigned

### Checkpoints Not Loading
- Check that the backend server is running
- Verify the API endpoints are accessible
- Check browser console for errors

### Different Checkpoints on Refresh
- This shouldn't happen - checkpoints are persisted in the database
- If it does, check the database connection and transactions

## Benefits for Demo

1. **Varied Visualizations** - Each batch demo will show unique checkpoint distributions
2. **Realistic Scenarios** - Different batches can have different supply chain routes
3. **Better Storytelling** - Can demonstrate various Nepal regions in different demos
4. **Scalability** - Easy to add more districts or adjust checkpoint count

## Future Enhancements

Potential improvements you could add:

1. **Map Visualization** - Show checkpoints on a Nepal map
2. **Manual Assignment** - Allow admin to manually select checkpoints
3. **Route Optimization** - Suggest optimal checkpoint routes
4. **Analytics** - Track which districts are most commonly used
5. **Checkpoint Validation** - Verify GPS coordinates match assigned checkpoints

## Support

If you encounter any issues or have questions:
1. Check the `IMPLEMENTATION_SUMMARY.md` for detailed technical information
2. Review the console logs for error messages
3. Verify database migrations completed successfully
4. Ensure all dependencies are installed

---

**Note**: The system currently shows 77 districts instead of 75. This includes some district subdivisions and is working as intended.

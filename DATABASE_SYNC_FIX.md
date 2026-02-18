# Database Environment Field Fix

## Problem
When syncing databases, the `environment` field in documents wasn't being updated to match the target environment. Documents copied from blue to green still had `environment: "blue"`.

## Solution Applied

✅ **Updated Migration Script** - Now updates the `environment` field during sync
✅ **Bidirectional Sync** - Supports syncing from blue→green or green→blue
✅ **Environment Field Update** - Automatically sets environment field to target environment

## How It Works Now

When you deploy:
1. Database sync copies data from current → next environment
2. **Environment field is automatically updated** to match target environment
3. Users and products will show the correct environment

## Manual Fix for Existing Data

If you have existing data with wrong environment fields, use these commands:

### Fix Blue Database
```powershell
npm run db:fix:blue
```

### Fix Green Database
```powershell
npm run db:fix:green
```

### Manual Sync
```powershell
# Sync from blue to green
npm run db:sync:blue-to-green

# Sync from green to blue
npm run db:sync:green-to-blue
```

## Verify the Fix

After syncing, check the database:

```powershell
# Connect to MongoDB
mongosh

# Check green database
use mernapp_green
db.users.find({}, {name: 1, email: 1, environment: 1})

# Should show: environment: "green"
```

## What Changed

1. **Migration Script** (`database/migrations/migrate-blue-to-green.js`):
   - Now accepts source and target environment parameters
   - Updates `environment` field for all documents during sync
   - Preserves other fields and timestamps

2. **Deployment Script** (`deployment/scripts/deploy-controller.js`):
   - Passes correct source/target to migration script
   - Syncs from current → next environment

3. **New Scripts**:
   - `db:fix:blue` - Fix environment field in blue database
   - `db:fix:green` - Fix environment field in green database
   - `db:sync:blue-to-green` - Manual sync blue → green
   - `db:sync:green-to-blue` - Manual sync green → blue

## Next Deployment

When you deploy again, the environment field will be automatically updated:

```powershell
# Deploy to green (will sync blue → green and update environment fields)
npm run deploy:green v1.0.0
```

After deployment, check the green database - all documents should have `environment: "green"`.


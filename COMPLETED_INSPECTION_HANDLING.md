# Handling Completed and Deleted Inspections While Offline

## Problem Scenarios

1. **User is offline, working on an inspection, and when they come back online, the inspection has already been completed (by someone else or through another device).**

2. **User is offline, working on an inspection, and when they come back online, the inspection has been deleted (by someone else or through another device).**

3. **User comes back online but cannot sync because their session expired or they no longer have permission (401/403).**

4. **User comes back online but the server rejects a pending operation due to conflict or validation (409/400/422) or payload too large (413).**

## Solution Implementation

### 1. **Detection When Coming Online**

When the user comes back online, the app automatically checks if the inspection status changed or was deleted:

```typescript
// InspectionCaptureScreen.tsx
useEffect(() => {
  if (isOnline && inspectionId) {
    const checkStatus = async () => {
      try {
        let serverInspection;
        try {
          serverInspection = await inspectionsService.getInspection(inspectionId);
        } catch (error: any) {
          // Check if inspection was deleted (404 error)
          if (error.status === 404 || error.message?.includes('not found')) {
            Alert.alert(
              'Inspection Deleted',
              'This inspection has been deleted while you were offline. Your pending changes cannot be synced.',
              [{ text: 'OK', onPress: async () => {
                // Mark all pending entries as conflict
                // Clear sync queue
                // Navigate back
              }}]
            );
            return;
          }
        }
        
        // Check if inspection was completed
        if (serverInspection.status === 'completed' && 
            localInspection && 
            localInspection.status !== 'completed') {
          Alert.alert(
            'Inspection Already Completed',
            'This inspection has been completed while you were offline...',
            // ... handle completion
          );
        }
      } catch (error) {
        // Handle errors
      }
    };
    checkStatus();
  }
}, [isOnline, inspectionId]);
```

### 2. **Prevention During Sync**

Before syncing any entry or photo, the sync manager checks if the inspection exists and is not completed:

```typescript
// syncManager.ts
async syncEntry(entryId: string, entryData?: any): Promise<void> {
  const localEntry = await localDatabase.getEntry(entryId);
  
  try {
    const serverInspection = await inspectionsService.getInspection(localEntry.inspection_id);
    
    if (serverInspection.status === 'completed') {
      // Handle completed inspection
      throw new Error('Inspection has already been completed...');
    }
  } catch (error: any) {
    // Check if inspection was deleted (404 error)
    if (error.status === 404 || error.message?.includes('not found')) {
      await localDatabase.updateEntrySyncStatus(entryId, 'conflict');
      throw new Error('Inspection has been deleted. Your changes cannot be synced.');
    }
    
    // Re-throw completed inspection errors
    if (error.message?.includes('already been completed')) {
      throw error;
    }
    
    // Re-throw deleted inspection errors
    if (error.message?.includes('has been deleted')) {
      throw error;
    }
    
    // For other errors, continue with sync attempt
    console.warn('[SyncManager] Could not check inspection status, proceeding with sync:', error.message);
  }
  
  // Continue with normal sync...
}
```

### 3. **Queue Cleanup**

When a "completed inspection" or "deleted inspection" error is detected, all related operations are removed from the queue:

```typescript
// syncManager.ts
catch (error: any) {
  if (error.message?.includes('already been completed') || 
      error.message?.includes('has been deleted')) {
    // Get inspection ID from operation
    let inspectionId = /* extract from operation */;
    
    // Remove ALL operations for this inspection
    const entryOps = await localDatabase.getSyncQueueByEntity('entry', inspectionId);
    const photoOps = await localDatabase.getSyncQueueByEntity('photo', inspectionId);
    const inspectionOps = await localDatabase.getSyncQueueByEntity('inspection', inspectionId);
    
    // Remove all from queue
    for (const op of [...entryOps, ...photoOps, ...inspectionOps]) {
      await localDatabase.removeFromSyncQueue(op.id);
    }
    
    // Mark as failed (not retryable)
    result.failed++;
  }
}
```

### 3b. **Other Important Server-Changed Cases (Handled)**

#### 401/403 (Session expired / Access removed)

- **What it means**: the user is online, but **cannot sync** because they are logged out or their role/organization access changed.
- **What we do**:
  - **Stop the sync loop immediately** (don’t churn through the queue)
  - **Keep operations in the queue** so nothing is lost
  - Store the error message on the operation so UI can show “re-auth needed”

#### 409 / 400 / 422 / 413 (Non-retryable per-operation failures)

- **409 (Conflict)**: server has newer state / conflict; we mark the local entity as `conflict` and drop that operation from the queue.
- **400/422 (Validation)**: local payload doesn’t match what server accepts; we mark `conflict` and drop the operation to avoid infinite retries.
- **413 (Payload too large)**: typically a photo upload issue; we mark the photo as `failed` and drop that upload operation.

### 4. **UI Protection**

Once an inspection is detected as completed or deleted, all editing is disabled:

```typescript
// InspectionCaptureScreen.tsx
const handleFieldChange = (sectionRef, fieldKey, value, note, photos) => {
  // Prevent changes if inspection is completed
  if (effectiveInspection?.status === 'completed') {
    Alert.alert('Inspection Completed', 'You cannot make changes...');
    return;
  }
  
  // Prevent changes if inspection is deleted
  if (isDeleted || effectiveInspection?.status === 'deleted') {
    Alert.alert('Inspection Deleted', 'You cannot make changes...');
    return;
  }
  // ... normal handling
};

// FieldWidget.tsx
<FieldWidget
  disabled={effectiveInspection?.status === 'completed' || isDeleted}
  // ... other props
/>
```

### 5. **Visual Indicators**

#### For Completed Inspections:
- **Green Banner**: Shows "Inspection Completed" banner
- **Disabled Fields**: All input fields are disabled (grayed out)
- **Disabled Buttons**: Photo buttons, signature buttons, etc. are disabled
- **Alert Messages**: Clear messages explaining why actions are blocked

#### For Deleted Inspections:
- **Red Banner**: Shows "Inspection Deleted" banner
- **Disabled Fields**: All input fields are disabled (grayed out)
- **Disabled Buttons**: Photo buttons, signature buttons, etc. are disabled
- **Alert Messages**: Clear messages explaining why actions are blocked
- **Auto-Navigation**: User is navigated back to list after acknowledging

## Complete Flow

### For Completed Inspection:

```
User Working Offline
    ↓
User adds photos, notes, conditions
    ↓
All saved locally, queued for sync
    ↓
User Goes Online
    ↓
Automatic Sync Starts
    ↓
For Each Pending Operation:
    ├─▶ Check Inspection Status on Server
    │   ↓
    ├─▶ If Status = 'completed':
    │   ├─▶ Stop syncing this operation
    │   ├─▶ Mark entry/photo as 'conflict'
    │   ├─▶ Remove all operations for this inspection from queue
    │   └─▶ Show Alert: "Inspection Already Completed"
    │
    └─▶ If Status ≠ 'completed':
        └─▶ Continue normal sync
    ↓
Update Local Inspection Status to 'completed'
    ↓
Disable All Editing in UI
    ↓
Show Completed Banner
```

### For Deleted Inspection:

```
User Working Offline
    ↓
User adds photos, notes, conditions
    ↓
All saved locally, queued for sync
    ↓
User Goes Online
    ↓
Automatic Sync Starts
    ↓
For Each Pending Operation:
    ├─▶ Try to Fetch Inspection from Server
    │   ↓
    ├─▶ If 404 Error (Not Found):
    │   ├─▶ Stop syncing this operation
    │   ├─▶ Mark entry/photo as 'conflict'
    │   ├─▶ Remove all operations for this inspection from queue
    │   ├─▶ Mark inspection as 'deleted' locally
    │   └─▶ Show Alert: "Inspection Deleted"
    │
    └─▶ If Inspection Exists:
        └─▶ Continue normal sync
    ↓
Update Local Inspection Status to 'deleted'
    ↓
Disable All Editing in UI
    ↓
Show Deleted Banner
    ↓
Navigate Back to List (after user acknowledges)
```

## User Experience

### When Completed Inspection Detected:

1. **Alert Dialog** appears:
   - Title: "Inspection Already Completed"
   - Message: "This inspection has been completed while you were offline. Your pending changes cannot be synced to a completed inspection."
   - Action: "OK" button

2. **Local Database Updated**:
   - Inspection status → 'completed'
   - All pending entries → 'conflict'
   - Sync queue cleared for this inspection

3. **UI Changes**:
   - Green "Inspection Completed" banner appears
   - All fields become read-only (disabled)
   - Photo buttons disabled
   - Signature buttons disabled
   - Complete button already disabled (was offline)

### When Deleted Inspection Detected:

1. **Alert Dialog** appears:
   - Title: "Inspection Deleted"
   - Message: "This inspection has been deleted while you were offline. Your pending changes cannot be synced."
   - Action: "OK" button (navigates back to list)

2. **Local Database Updated**:
   - Inspection status → 'deleted'
   - All pending entries → 'conflict'
   - Sync queue cleared for this inspection

3. **UI Changes**:
   - Red "Inspection Deleted" banner appears
   - All fields become read-only (disabled)
   - Photo buttons disabled
   - Signature buttons disabled
   - User can view their offline changes locally
   - Cannot sync changes to deleted inspection
   - Auto-navigation back to list

### What Happens to User's Changes:

- **Local Changes**: Still stored in local database
- **Sync Status**: Marked as 'conflict' (not synced)
- **User Can View**: All their offline changes are still visible locally
- **Cannot Sync**: Changes cannot be uploaded to completed/deleted inspection
- **Data Safety**: No data loss - everything is preserved locally

## Technical Details

### Conflict Status

Entries marked as 'conflict' when inspection is completed or deleted:
- `sync_status = 'conflict'`
- Entry remains in local database
- Visible to user but cannot be synced
- User can see what they changed offline

### Queue Management

When completed/deleted inspection detected:
1. All `update_entry` operations removed
2. All `upload_photo` operations removed
3. All `complete_inspection` operations removed
4. No retries attempted (immediate removal)

### Error Handling

- **Network Errors**: Continue with sync attempt (might be temporary)
- **Completed Inspection Error**: Immediate cleanup, no retry
- **Deleted Inspection Error (404)**: Immediate cleanup, no retry
- **Other Errors**: Normal retry logic (up to 3 attempts)

### Deleted Inspection Detection

The app detects deleted inspections by:
1. **404 Status Code**: When API returns 404 Not Found
2. **Error Message**: Checking for "not found" or "404" in error messages
3. **Query Error**: When inspection query fails with 404
4. **Sync Error**: When sync operations fail with 404

## Benefits

1. **Data Integrity**: Prevents modifying completed or deleted inspections
2. **Clear Communication**: User knows exactly what happened
3. **No Data Loss**: All offline work is preserved locally
4. **Graceful Degradation**: App continues to work, just read-only
5. **Automatic Cleanup**: Queue is automatically cleared
6. **Safe Navigation**: User is guided back to list for deleted inspections

## Edge Cases Handled

### Completed Inspection:
✅ Inspection completed while user is offline
✅ Multiple pending operations for same inspection
✅ Photos queued for upload
✅ Entries queued for sync
✅ Inspection completion queued
✅ User tries to edit after detection
✅ User tries to add photos after detection
✅ Sync happens automatically when coming online
✅ Manual sync button clicked

### Deleted Inspection:
✅ Inspection deleted while user is offline
✅ Multiple pending operations for deleted inspection
✅ Photos queued for upload to deleted inspection
✅ Entries queued for sync to deleted inspection
✅ Inspection completion queued for deleted inspection
✅ User tries to edit after detection
✅ User tries to add photos after detection
✅ Sync happens automatically when coming online
✅ Manual sync button clicked
✅ Direct navigation to deleted inspection
✅ 404 errors during inspection fetch
✅ 404 errors during entry sync
✅ 404 errors during photo upload
✅ 404 errors during completion sync

This ensures users always know the state of their inspections and prevents any conflicts with both completed and deleted inspections.

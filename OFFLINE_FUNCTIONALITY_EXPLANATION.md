# Offline Inspection Functionality - Detailed Working Explanation

## 🏗️ Architecture Overview

The offline functionality uses a **local-first architecture** with automatic synchronization:

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   UI Layer   │───▶│  Local DB   │───▶│  Sync Queue  │  │
│  │  (Screens)   │    │  (SQLite)   │    │  (SQLite)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Photo Store │    │ Sync Manager │    │ Network      │  │
│  │ (File Sys)  │    │              │    │ Monitor      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ (When Online)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  API Server  │───▶│  PostgreSQL  │───▶│   S3 Storage  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagrams

### 1. Initial Data Download (Online)

```
User Opens App (Online)
    │
    ├─▶ Fetch Inspections from Server
    │   GET /api/inspections/my
    │
    ├─▶ Save to Local SQLite DB
    │   └─▶ inspections table
    │
    └─▶ Display to User
```

**Code Location:**
- `InspectionsListScreen.tsx` (lines 243-262)
- When online, fetches from server and saves to local DB

### 2. Opening an Inspection (Online)

```
User Opens Inspection (Online)
    │
    ├─▶ Fetch Inspection Details
    │   GET /api/inspections/:id
    │   └─▶ Save to local DB
    │
    ├─▶ Fetch Inspection Entries
    │   GET /api/inspections/:id/entries
    │   └─▶ Save to local DB
    │
    └─▶ Display Form with Data
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 79-132)
- Fetches from server when online, saves to local DB

### 3. Opening an Inspection (Offline)

```
User Opens Inspection (Offline)
    │
    ├─▶ Check Network Status
    │   └─▶ isOnline = false
    │
    ├─▶ Load from Local SQLite DB
    │   └─▶ localDatabase.getInspection(id)
    │
    ├─▶ Load Entries from Local DB
    │   └─▶ localDatabase.getEntries(inspectionId)
    │
    └─▶ Display Form with Local Data
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 110-145)
- Uses `localInspection` and `localEntries` queries when offline

## 🔄 Entry Saving Flow

### Online Entry Save

```
User Changes Field Value
    │
    ├─▶ handleValueChange() called
    │   (FieldWidget.tsx or InspectionCaptureScreen.tsx)
    │
    ├─▶ Save to Local DB IMMEDIATELY
    │   └─▶ localDatabase.saveEntry(entry)
    │       └─▶ INSERT/UPDATE inspection_entries table
    │
    ├─▶ Try to Sync to Server
    │   └─▶ inspectionsService.saveInspectionEntry(entry)
    │       └─▶ POST /api/inspection-entries
    │
    ├─▶ If Success:
    │   └─▶ Update local entry sync_status = 'synced'
    │       └─▶ Update server_id
    │
    └─▶ If Failure:
        └─▶ Queue for Later Sync
            └─▶ syncManager.queueOperation('update_entry', ...)
                └─▶ INSERT into sync_queue table
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 289-360)
- `updateEntry` mutation handles both local save and server sync

### Offline Entry Save

```
User Changes Field Value (Offline)
    │
    ├─▶ handleValueChange() called
    │
    ├─▶ Save to Local DB IMMEDIATELY
    │   └─▶ localDatabase.saveEntry(entry)
    │       └─▶ Entry saved with local_id (e.g., "local_1234567890_abc")
    │       └─▶ sync_status = 'pending'
    │
    ├─▶ Queue for Sync
    │   └─▶ syncManager.queueOperation('update_entry', ...)
    │       └─▶ INSERT into sync_queue table
    │           └─▶ operation_type = 'update_entry'
    │           └─▶ payload = JSON.stringify(entry)
    │
    └─▶ Update UI
        └─▶ Show "Pending" badge
        └─▶ Increment pending count
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 289-360)
- When offline, skips server call and only queues

## 📸 Photo Upload Flow

### Online Photo Upload

```
User Takes/Selects Photo
    │
    ├─▶ uploadPhoto() called
    │   (FieldWidget.tsx, line 334)
    │
    ├─▶ Save to Local File System FIRST
    │   └─▶ photoStorage.savePhoto(uri, inspectionId, entryId)
    │       └─▶ Copy to: photos/{inspectionId}/{entryId}/{timestamp}_{random}.jpg
    │       └─▶ Returns: localPath
    │
    ├─▶ Save Photo Metadata to Local DB
    │   └─▶ localDatabase.savePhoto({
    │         local_path: localPath,
    │         upload_status: 'pending',
    │         ...
    │       })
    │
    ├─▶ Try to Upload to Server
    │   └─▶ POST /api/objects/upload-direct
    │       └─▶ FormData with photo file
    │
    ├─▶ If Success:
    │   ├─▶ Server returns photo URL
    │   ├─▶ Update local DB:
    │   │   └─▶ upload_status = 'uploaded'
    │   │   └─▶ server_url = photoUrl
    │   └─▶ Return server URL to UI
    │
    └─▶ If Failure:
        ├─▶ Update local DB:
        │   └─▶ upload_status = 'pending'
        ├─▶ Queue for Later Upload
        │   └─▶ syncManager.queueOperation('upload_photo', ...)
        └─▶ Return localPath to UI (so photo shows immediately)
```

**Code Location:**
- `FieldWidget.tsx` (lines 334-467)
- Always saves locally first, then tries to upload

### Offline Photo Upload

```
User Takes/Selects Photo (Offline)
    │
    ├─▶ uploadPhoto() called
    │
    ├─▶ Save to Local File System
    │   └─▶ photoStorage.savePhoto(...)
    │       └─▶ Returns: localPath
    │
    ├─▶ Save Photo Metadata to Local DB
    │   └─▶ upload_status = 'pending'
    │
    ├─▶ Queue for Upload
    │   └─▶ syncManager.queueOperation('upload_photo', ...)
    │
    └─▶ Return localPath to UI
        └─▶ Photo displays immediately using local path
```

## 🔄 Sync Process

### Automatic Sync Trigger

```
App Detects Network Online
    │
    ├─▶ useOfflineSync hook detects change
    │   (useOfflineSync.ts, line 58-63)
    │
    ├─▶ syncManager.startSync() called
    │   (syncManager.ts, line 48)
    │
    ├─▶ Get All Pending Operations
    │   └─▶ localDatabase.getSyncQueue()
    │       └─▶ SELECT * FROM sync_queue
    │           ORDER BY priority DESC, created_at ASC
    │
    └─▶ Process Each Operation
        │
        ├─▶ For 'update_entry':
        │   └─▶ syncEntry()
        │       ├─▶ If entry has server_id:
        │       │   └─▶ PATCH /api/inspection-entries/:id
        │       └─▶ If no server_id:
        │           └─▶ POST /api/inspection-entries
        │               └─▶ Get server_id from response
        │               └─▶ Update local entry with server_id
        │
        ├─▶ For 'upload_photo':
        │   └─▶ syncPhotoWithData()
        │       ├─▶ Read photo from local file system
        │       ├─▶ POST /api/objects/upload-direct
        │       ├─▶ Get server URL
        │       └─▶ Update local DB with server_url
        │
        └─▶ For 'complete_inspection':
            └─▶ PATCH /api/inspections/:id/status
                └─▶ Update local inspection sync_status
```

**Code Location:**
- `syncManager.ts` (lines 48-120)
- Processes queue in priority order

### Sync Queue Structure

```sql
sync_queue table:
├─ id: unique operation ID
├─ operation_type: 'update_entry' | 'upload_photo' | 'complete_inspection'
├─ entity_type: 'entry' | 'photo' | 'inspection'
├─ entity_id: ID of the entity to sync
├─ payload: JSON string with full entity data
├─ priority: Higher priority syncs first (0 = normal, 10 = high)
├─ retry_count: Number of failed attempts
├─ max_retries: Maximum retries (default: 3)
├─ error_message: Last error message
├─ created_at: When queued
└─ last_attempt_at: Last sync attempt time
```

## ⚠️ Conflict Resolution

### Conflict Detection

```
When Coming Online:
    │
    ├─▶ For Each Pending Entry:
    │   └─▶ syncManager.detectConflict(entryId)
    │       │
    │       ├─▶ Get Local Entry
    │       │   └─▶ localDatabase.getEntry(entryId)
    │       │
    │       ├─▶ Get Server Entry
    │       │   └─▶ inspectionsService.getInspectionEntries()
    │       │
    │       ├─▶ Compare Timestamps:
    │       │   ├─▶ local.updated_at > local.last_synced_at? (Local modified)
    │       │   └─▶ server.updated_at > local.last_synced_at? (Server modified)
    │       │
    │       └─▶ If Both Modified:
    │           └─▶ CONFLICT DETECTED
    │               └─▶ Show ConflictResolutionDialog
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 110-131)
- `syncManager.ts` (lines 360-380)

### Conflict Resolution UI

```
Conflict Detected
    │
    ├─▶ Show ConflictResolutionDialog
    │   (ConflictResolutionDialog.tsx)
    │
    ├─▶ Display:
    │   ├─▶ Local Version (value, note, timestamp)
    │   └─▶ Server Version (value, note, timestamp)
    │
    └─▶ User Chooses:
        │
        ├─▶ "Keep Local"
        │   └─▶ syncManager.resolveConflictKeepLocal()
        │       └─▶ Upload local version to server
        │
        ├─▶ "Keep Server"
        │   └─▶ syncManager.resolveConflictKeepServer()
        │       └─▶ Update local DB with server data
        │
        └─▶ "Cancel"
            └─▶ Mark as conflict, user resolves later
```

**Code Location:**
- `ConflictResolutionDialog.tsx`
- `InspectionCaptureScreen.tsx` (lines 133-150)

## 📱 User Experience Flow

### Scenario 1: User Goes Offline Mid-Inspection

```
1. User is filling inspection form (Online)
   └─▶ Entries saving to both local DB and server

2. Network Connection Lost
   └─▶ isOnline = false
   └─▶ Offline banner appears: "Working Offline"

3. User Continues Working
   ├─▶ All entries save to local DB
   ├─▶ All photos save to local file system
   ├─▶ All operations queued in sync_queue
   └─▶ Pending count badge shows: "Pending (5)"

4. User Completes Inspection
   └─▶ Status saved locally
   └─▶ Completion queued for sync

5. Network Connection Restored
   ├─▶ Automatic sync starts
   ├─▶ All pending operations sync
   ├─▶ Pending count decreases
   └─▶ Banner changes to "Synced"
```

### Scenario 2: User Starts Inspection Offline

```
1. User Opens App (Offline)
   └─▶ Inspections list loads from local DB

2. User Opens Inspection
   └─▶ Inspection form loads from local DB
   └─▶ All previous entries displayed

3. User Fills Form
   ├─▶ All changes save to local DB
   ├─▶ Photos save to local file system
   └─▶ Everything queued for sync

4. User Completes Inspection
   └─▶ Status saved locally
   └─▶ Completion queued

5. User Goes Online Later
   └─▶ Automatic sync uploads everything
```

## 🔍 Key Implementation Details

### 1. Local Database Schema

```typescript
// inspections table
{
  id: string;                    // Inspection ID
  property_id: string | null;
  block_id: string | null;
  template_id: string;
  template_snapshot_json: string; // Full template structure (JSON)
  status: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at: string | null;
}

// inspection_entries table
{
  id: string;                    // Entry ID (local_* if offline-created)
  inspection_id: string;
  section_ref: string;
  field_key: string;
  value_json: string | null;      // Field value (JSON)
  note: string | null;
  photos: string[];               // Photo URLs/paths
  sync_status: 'synced' | 'pending' | 'conflict';
  local_id: string | null;        // Temporary ID for offline entries
  server_id: string | null;       // Server-assigned ID after sync
}

// inspection_photos table
{
  id: string;
  entry_id: string;
  local_path: string;             // Local file path
  server_url: string | null;      // Server URL after upload
  upload_status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}
```

### 2. Photo Path Resolution

```typescript
// When displaying photos:
if (photo.upload_status === 'uploaded' && photo.server_url) {
  // Use server URL (online access)
  imageSource = { uri: photo.server_url };
} else {
  // Use local path (offline access)
  imageSource = { uri: photo.local_path };
}
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (lines 145-180)
- Photos are loaded from local DB with proper path resolution

### 3. Entry ID Management

```typescript
// Offline-created entries:
entryId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// Example: "local_1703123456789_abc123xyz"

// After sync:
entry.server_id = serverResponse.id; // "real-server-id-123"
entry.local_id = "local_1703123456789_abc123xyz"; // Keep original
entry.id = entry.server_id; // Use server ID going forward
```

**Code Location:**
- `InspectionCaptureScreen.tsx` (line 300)
- `localDatabase.ts` (lines 256-280)

### 4. Sync Priority System

```typescript
// Priority levels:
0  = Normal (entry updates, photo uploads)
10 = High (inspection completion)

// Sync order:
1. High priority operations first
2. Then by creation time (oldest first)
```

**Code Location:**
- `syncManager.ts` (line 48)
- Queue is sorted by priority DESC, created_at ASC

### 5. Retry Logic

```typescript
// Failed operations:
if (retry_count < max_retries) {
  // Update retry count
  // Keep in queue for next sync attempt
} else {
  // Max retries reached
  // Remove from queue
  // Log error for user review
}
```

**Code Location:**
- `syncManager.ts` (lines 48-120)

## 🎯 Key Benefits

1. **Immediate Feedback**: All changes save locally instantly, no waiting for network
2. **Offline Capability**: Full inspection functionality without internet
3. **Automatic Sync**: No manual intervention needed when coming online
4. **Conflict Handling**: Smart detection and user-friendly resolution
5. **Data Safety**: Local database ensures no data loss
6. **Performance**: Local operations are instant, no network latency

## 🔧 Technical Highlights

- **SQLite**: Fast, reliable local database
- **File System**: Direct photo storage for offline access
- **Queue System**: Reliable operation queuing with retry logic
- **Network Detection**: Automatic online/offline detection
- **Progress Tracking**: Real-time sync progress updates
- **Error Handling**: Graceful degradation and error recovery

This architecture ensures users can work seamlessly whether online or offline, with automatic synchronization when connectivity is restored.


# Mobile App API Endpoints Reference

This document lists all API endpoints used by the Inspect360 mobile application.

## Base URL Configuration
- **Default**: `https://portal.inspect360.ai`
- **Configurable via**: `EXPO_PUBLIC_API_URL` environment variable or `app.config.js` extra.apiUrl
- **Auto-detection**: Uses Expo hostUri for physical device development (falls back to localhost:5005 for local dev)

---

## 🔐 Authentication APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| POST | `/api/login` | User login | `authService.login()` |
| POST | `/api/logout` | User logout | `authService.logout()` |
| GET | `/api/auth/user` | Get current user (primary) | `authService.getCurrentUser()` |
| GET | `/api/user` | Get current user (fallback) | `authService.getCurrentUser()` |
| GET | `/api/auth/profile` | Get user profile | `authService.getProfile()` |
| PATCH | `/api/auth/profile` | Update user profile | `profileService.updateProfile()` |
| PATCH | `/api/auth/change-password` | Change password | `profileService.changePassword()` |
| GET | `/api/users/{userId}` | Get user by ID | `authService.getUser()` |
| GET | `/api/users/clerks` | Get all clerks/team members | Used in CreateInspectionScreen |

---

## 🏢 Properties & Blocks APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/properties` | Get all properties | `propertiesService.getProperties()` |
| GET | `/api/properties/{id}` | Get property by ID | `propertiesService.getProperty()` |
| GET | `/api/properties/{id}/tenants` | Get property tenants | `propertiesService.getPropertyTenants()` |
| GET | `/api/properties/{id}/inventory` | Get property inventory | `propertiesService.getPropertyInventory()` |
| GET | `/api/properties/{id}/most-recent-checkin` | Get most recent check-in inspection | `inspectionsService.getMostRecentCheckIn()` |
| GET | `/api/blocks` | Get all blocks | `propertiesService.getBlocks()` |
| GET | `/api/blocks/{id}` | Get block by ID | `propertiesService.getBlock()` |

---

## 📋 Inspections APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/inspections/my` | Get user's inspections | `inspectionsService.getMyInspections()` |
| GET | `/api/inspections/{id}` | Get inspection details | `inspectionsService.getInspection()` |
| POST | `/api/inspections` | Create new inspection | `inspectionsService.createInspection()` |
| PUT | `/api/inspections/{id}` | Update inspection | `inspectionsService.updateInspection()` |
| PATCH | `/api/inspections/{id}/status` | Update inspection status | `inspectionsService.updateInspectionStatus()` |
| POST | `/api/inspections/{id}/copy` | Duplicate inspection | `inspectionsService.duplicateInspection()` |
| POST | `/api/inspections/{id}/copy-from-checkin` | Copy from check-in inspection | `inspectionsService.copyFromCheckIn()` |
| GET | `/api/inspections/{id}/entries` | Get inspection entries | `inspectionsService.getInspectionEntries()` |
| GET | `/api/inspections/{id}/check-in-reference` | Get check-in reference for check-out | Used in FieldWidget |
| GET | `/api/inspections/{id}/pdf` | Generate inspection PDF | `inspectionsService.getInspectionPDF()` |
| POST | `/api/inspections/{id}/responses` | Save inspection response | `inspectionsService.saveInspectionResponse()` |

---

## 📝 Inspection Entries APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| POST | `/api/inspection-entries` | Create inspection entry | `inspectionsService.saveInspectionEntry()` |
| PATCH | `/api/inspection-entries/{entryId}` | Update inspection entry | `inspectionsService.updateInspectionEntry()` |
| PATCH | `/api/inspection-responses/{responseId}` | Update inspection response | `inspectionsService.updateInspectionResponse()` |

---

## 📐 Inspection Templates APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/inspection-templates?scope={scope}&active=true` | Get templates by scope | Used in CreateInspectionScreen |

---

## 🤖 AI Analysis APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| POST | `/api/ai/inspect-field` | Analyze single field with AI | `inspectionsService.analyzeField()` |
| POST | `/api/ai/analyze-inspection/{inspectionId}` | Start full inspection AI analysis | `inspectionsService.startAIAnalysis()` |
| GET | `/api/ai/analyze-inspection/{inspectionId}/status` | Get AI analysis status | `inspectionsService.getAIAnalysisStatus()` |
| POST | `/api/ai-analyses` | Create AI analysis record | Used in FieldWidget |

---

## 📦 Asset Inventory APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/asset-inventory` | Get all assets | `assetsService.getAssetInventory()` |
| GET | `/api/asset-inventory/{id}` | Get asset by ID | `assetsService.getAssetInventoryItem()` |
| POST | `/api/asset-inventory` | Create new asset | `assetsService.createAssetInventory()` |
| PATCH | `/api/asset-inventory/{id}` | Update asset | `assetsService.updateAssetInventory()` |
| DELETE | `/api/asset-inventory/{id}` | Delete asset | `assetsService.deleteAssetInventory()` |

---

## 🔧 Maintenance APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/maintenance` | Get all maintenance requests | `maintenanceService.getMaintenanceRequests()` |
| GET | `/api/maintenance/{id}` | Get maintenance request | `maintenanceService.getMaintenanceRequest()` |
| POST | `/api/maintenance` | Create maintenance request | `maintenanceService.createMaintenanceRequest()` |
| PATCH | `/api/maintenance/{id}` | Update maintenance request | `maintenanceService.updateMaintenanceRequest()` |
| POST | `/api/maintenance/analyze-image` | Analyze maintenance image with AI | `maintenanceService.analyzeImage()` |

---

## 📄 Work Orders APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/work-orders` | Get all work orders | `maintenanceService.getWorkOrders()` |
| POST | `/api/work-orders` | Create work order | `maintenanceService.createWorkOrder()` |
| PATCH | `/api/work-orders/{id}/status` | Update work order status | `maintenanceService.updateWorkOrderStatus()` |

---

## 📁 File/Object Storage APIs

| Method | Endpoint | Description | Usage |
|--------|----------|-------------|-------|
| POST | `/api/objects/upload` | Get upload URL | Used in ProfileScreen, AssetInventoryListScreen |
| POST | `/api/objects/upload-direct` | Direct file upload | Used in FieldWidget, syncManager, AssetInventoryListScreen |
| POST | `/api/objects/set-acl` | Set object ACL/permissions | Used in AssetInventoryListScreen |

---

## 👤 User Documents APIs

| Method | Endpoint | Description | Service |
|--------|----------|-------------|---------|
| GET | `/api/user-documents` | Get user documents | `profileService.getUserDocuments()` |
| POST | `/api/user-documents` | Upload user document | `profileService.uploadDocument()` |
| DELETE | `/api/user-documents/{id}` | Delete user document | `profileService.deleteDocument()` |

---

## 📊 API Request Patterns

### Standard Request Functions
- `apiRequest(method, url, data, options)` - Returns raw Response
- `apiRequestJson<T>(method, url, data, options)` - Returns parsed JSON

### Request Features
- **Timeout**: 10 seconds default, 2 minutes for AI endpoints
- **Credentials**: Always includes cookies (`credentials: "include"`)
- **Cache Control**: No-cache headers for all requests
- **Error Handling**: Automatic JSON error parsing with helpful messages
- **Network Detection**: Checks network status before requests

### Offline Support
- All API calls are wrapped with offline detection
- Failed requests are queued in `sync_queue` table
- Automatic retry when connection is restored
- Local database caching for offline access

---

## 🔄 Sync Manager APIs

The sync manager uses the following APIs to sync offline data:
- `/api/inspection-entries` (POST) - Sync new entries
- `/api/inspection-entries/{id}` (PATCH) - Sync updated entries
- `/api/objects/upload-direct` (POST) - Sync photos
- `/api/inspections/{id}/status` (PATCH) - Sync status changes

---

## 📝 Notes

1. **Base URL**: All endpoints are relative to the configured `API_URL`
2. **Authentication**: Uses session cookies (credentials: "include")
3. **Error Handling**: All endpoints return JSON error responses
4. **Offline Mode**: Failed requests are queued and synced when online
5. **Photo URLs**: Photo URLs are normalized to use `API_URL` for mobile compatibility

---

## 🗂️ Service Files Location

All API service files are located in: `mobile/src/services/`
- `api.ts` - Core API request functions
- `auth.ts` - Authentication services
- `inspections.ts` - Inspection services
- `assets.ts` - Asset inventory services
- `properties.ts` - Properties & blocks services
- `maintenance.ts` - Maintenance services
- `profile.ts` - User profile services
- `syncManager.ts` - Offline sync management


# API URL Migration - Environment Variable Only

## Summary

All hardcoded API URLs have been removed from the mobile application. The app now **only** uses `EXPO_PUBLIC_API_URL` from the `.env` file.

## Changes Made

### 1. `mobile/src/services/api.ts`
- **Removed**: All hardcoded fallback URLs (`https://portal.inspect360.ai`, `http://localhost:5005`)
- **Updated**: `getBaseUrl()` now only uses `EXPO_PUBLIC_API_URL` from environment
- **Behavior**: Throws an error if `EXPO_PUBLIC_API_URL` is not set (no silent fallbacks)

### 2. `mobile/app.config.js`
- **Removed**: Hardcoded fallback `"https://portal.inspect360.ai"`
- **Updated**: `apiUrl` now only reads from `process.env.EXPO_PUBLIC_API_URL`

### 3. `mobile/src/screens/inspections/InspectionCaptureScreen.tsx`
- **Removed**: Local `API_URL` definition with hardcoded fallback
- **Updated**: Now imports `API_URL` from centralized `services/api.ts`

## Files Using Centralized API_URL

All these files import `API_URL` from `services/api.ts` (which reads from .env):

- ✅ `mobile/src/contexts/AuthContext.tsx`
- ✅ `mobile/src/screens/profile/ProfileScreen.tsx`
- ✅ `mobile/src/screens/inspections/InspectionCaptureScreen.tsx`
- ✅ `mobile/src/screens/inspections/InspectionReviewScreen.tsx`
- ✅ `mobile/src/screens/inspections/InspectionReportScreen.tsx`
- ✅ `mobile/src/screens/assets/AssetInventoryListScreen.tsx`
- ✅ `mobile/src/screens/maintenance/CreateMaintenanceScreen.tsx`
- ✅ `mobile/src/components/inspections/FieldWidget.tsx`
- ✅ `mobile/src/components/AppHeader.tsx`
- ✅ `mobile/src/services/syncManager.ts`

## Required Setup

### Create `.env` file in `mobile/` directory:

```env
EXPO_PUBLIC_API_URL=https://portal.inspect360.ai
```

### For Local Development:

```env
EXPO_PUBLIC_API_URL=http://localhost:5005
```

## Error Handling

If `EXPO_PUBLIC_API_URL` is not set, the app will throw a clear error message:

```
EXPO_PUBLIC_API_URL is not set. Please create a .env file in the mobile directory with:
EXPO_PUBLIC_API_URL=https://portal.inspect360.ai

For local development, use:
EXPO_PUBLIC_API_URL=http://localhost:5005
```

## Verification

After setting up `.env`, you should see in console:
```
[API] Using API URL from environment: https://portal.inspect360.ai
[API] Initialized with API_URL: https://portal.inspect360.ai
```

## Benefits

1. **Single source of truth**: All API URLs come from `.env` file
2. **No hardcoded URLs**: Easy to change API URL without code changes
3. **Environment-specific**: Different URLs for dev/staging/production
4. **Clear errors**: App fails fast with helpful error if not configured
5. **Centralized**: All files use the same `API_URL` from `services/api.ts`


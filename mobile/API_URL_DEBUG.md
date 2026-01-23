# API URL Configuration Debug Guide

## Problem
When building an APK, the app might be using `localhost` instead of the production URL `https://portal.inspect360.ai`.

## Solution Applied

### 1. Fixed API URL Detection Logic
The `getBaseUrl()` function in `mobile/src/services/api.ts` now:
- **Detects production builds** using `Constants.executionEnvironment`
- **Prioritizes production URL** in standalone/store builds
- **Only uses localhost** in development mode (Expo Go)

### 2. Added Comprehensive Logging
All API requests now log:
- Which API URL is being used
- Request details (method, URL, data)
- Response status codes
- Error messages with full context

### 3. Fixed AuthContext
- Now uses `API_URL` from `api.ts` instead of hardcoded URLs
- Consistent URL usage across the app

## How to Verify

### Check Logs in Production APK
1. Open the app on your device
2. Check the console/logcat for these log messages:
   ```
   [API] Initialized with API_URL: https://portal.inspect360.ai
   [API] Using app.config.js apiUrl: https://portal.inspect360.ai
   ```

### Test Login
1. Try to login with valid credentials
2. Check logs for:
   ```
   [LoginScreen] Attempting login for: user@example.com
   [API] POST https://portal.inspect360.ai/api/login (with data)
   [API] Response status: 200 for POST https://portal.inspect360.ai/api/login
   ```

### If Still Using Localhost
If you see `localhost` in the logs:
1. Check `app.config.js` - ensure `apiUrl` is set to `https://portal.inspect360.ai`
2. Rebuild the APK (configuration changes require rebuild)
3. Clear app data and reinstall

## API URL Priority (Production Builds)

1. **EXPO_PUBLIC_API_URL** environment variable (if set and not localhost)
2. **app.config.js extra.apiUrl** (default: `https://portal.inspect360.ai`)
3. **Hardcoded fallback**: `https://portal.inspect360.ai`

## API URL Priority (Development)

1. **hostUri** from Expo (for Expo Go on physical devices)
2. **EXPO_PUBLIC_API_URL** environment variable
3. **app.config.js extra.apiUrl**
4. **Hardcoded fallback**: `https://portal.inspect360.ai`

## Testing

### Test Production URL
```bash
# In production APK, check logs for:
[API] Initialized with API_URL: https://portal.inspect360.ai
```

### Test Login Request
```bash
# Should see:
[API] POST https://portal.inspect360.ai/api/login (with data)
[API] Response status: 200 for POST https://portal.inspect360.ai/api/login
```

## Common Issues

### Issue: Still using localhost
**Solution**: 
- Rebuild the APK (configuration is baked in at build time)
- Ensure `app.config.js` has the correct default URL

### Issue: Network errors
**Solution**:
- Check device internet connection
- Verify SSL certificate is valid
- Check if `https://portal.inspect360.ai` is accessible from device

### Issue: Login not working
**Solution**:
- Check logs for actual API URL being used
- Verify credentials are correct
- Check if user has `role: "clerk"`


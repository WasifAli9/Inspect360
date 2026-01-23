# Login Issue Debug Guide

## Problem
When clicking "Sign in" in the APK:
1. Screen goes black for 1 second
2. Returns to login screen
3. No error message displayed

## Root Causes Identified

### 1. Black Screen Issue
- **Problem**: `AppNavigator` returns `null` when `isLoading` is true
- **Fix**: Show login screen during loading instead of null

### 2. Silent Failures
- **Problem**: Errors might be caught but not displayed properly
- **Fix**: Added comprehensive logging and better error messages

### 3. Race Conditions
- **Problem**: `checkStoredSession` might run after login and clear user
- **Fix**: Only check stored session if user is not already set

## Changes Made

### 1. AppNavigator.tsx
- Show login screen during loading instead of `null`
- Added logging for authentication state changes

### 2. AuthContext.tsx
- Prevent race condition in `checkStoredSession`
- Added comprehensive logging throughout auth flow
- Better error handling in session verification

### 3. LoginScreen.tsx
- Improved error messages for different error types
- Better logging for debugging

## How to Debug

### Check Logs
After rebuilding the APK, check logs for:

1. **API URL Initialization**:
   ```
   [API] Initialized with API_URL: https://portal.inspect360.ai
   ```

2. **Login Attempt**:
   ```
   [LoginScreen] Attempting login for: user@example.com
   [AuthContext] Starting login mutation for: user@example.com
   [API] POST https://portal.inspect360.ai/api/login (with data)
   ```

3. **Login Success**:
   ```
   [API] Response status: 200 for POST https://portal.inspect360.ai/api/login
   [AuthContext] Login response received, user role: clerk
   [AuthContext] Login mutation successful
   [AuthContext] Login success, setting user: user@example.com
   [AuthContext] User state set, isAuthenticated should now be: true
   [AppNavigator] Render - isAuthenticated: true user: user@example.com
   ```

4. **Login Failure**:
   ```
   [API] Response status: 401 for POST https://portal.inspect360.ai/api/login
   [AuthContext] Login mutation error: ...
   [LoginScreen] Login error: Invalid email or password
   ```

### Common Issues

#### Issue: Still seeing black screen
**Check**:
- Is `isLoading` stuck as `true`?
- Check logs for `[AppNavigator] Render` messages

#### Issue: Login succeeds but returns to login
**Check**:
- Is `isAuthenticated` becoming `true`?
- Check logs for `[AuthContext] User state set`
- Verify user has `role: "clerk"`

#### Issue: Network errors
**Check**:
- Is API_URL correct? Should be `https://portal.inspect360.ai`
- Check logs for `[API] Cannot connect to backend server`
- Verify device has internet connection

#### Issue: SSL errors
**Check**:
- Is SSL certificate valid?
- Check logs for SSL-related errors

## Testing Steps

1. **Rebuild APK** with these changes
2. **Open app** and check logs for API URL initialization
3. **Enter credentials** and click "Sign in"
4. **Check logs** for:
   - Login request being sent
   - Response status code
   - User state updates
   - Navigation state changes
5. **If login fails**, check error message in logs

## Expected Behavior

1. User enters email and password
2. Clicks "Sign in"
3. Loading indicator shows (button disabled)
4. Login request sent to `https://portal.inspect360.ai/api/login`
5. On success:
   - User state updated
   - `isAuthenticated` becomes `true`
   - Navigation automatically switches to Main tabs
6. On failure:
   - Error message displayed in red box
   - User can try again

## Next Steps if Still Not Working

1. **Check actual API URL** being used in logs
2. **Verify credentials** are correct
3. **Test API endpoint** directly with curl/Postman
4. **Check backend logs** for incoming requests
5. **Verify user role** is "clerk" in database


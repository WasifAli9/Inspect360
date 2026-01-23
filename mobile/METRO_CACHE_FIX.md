# Fixing "property is not configurable" Error

## Problem
The error occurs when Metro bundler tries to configure module exports that are already defined as non-configurable.

## Solution Applied
1. Removed `export let API_URL` - this was causing the error
2. Only export `getAPI_URL()` as a const function
3. Removed duplicate export statement at the end

## Steps to Fix

1. **Clear all caches:**
   ```powershell
   cd mobile
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
   ```

2. **Restart Expo with cleared cache:**
   ```powershell
   npx expo start --clear
   ```

3. **If error persists, try:**
   ```powershell
   # Uninstall and reinstall node_modules
   Remove-Item -Recurse -Force node_modules
   npm install
   npx expo start --clear
   ```

4. **On your device/emulator:**
   - Shake device → "Reload"
   - Or close and reopen the app

## Current API URL Implementation

The `api.ts` file now only exports:
- `getAPI_URL()` - Function that returns the current API URL
- All other exports are functions, not variables

This avoids any property configuration conflicts with Metro bundler.


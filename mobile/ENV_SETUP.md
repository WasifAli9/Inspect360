# Environment Configuration

## Required: API URL Configuration

The mobile app requires `EXPO_PUBLIC_API_URL` to be set in your environment. There are **no hardcoded fallback URLs** - you must configure this.

## Setup Instructions

### Option 1: Create .env file (Recommended)

1. Create a `.env` file in the `mobile` directory:
   ```
   EXPO_PUBLIC_API_URL=https://portal.inspect360.ai
   ```

2. For local development:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:5005
   ```

### Option 2: Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:EXPO_PUBLIC_API_URL="https://portal.inspect360.ai"
```

**Windows (CMD):**
```cmd
set EXPO_PUBLIC_API_URL=https://portal.inspect360.ai
```

**macOS/Linux:**
```bash
export EXPO_PUBLIC_API_URL=https://portal.inspect360.ai
```

### Option 3: app.config.js (Fallback)

The `app.config.js` file will also read from `process.env.EXPO_PUBLIC_API_URL`, so setting the environment variable will work there too.

## Important Notes

- **No hardcoded URLs**: The app will throw an error if `EXPO_PUBLIC_API_URL` is not set
- **Production**: Use `https://portal.inspect360.ai`
- **Development**: Use `http://localhost:5005` or your local server URL
- **Restart required**: After changing `.env`, restart the Expo development server

## Verification

After setting the environment variable, you should see in the console:
```
[API] Using API URL from environment: https://portal.inspect360.ai
```

If you see an error about `EXPO_PUBLIC_API_URL` not being set, create the `.env` file as described above.


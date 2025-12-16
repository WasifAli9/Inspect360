# ============================================================
# Inspect360 - Production Build Script for Windows
# ============================================================
# Run this script on your build server or development machine
# to create a deployment package for IIS
# ============================================================

param(
    [string]$OutputPath = ".\dist-package",
    [switch]$IncludeNodeModules = $false
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Inspect360 - Production Build Script" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "[1/7] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "  ERROR: package.json not found. Run this script from the project root." -ForegroundColor Red
    exit 1
}

# Clean previous build
Write-Host "[2/7] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "  Removed dist folder" -ForegroundColor Green
}
if (Test-Path $OutputPath) {
    Remove-Item -Recurse -Force $OutputPath
    Write-Host "  Removed previous package folder" -ForegroundColor Green
}

# Install dependencies
Write-Host "[3/7] Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm ci failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed" -ForegroundColor Green

# Build the application
Write-Host "[4/7] Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Build completed" -ForegroundColor Green

# Create output directory
Write-Host "[5/7] Creating deployment package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputPath\logs" -Force | Out-Null

# Copy required files
Copy-Item -Recurse "dist" "$OutputPath\dist"
Copy-Item "package.json" "$OutputPath\"
Copy-Item "package-lock.json" "$OutputPath\"
Copy-Item "deployment\web.config" "$OutputPath\"
Copy-Item "deployment\.env.production.template" "$OutputPath\"
Copy-Item "deployment\MIGRATION_NOTES.md" "$OutputPath\"
Copy-Item "deployment\STRIPE_SETUP.md" "$OutputPath\"
Copy-Item "database_schema.sql" "$OutputPath\"

Write-Host "  Core files copied" -ForegroundColor Green

# Optionally include node_modules
if ($IncludeNodeModules) {
    Write-Host "[6/7] Installing production dependencies..." -ForegroundColor Yellow
    Push-Location $OutputPath
    npm ci --production
    Pop-Location
    Write-Host "  Production dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[6/7] Skipping node_modules (run 'npm ci --production' on server)" -ForegroundColor Yellow
}

# Create archive
Write-Host "[7/7] Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = "inspect360-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Compress-Archive -Path "$OutputPath\*" -DestinationPath $zipPath
Write-Host "  Created: $zipPath" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment package: $zipPath" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy $zipPath to your Windows server" -ForegroundColor White
Write-Host "  2. Extract to C:\inetpub\wwwroot\inspect360" -ForegroundColor White
Write-Host "  3. Run 'npm ci --production' in the folder" -ForegroundColor White
Write-Host "  4. Configure environment variables" -ForegroundColor White
Write-Host "  5. Set up IIS site (see MIGRATION_NOTES.md)" -ForegroundColor White
Write-Host ""

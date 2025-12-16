#!/bin/bash
# ============================================================
# Inspect360 - Production Build Script for Linux/Mac
# ============================================================
# Run this script on your build server or development machine
# to create a deployment package for IIS
# ============================================================

set -e

OUTPUT_PATH="./dist-package"
INCLUDE_NODE_MODULES=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --include-node-modules)
            INCLUDE_NODE_MODULES=true
            shift
            ;;
        --output)
            OUTPUT_PATH="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "============================================================"
echo "  Inspect360 - Production Build Script"
echo "============================================================"
echo ""

# Check Node.js version
echo "[1/7] Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "  Node.js version: $NODE_VERSION"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "  ERROR: package.json not found. Run this script from the project root."
    exit 1
fi

# Clean previous build
echo "[2/7] Cleaning previous build..."
rm -rf dist
rm -rf "$OUTPUT_PATH"
echo "  Cleaned previous builds"

# Install dependencies
echo "[3/7] Installing dependencies..."
npm ci
echo "  Dependencies installed"

# Build the application
echo "[4/7] Building application..."
npm run build
echo "  Build completed"

# Create output directory
echo "[5/7] Creating deployment package..."
mkdir -p "$OUTPUT_PATH/logs"

# Copy required files
cp -r dist "$OUTPUT_PATH/"
cp package.json "$OUTPUT_PATH/"
cp package-lock.json "$OUTPUT_PATH/"
cp deployment/web.config "$OUTPUT_PATH/"
cp deployment/.env.production.template "$OUTPUT_PATH/"
cp deployment/MIGRATION_NOTES.md "$OUTPUT_PATH/"
cp deployment/STRIPE_SETUP.md "$OUTPUT_PATH/"
cp database_schema.sql "$OUTPUT_PATH/"

echo "  Core files copied"

# Optionally include node_modules
if [ "$INCLUDE_NODE_MODULES" = true ]; then
    echo "[6/7] Installing production dependencies..."
    cd "$OUTPUT_PATH"
    npm ci --production
    cd ..
    echo "  Production dependencies installed"
else
    echo "[6/7] Skipping node_modules (run 'npm ci --production' on server)"
fi

# Create archive
echo "[7/7] Creating ZIP archive..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="inspect360-deployment-$TIMESTAMP.zip"
cd "$OUTPUT_PATH"
zip -r "../$ZIP_NAME" .
cd ..
echo "  Created: $ZIP_NAME"

echo ""
echo "============================================================"
echo "  Build Complete!"
echo "============================================================"
echo ""
echo "Deployment package: $ZIP_NAME"
echo ""
echo "Next steps:"
echo "  1. Copy $ZIP_NAME to your Windows server"
echo "  2. Extract to C:\\inetpub\\wwwroot\\inspect360"
echo "  3. Run 'npm ci --production' in the folder"
echo "  4. Configure environment variables"
echo "  5. Set up IIS site (see MIGRATION_NOTES.md)"
echo ""

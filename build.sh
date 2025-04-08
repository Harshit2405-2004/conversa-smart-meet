#!/bin/bash

# Exit on error
set -e

echo "🚀 Building MeetAssist Extension..."

# Create a build directory
echo "📁 Creating build directory..."
rm -rf build
mkdir -p build

# Build the React app
echo "🔨 Building React app..."
npm run build

# Copy necessary files to the build directory
echo "📋 Copying extension files..."
cp -r public/* build/
cp -r dist/* build/

# Create the injected directory if it doesn't exist
mkdir -p build/injected

# Replace placeholder values in manifest.json
echo "🔧 Updating manifest.json..."
# Note: Replace ${GOOGLE_OAUTH_CLIENT_ID} with your actual client ID or leave as is for manual replacement
# sed -i 's/\${GOOGLE_OAUTH_CLIENT_ID}/YOUR_CLIENT_ID/g' build/manifest.json

# Create a ZIP file for Chrome Web Store submission
echo "📦 Creating ZIP file for Chrome Web Store..."
cd build
zip -r ../meetassist-extension.zip *
cd ..

echo "✅ Build complete! Extension package created: meetassist-extension.zip"
echo "📝 Instructions:"
echo "1. Upload meetassist-extension.zip to the Chrome Web Store"
echo "2. Make sure to replace the OAuth client ID in manifest.json if needed"
echo "3. Test the extension thoroughly before publishing" 
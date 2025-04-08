@echo off
echo 🚀 Building MeetAssist Extension...

echo 📁 Creating build directory...
if exist build rmdir /s /q build
mkdir build

echo 🔨 Building React app...
call npm run build

echo 📋 Copying extension files...
xcopy /E /I /Y public\* build\
xcopy /E /I /Y dist\* build\

echo 📁 Creating injected directory...
if not exist build\injected mkdir build\injected

echo 🔧 Updating manifest.json...
REM Note: Replace ${GOOGLE_OAUTH_CLIENT_ID} with your actual client ID or leave as is for manual replacement
REM powershell -Command "(Get-Content build\manifest.json) -replace '\${GOOGLE_OAUTH_CLIENT_ID}', 'YOUR_CLIENT_ID' | Set-Content build\manifest.json"

echo 📦 Creating ZIP file for Chrome Web Store...
powershell Compress-Archive -Path build\* -DestinationPath meetassist-extension.zip -Force

echo ✅ Build complete! Extension package created: meetassist-extension.zip
echo 📝 Instructions:
echo 1. Upload meetassist-extension.zip to the Chrome Web Store
echo 2. Make sure to replace the OAuth client ID in manifest.json if needed
echo 3. Test the extension thoroughly before publishing 
# MeetAssist Extension Build Guide

This guide explains how to build the MeetAssist extension for submission to the Chrome Web Store.

## Prerequisites

- Node.js and npm installed
- Git (optional, for version control)

## Build Process

### For Windows Users

1. Open Command Prompt or PowerShell
2. Navigate to the project directory
3. Run the build script:
   ```
   build.bat
   ```
4. The script will create a `meetassist-extension.zip` file in the root directory

### For macOS/Linux Users

1. Open Terminal
2. Navigate to the project directory
3. Make the build script executable:
   ```
   chmod +x build.sh
   ```
4. Run the build script:
   ```
   ./build.sh
   ```
5. The script will create a `meetassist-extension.zip` file in the root directory

## What the Build Script Does

1. Creates a clean build directory
2. Builds the React application
3. Copies all necessary files from the `public` and `dist` directories
4. Creates the `injected` directory for web accessible resources
5. Creates a ZIP file for Chrome Web Store submission

## Chrome Web Store Submission

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item" and upload the `meetassist-extension.zip` file
3. Fill in the required information:
   - Detailed description
   - Screenshots
   - Promotional images
   - Privacy policy URL
4. Submit for review

## Important Notes

- Make sure to replace the OAuth client ID in `manifest.json` with your actual client ID before submitting
- Test the extension thoroughly in Chrome before submission
- The review process may take several days

## Troubleshooting

If you encounter any issues during the build process:

1. Make sure all dependencies are installed:
   ```
   npm install
   ```
2. Check for any error messages in the console
3. Verify that the `public` directory contains all necessary files
4. Ensure the build script has execute permissions (for macOS/Linux) 
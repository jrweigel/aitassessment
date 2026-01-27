@echo off
REM Azure Static Web App Deployment Script for Windows
REM Run this from your project root directory

echo 🚀 Starting Azure Static Web App deployment...

REM Check if SWA CLI is installed
where swa >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing Azure Static Web Apps CLI...
    npm install -g @azure/static-web-apps-cli
)

REM Install API dependencies
echo 📦 Installing API dependencies...
cd api
npm install
cd ..

echo 🔧 Building and deploying...
npx swa deploy --env production

echo ✅ Deployment complete!
echo.
echo 📋 Next steps:
echo 1. Set up Azure Storage Account
echo 2. Configure AZURE_STORAGE_CONNECTION_STRING in your Static Web App settings
echo 3. Test the deployment
echo.
echo 📖 See API-DEPLOYMENT-GUIDE.md for detailed instructions

pause
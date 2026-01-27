#!/bin/bash
# Azure Static Web App Deployment Script
# Run this from your project root directory

echo "🚀 Starting Azure Static Web App deployment..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if SWA CLI is installed
if ! command -v swa &> /dev/null; then
    echo "📦 Installing Azure Static Web Apps CLI..."
    npm install -g @azure/static-web-apps-cli
fi

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install
cd ..

echo "🔧 Building and deploying..."
npx swa deploy --env production

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up Azure Storage Account"
echo "2. Configure AZURE_STORAGE_CONNECTION_STRING in your Static Web App settings"
echo "3. Test the deployment"
echo ""
echo "📖 See API-DEPLOYMENT-GUIDE.md for detailed instructions"
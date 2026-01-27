# Azure Static Web App with API - Deployment Guide

## Overview
This solution adds persistent data storage to your AI Assessment Tool using:
- **Azure Static Web Apps** (frontend hosting)
- **Azure Functions** (API backend) 
- **Azure Table Storage** (data persistence)

## What This Fixes
- ✅ Data is now shared across all users
- ✅ Admin view shows all assessment submissions
- ✅ Dashboard displays organization-wide data
- ✅ Data persists between sessions and devices
- ✅ Fallback to localStorage if API is unavailable

## Deployment Steps

### 1. Deploy to Azure Static Web Apps

```bash
# Install Azure Static Web Apps CLI if not already installed
npm install -g @azure/static-web-apps-cli

# Deploy from your project root
npx swa deploy --env production
```

### 2. Set up Azure Storage Account

1. In Azure Portal, create a new Storage Account:
   - Resource group: Same as your Static Web App
   - Storage account name: `aitassessmentdata` (or any unique name)
   - Region: Same as your Static Web App
   - Performance: Standard
   - Redundancy: LRS (Locally Redundant Storage)

2. Get the connection string:
   - Go to Storage Account → Access keys
   - Copy the "Connection string" from key1

### 3. Configure Environment Variables

1. In Azure Portal, go to your Static Web App
2. Navigate to Configuration
3. Add new application setting:
   - Name: `AZURE_STORAGE_CONNECTION_STRING`
   - Value: [Paste your storage account connection string]
4. Save the configuration

### 4. Verify Deployment

1. Visit your Static Web App URL
2. Complete a test assessment
3. Check the admin panel to see if data appears
4. Have another person complete an assessment to verify data sharing

## Local Development

### Prerequisites
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Install dependencies in the api folder
cd api
npm install
```

### Running Locally
```bash
# Terminal 1: Start the API
cd api
func start --cors "*"

# Terminal 2: Start the Static Web App
npx swa start . --api-location api
```

### Local Configuration
Update `api/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "your-connection-string-here"
  },
  "Host": {
    "CORS": "*"
  }
}
```

## Data Structure

### Azure Table Storage
- **Table Name**: `aitassessments`
- **Partition Key**: AX&E Team (e.g., "CXS", "DevRel")
- **Row Key**: Session ID (unique assessment identifier)

### Assessment Entity Fields
- `managerName`: Team manager name
- `axeTeam`: AX&E organization 
- `assessedStage`: Final stage selected by team (1-5)
- `suggestedStage`: Algorithm-suggested stage (1-5)
- `scores`: JSON array of individual question scores
- `timestamp`: ISO datetime string
- `assessmentDate`: Formatted date string
- `assessmentTime`: Formatted time string
- `sessionId`: Unique session identifier
- `assessmentFinalized`: Boolean completion status

## Troubleshooting

### Data Not Appearing
1. Check browser console for API errors
2. Verify Azure Storage connection string is set
3. Ensure Static Web App configuration is deployed
4. Check that Azure Functions are running (Monitor tab)

### CORS Issues
- Ensure `staticwebapp.config.json` has CORS headers
- Check that API functions include CORS headers
- Verify local development settings

### Permission Issues
- Ensure Storage Account allows Function access
- Check that connection string has read/write permissions
- Verify network access rules aren't blocking Functions

## API Endpoints

- `POST /api/submit-assessment` - Save new assessment
- `GET /api/get-assessments?admin=true` - Get all assessments (admin)
- `GET /api/get-assessments?admin=false` - Get anonymized assessments
- `DELETE /api/delete-assessment?sessionId=X&partitionKey=Y` - Delete assessment

## Next Steps

1. **Authentication**: Add Azure AD authentication for admin routes
2. **Analytics**: Export data to Power BI or Excel for deeper analysis
3. **Notifications**: Set up email alerts for new assessments
4. **Monitoring**: Add Application Insights for API monitoring
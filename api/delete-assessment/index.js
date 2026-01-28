const { TableClient } = require('@azure/data-tables');

module.exports = async function (context, req) {
    context.log(`Delete assessment function started for URL: ${req.url}`);

    // Set CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        context.res.body = '';
        return;
    }

    // Only allow DELETE
    if (req.method !== 'DELETE') {
        context.res.status = 405;
        context.res.body = JSON.stringify({ error: 'Method not allowed. Use DELETE.' });
        return;
    }

    try {
        // Debug logging for environment variables
        context.log('Available environment variables:', {
            hasAzureStorageConnection: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
            nodeEnv: process.env.NODE_ENV,
            functionName: context.executionContext?.functionName
        });

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            context.res.status = 503;
            context.res.body = JSON.stringify({ 
                error: 'Storage not configured'
            });
            return;
        }

        // Parse query parameters
        const url = new URL(`http://localhost${req.url}`);
        const sessionId = url.searchParams.get('sessionId');
        const partitionKey = url.searchParams.get('partitionKey'); // axeTeam

        if (!sessionId || !partitionKey) {
            context.res.status = 400;
            context.res.body = JSON.stringify({ 
                error: 'Missing required parameters: sessionId and partitionKey' 
            });
            return;
        }

        // Create table client and ensure table exists
        const tableClient = new TableClient(connectionString, 'aitassessments');
        
        try {
            await tableClient.createTable();
            context.log('Table created or already exists');
        } catch (tableError) {
            // Table might already exist, which is fine
            context.log('Table creation result:', tableError.message);
        }

        // Delete the entity
        await tableClient.deleteEntity(partitionKey, sessionId);

        context.log(`Deleted assessment: ${sessionId} from ${partitionKey}`);

        context.res.status = 200;
        context.res.body = JSON.stringify({
            success: true,
            message: 'Assessment deleted successfully'
        });

    } catch (error) {
        context.log('Error in delete-assessment:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to delete assessment',
            details: error.message
        });
    }
};
// Use Azure Data Tables SDK for reliable authentication
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

    try {
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

        // Create TableClient with connection string
        const client = TableClient.fromConnectionString(connectionString, 'aitassessments');
        
        context.log(`Deleting assessment: ${sessionId} from ${partitionKey}`);
        
        // Use Azure SDK to delete entity
        try {
            await client.deleteEntity(partitionKey, sessionId);
            context.log(`Successfully deleted assessment: ${sessionId} from ${partitionKey}`);
            
            context.res.status = 200;
            context.res.body = JSON.stringify({
                success: true,
                message: 'Assessment deleted successfully'
            });
        } catch (deleteError) {
            // If entity doesn't exist, consider it a success
            if (deleteError.statusCode === 404) {
                context.log(`Assessment ${sessionId} not found, considering delete successful`);
                context.res.status = 200;
                context.res.body = JSON.stringify({
                    success: true,
                    message: 'Assessment deleted (was not found)'
                });
            } else {
                throw deleteError;
            }
        }

    } catch (error) {
        context.log.error('Error in delete-assessment:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to delete assessment',
            details: error.message
        });
    }
};
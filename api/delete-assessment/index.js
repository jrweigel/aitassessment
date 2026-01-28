const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('delete-assessment', {
    methods: ['DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'delete-assessment',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        // Only allow DELETE
        if (request.method !== 'DELETE') {
            return {
                status: 405,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Method not allowed. Use DELETE.' })
            };
        }

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                return {
                    status: 503,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        error: 'Storage not configured'
                    })
                };
            }

            // Parse query parameters
            const url = new URL(request.url);
            const sessionId = url.searchParams.get('sessionId');
            const partitionKey = url.searchParams.get('partitionKey'); // axeTeam

            if (!sessionId || !partitionKey) {
                return {
                    status: 400,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        error: 'Missing required parameters: sessionId and partitionKey' 
                    })
                };
            }

            // Create table client
            const tableClient = new TableClient(connectionString, 'aitassessments');

            // Delete the entity
            await tableClient.deleteEntity(partitionKey, sessionId);

            context.log(`Deleted assessment: ${sessionId} from ${partitionKey}`);

            return {
                status: 200,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Assessment deleted successfully'
                })
            };

        } catch (error) {
            context.log('Error in delete-assessment:', error);
            return {
                status: 500,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Failed to delete assessment',
                    details: error.message
                })
            };
        }
    }
});
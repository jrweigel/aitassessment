const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('submit-assessment', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'submit-assessment',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        // Only allow POST
        if (request.method !== 'POST') {
            return {
                status: 405,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
            };
        }

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                context.log('Azure Storage connection string not configured');
                return {
                    status: 503,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        error: 'Storage not configured. Data will be saved locally.',
                        code: 'STORAGE_NOT_CONFIGURED'
                    })
                };
            }

            // Parse request body
            let assessmentData;
            try {
                const bodyText = await request.text();
                context.log('Raw request body:', bodyText);
                assessmentData = JSON.parse(bodyText);
                context.log('Parsed assessment data:', assessmentData);
            } catch (parseError) {
                context.log('Error parsing request body:', parseError);
                return {
                    status: 400,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                };
            }

            // Validate required fields
            if (!assessmentData.managerName || !assessmentData.axeTeam || !assessmentData.sessionId) {
                return {
                    status: 400,
                    headers: { 
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ error: 'Missing required fields: managerName, axeTeam, sessionId' })
                };
            }

            // Create table client
            const tableClient = new TableClient(connectionString, 'aitassessments');
            
            // Ensure table exists
            await tableClient.createTable();

            // Prepare entity for Azure Table Storage
            const entity = {
                partitionKey: assessmentData.axeTeam,
                rowKey: assessmentData.sessionId,
                managerName: assessmentData.managerName,
                axeTeam: assessmentData.axeTeam,
                assessedStage: assessmentData.assessedStage || null,
                suggestedStage: assessmentData.suggestedStage,
                scores: JSON.stringify(assessmentData.scores),
                timestamp: assessmentData.timestamp,
                assessmentDate: assessmentData.assessmentDate,
                assessmentTime: assessmentData.assessmentTime,
                sessionId: assessmentData.sessionId,
                assessmentFinalized: assessmentData.assessmentFinalized || false
            };

            context.log('Saving entity to table:', entity);

            // Insert or update entity
            await tableClient.upsertEntity(entity, 'Replace');

            return {
                status: 200,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Assessment saved successfully',
                    sessionId: assessmentData.sessionId
                })
            };

        } catch (error) {
            context.log('Error in submit-assessment:', error);
            return {
                status: 500,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Failed to save assessment data',
                    details: error.message
                })
            };
        }
    }
});
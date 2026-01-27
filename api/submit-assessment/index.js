const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('submit-assessment', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Submit assessment function started');

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

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }

            // Parse request body
            const assessmentData = await request.json();
            context.log('Received assessment data:', assessmentData);

            // Validate required fields
            if (!assessmentData.managerName || !assessmentData.axeTeam || !assessmentData.sessionId) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
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
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Failed to save assessment data',
                    details: error.message
                })
            };
        }
    }
});
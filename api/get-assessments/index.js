const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('get-assessments', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Get assessments function started');

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('Azure Storage connection string not configured');
            }

            // Parse query parameters
            const url = new URL(request.url);
            const adminView = url.searchParams.get('admin') === 'true';
            const sessionId = url.searchParams.get('sessionId');

            // Create table client
            const tableClient = new TableClient(connectionString, 'aitassessments');

            let assessments = [];

            if (sessionId) {
                // Get specific assessment by sessionId
                const entities = tableClient.listEntities({
                    filter: `rowKey eq '${sessionId}'`
                });
                
                for await (const entity of entities) {
                    assessments.push(transformEntity(entity));
                }
            } else {
                // Get all assessments with 90-day filter
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                const filterDate = ninetyDaysAgo.toISOString();

                const entities = tableClient.listEntities({
                    filter: `timestamp ge datetime'${filterDate}'`
                });
                
                for await (const entity of entities) {
                    const transformedEntity = transformEntity(entity);
                    
                    // For non-admin view, only return anonymized data
                    if (!adminView) {
                        delete transformedEntity.managerName;
                    }
                    
                    assessments.push(transformedEntity);
                }
            }

            context.log(`Retrieved ${assessments.length} assessments`);

            return {
                status: 200,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    assessments: assessments,
                    count: assessments.length
                })
            };

        } catch (error) {
            context.log('Error in get-assessments:', error);
            return {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Failed to retrieve assessment data',
                    details: error.message
                })
            };
        }
    }
});

function transformEntity(entity) {
    return {
        managerName: entity.managerName,
        axeTeam: entity.axeTeam,
        assessedStage: entity.assessedStage,
        suggestedStage: entity.suggestedStage,
        scores: entity.scores ? JSON.parse(entity.scores) : [],
        timestamp: entity.timestamp,
        assessmentDate: entity.assessmentDate,
        assessmentTime: entity.assessmentTime,
        sessionId: entity.sessionId,
        assessmentFinalized: entity.assessmentFinalized
    };
}
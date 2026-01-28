const { TableClient } = require('@azure/data-tables');

module.exports = async function (context, req) {
    context.log(`Get assessments function started for URL: ${req.url}`);

    // Set CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Only allow GET
    if (req.method !== 'GET') {
        context.res.status = 405;
        context.res.body = JSON.stringify({ error: 'Method not allowed. Use GET.' });
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
            context.log('Azure Storage connection string not configured');
            context.res.status = 503;
            context.res.body = JSON.stringify({ 
                error: 'Storage not configured. Using local data only.',
                code: 'STORAGE_NOT_CONFIGURED',
                assessments: [],
                count: 0
            });
            return;
        }

        // Parse query parameters
        const url = new URL(`http://localhost${req.url}`);
        const adminView = url.searchParams.get('admin') === 'true';
        const sessionId = url.searchParams.get('sessionId');

        // Create table client and ensure table exists
        const tableClient = new TableClient(connectionString, 'aitassessments');
        
        try {
            await tableClient.createTable();
            context.log('Table created or already exists');
        } catch (tableError) {
            // Table might already exist, which is fine
            context.log('Table creation result:', tableError.message);
        }

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

        context.res.status = 200;
        context.res.body = JSON.stringify({
            success: true,
            assessments: assessments,
            count: assessments.length
        });

    } catch (error) {
        context.log('Error in get-assessments:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to retrieve assessment data',
            details: error.message
        });
    }
};

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
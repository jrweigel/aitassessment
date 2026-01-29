// Use Azure Data Tables SDK for reliable authentication
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

    try {
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

        // Check for connection string
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        context.log('Connection string exists:', !!connectionString);
        
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

        context.log('Retrieving from Azure Tables using SDK...');
        
        // Create TableClient
        const client = TableClient.fromConnectionString(connectionString, 'aitassessments');
        
        // Query assessments 
        let queryFilter = '';
        if (sessionId) {
            queryFilter = `RowKey eq '${sessionId}'`;
        }
        
        const assessments = [];
        const entities = client.listEntities({ queryOptions: { filter: queryFilter } });
        
        for await (const entity of entities) {
            // Transform entity back to our format
            const assessment = {
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
            assessments.push(assessment);
        }
        
        // Filter for recent assessments (90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const recentAssessments = assessments.filter(assessment => {
            const assessmentDate = new Date(assessment.timestamp);
            return assessmentDate >= ninetyDaysAgo;
        });
        
        // For non-admin view, remove sensitive data
        let finalAssessments = recentAssessments;
        if (!adminView) {
            finalAssessments = recentAssessments.map(assessment => {
                const { managerName, ...publicData } = assessment;
                return publicData;
            });
        }
        
        context.log(`Retrieved ${finalAssessments.length} assessments`);

        context.res.status = 200;
        context.res.body = JSON.stringify({
            success: true,
            assessments: finalAssessments,
            count: finalAssessments.length
        });

    } catch (error) {
        context.log.error('Error in get-assessments:', error);
        
        // If table doesn't exist, return empty results instead of error
        if (error.message && error.message.includes('TableNotFound')) {
            context.res.status = 200;
            context.res.body = JSON.stringify({
                success: true,
                assessments: [],
                count: 0,
                message: 'No assessments found - table will be created on first submission'
            });
        } else {
            context.res.status = 500;
            context.res.body = JSON.stringify({ 
                success: false, 
                error: 'Failed to retrieve assessment data',
                details: error.message
            });
        }
    }
};
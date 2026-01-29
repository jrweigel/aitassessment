const { TableClient } = require('@azure/data-tables');

module.exports = async function (context, req) {
    context.log(`Submit assessment function started for URL: ${req.url}`);

    // Set CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // Only allow POST
        if (req.method !== 'POST') {
            context.res.status = 405;
            context.res.body = JSON.stringify({ error: 'Method not allowed. Use POST.' });
            return;
        }

        // Debug logging for environment variables
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        context.log('Connection string exists:', !!connectionString);
        
        if (!connectionString) {
            context.log('Azure Storage connection string not configured');
            context.res.status = 503;
            context.res.body = JSON.stringify({ 
                error: 'Storage not configured. Data will be saved locally.',
                code: 'STORAGE_NOT_CONFIGURED'
            });
            return;
        }

        // Parse request body
        let assessmentData;
        try {
            assessmentData = req.body || JSON.parse(req.rawBody || '{}');
            context.log('Parsed assessment data:', assessmentData);
        } catch (parseError) {
            context.log('Error parsing request body:', parseError);
            context.res.status = 400;
            context.res.body = JSON.stringify({ error: 'Invalid JSON in request body' });
            return;
        }

        // Validate required fields
        if (!assessmentData.managerName || !assessmentData.axeTeam || !assessmentData.sessionId) {
            context.res.status = 400;
            context.res.body = JSON.stringify({ 
                error: 'Missing required fields: managerName, axeTeam, sessionId' 
            });
            return;
        }

        context.log('Creating table client...');
        
        // Create table client and ensure table exists
        const tableClient = new TableClient(connectionString, 'aitassessments');
        
        context.log('Creating table if not exists...');
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

        context.res.status = 200;
        context.res.body = JSON.stringify({ 
            success: true, 
            message: 'Assessment saved successfully',
            sessionId: assessmentData.sessionId
        });

    } catch (error) {
        context.log.error('Error in submit-assessment:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to save assessment data',
            details: error.message,
            stack: error.stack
        });
    }
};
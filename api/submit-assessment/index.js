// Use direct Azure Tables REST API instead of SDK
const crypto = require('crypto');
const https = require('https');

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

        // Parse connection string
        const connStringParts = {};
        connectionString.split(';').forEach(part => {
            const [key, value] = part.split('=', 2);
            if (key && value) {
                connStringParts[key] = value;
            }
        });

        const accountName = connStringParts.AccountName;
        const accountKey = connStringParts.AccountKey;
        
        if (!accountName || !accountKey) {
            throw new Error('Invalid connection string format');
        }

        context.log('Saving to Azure Tables using REST API...');
        
        // Prepare entity for Azure Table Storage
        const entity = {
            PartitionKey: assessmentData.axeTeam,
            RowKey: assessmentData.sessionId,
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

        // Save to Azure Table using fetch
        const result = await saveToAzureTable(accountName, accountKey, 'aitassessments', entity, context);
        
        if (result.success) {
            context.res.status = 200;
            context.res.body = JSON.stringify({ 
                success: true, 
                message: 'Assessment saved successfully to Azure Tables',
                sessionId: assessmentData.sessionId
            });
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        context.log.error('Error in submit-assessment:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to save assessment data',
            details: error.message
        });
    }
};

async function saveToAzureTable(accountName, accountKey, tableName, entity, context) {
    return new Promise((resolve, reject) => {
        try {
            const path = `/${tableName}`;
            const dateString = new Date().toUTCString();
            const bodyData = JSON.stringify(entity);
            
            // Create authorization signature
            const stringToSign = `POST\n\napplication/json\n${dateString}\n/${accountName}${path}`;
            const signature = crypto.createHmac('sha256', Buffer.from(accountKey, 'base64'))
                .update(stringToSign)
                .digest('base64');
            
            const authHeader = `SharedKey ${accountName}:${signature}`;
            
            const options = {
                hostname: `${accountName}.table.core.windows.net`,
                port: 443,
                path: path,
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json;odata=minimalmetadata',
                    'x-ms-date': dateString,
                    'x-ms-version': '2020-04-08',
                    'Content-Length': Buffer.byteLength(bodyData)
                }
            };
            
            context.log('Making HTTPS request to Azure Tables:', options.hostname + options.path);
            
            const req = https.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    context.log('Azure Tables response status:', res.statusCode);
                    
                    if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 409) {
                        // 409 = already exists, which is fine
                        resolve({ success: true });
                    } else {
                        context.log('Azure Tables error response:', body);
                        resolve({ success: false, error: `Azure Tables error: ${res.statusCode} - ${body}` });
                    }
                });
            });
            
            req.on('error', (error) => {
                context.log.error('HTTPS request error:', error);
                resolve({ success: false, error: error.message });
            });
            
            req.write(bodyData);
            req.end();

        } catch (error) {
            context.log.error('Error in saveToAzureTable:', error);
            resolve({ success: false, error: error.message });
        }
    });
}
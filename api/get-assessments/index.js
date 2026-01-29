// Use direct Azure Tables REST API instead of SDK
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

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

        // Debug logging for environment variables
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
        const reqUrl = new URL(`http://localhost${req.url}`);
        const adminView = reqUrl.searchParams.get('admin') === 'true';
        const sessionId = reqUrl.searchParams.get('sessionId');

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

        context.log('Retrieving from Azure Tables using REST API...');
        
        // Get assessments from Azure Table using fetch
        const result = await getFromAzureTable(accountName, accountKey, 'aitassessments', sessionId, context);
        
        if (result.success) {
            let assessments = result.data || [];
            
            // Filter for recent assessments (90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            assessments = assessments.filter(assessment => {
                const assessmentDate = new Date(assessment.timestamp);
                return assessmentDate >= ninetyDaysAgo;
            });
            
            // For non-admin view, remove sensitive data
            if (!adminView) {
                assessments = assessments.map(assessment => {
                    const { managerName, ...publicData } = assessment;
                    return publicData;
                });
            }
            
            context.log(`Retrieved ${assessments.length} assessments`);

            context.res.status = 200;
            context.res.body = JSON.stringify({
                success: true,
                assessments: assessments,
                count: assessments.length
            });
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        context.log.error('Error in get-assessments:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to retrieve assessment data',
            details: error.message
        });
    }
};

async function getFromAzureTable(accountName, accountKey, tableName, sessionId, context) {
    return new Promise((resolve, reject) => {
        try {
            let path = `/${tableName}`;
            
            // Add filter for specific sessionId if provided
            if (sessionId) {
                path += `?$filter=RowKey eq '${sessionId}'`;
            }
            
            const dateString = new Date().toUTCString();
            
            // Create authorization signature for GET (correct Azure Tables format)
            const stringToSign = `GET\n\n\n\n${dateString}\n/${accountName}${path}`;
            const signature = crypto.createHmac('sha256', Buffer.from(accountKey, 'base64'))
                .update(stringToSign)
                .digest('base64');
            
            const authHeader = `SharedKey ${accountName}:${signature}`;
            
            const options = {
                hostname: `${accountName}.table.core.windows.net`,
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json;odata=minimalmetadata', 
                    'x-ms-date': dateString,
                    'x-ms-version': '2020-04-08'
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
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const responseData = JSON.parse(body);
                            const assessments = responseData.value || [];
                            
                            // Transform entities back to our format
                            const transformedAssessments = assessments.map(entity => ({
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
                            }));
                            
                            resolve({ success: true, data: transformedAssessments });
                        } catch (parseError) {
                            context.log.error('Error parsing response:', parseError);
                            resolve({ success: false, error: 'Failed to parse response: ' + parseError.message });
                        }
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
            
            req.end();

        } catch (error) {
            context.log.error('Error in getFromAzureTable:', error);
            resolve({ success: false, error: error.message });
        }
    });
}
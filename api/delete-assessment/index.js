// Use direct Azure Tables REST API instead of SDK
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

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
        const reqUrl = new URL(`http://localhost${req.url}`);
        const sessionId = reqUrl.searchParams.get('sessionId');
        const partitionKey = reqUrl.searchParams.get('partitionKey'); // axeTeam

        if (!sessionId || !partitionKey) {
            context.res.status = 400;
            context.res.body = JSON.stringify({ 
                error: 'Missing required parameters: sessionId and partitionKey' 
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

        // Delete from Azure Table using direct REST API
        const result = await deleteFromAzureTable(accountName, accountKey, 'aitassessments', partitionKey, sessionId, context);
        
        if (result.success) {
            context.log(`Deleted assessment: ${sessionId} from ${partitionKey}`);
            context.res.status = 200;
            context.res.body = JSON.stringify({
                success: true,
                message: 'Assessment deleted successfully'
            });
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        context.log('Error in delete-assessment:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false, 
            error: 'Failed to delete assessment',
            details: error.message
        });
    }
};

async function deleteFromAzureTable(accountName, accountKey, tableName, partitionKey, rowKey, context) {
    return new Promise((resolve, reject) => {
        try {
            const path = `/${tableName}(PartitionKey='${partitionKey}',RowKey='${rowKey}')`;
            const dateString = new Date().toUTCString();
            
            // Create authorization signature for DELETE
            const stringToSign = `DELETE\n\n\n${dateString}\n/${accountName}${path}`;
            const signature = crypto.createHmac('sha256', Buffer.from(accountKey, 'base64'))
                .update(stringToSign)
                .digest('base64');
            
            const authHeader = `SharedKey ${accountName}:${signature}`;
            
            const options = {
                hostname: `${accountName}.table.core.windows.net`,
                port: 443,
                path: path,
                method: 'DELETE',
                headers: {
                    'Authorization': authHeader,
                    'x-ms-date': dateString,
                    'x-ms-version': '2020-04-08',
                    'If-Match': '*'
                }
            };
            
            context.log('Making HTTPS delete request to Azure Tables:', options.hostname + options.path);
            
            const req = https.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    context.log('Azure Tables delete response status:', res.statusCode);
                    
                    if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 404) {
                        // 404 = already deleted
                        resolve({ success: true });
                    } else {
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
            context.log.error('Error in deleteFromAzureTable:', error);
            resolve({ success: false, error: error.message });
        }
    });
}
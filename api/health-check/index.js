module.exports = async function (context, req) {
    context.log('Health check function started');

    try {
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

        // Simple health check without dependencies
        context.res.status = 200;
        context.res.body = JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'Basic health check working'
        });
    } catch (error) {
        context.log.error('Health check error:', error);
        context.res.status = 500;
        context.res.body = JSON.stringify({
            status: 'error',
            message: error.message
        });
    }
};
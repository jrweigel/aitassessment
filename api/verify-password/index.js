const crypto = require('crypto');

module.exports = async function (context, req) {
    context.log('Password verification function started');

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

        // Get the admin password from environment variables
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            context.log.error('ADMIN_PASSWORD environment variable not configured');
            context.res.status = 503;
            context.res.body = JSON.stringify({ 
                success: false,
                error: 'Admin authentication not configured'
            });
            return;
        }

        // Get password from request body
        const { password } = req.body || {};
        if (!password) {
            context.res.status = 400;
            context.res.body = JSON.stringify({ 
                success: false,
                error: 'Password required'
            });
            return;
        }

        // Verify password (simple comparison for now)
        const isValid = password === adminPassword;

        if (isValid) {
            // Generate a simple session token (timestamp + random)
            const sessionToken = Buffer.from(
                `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`
            ).toString('base64');

            context.res.status = 200;
            context.res.body = JSON.stringify({
                success: true,
                sessionToken: sessionToken,
                expiresIn: 30 * 60 * 1000 // 30 minutes in milliseconds
            });

            context.log('Admin password verified successfully');
        } else {
            context.res.status = 401;
            context.res.body = JSON.stringify({
                success: false,
                error: 'Invalid password'
            });

            context.log('Invalid admin password attempt');
        }

    } catch (error) {
        context.log.error('Error in verify-password:', error);
        
        context.res.status = 500;
        context.res.body = JSON.stringify({ 
            success: false,
            error: 'Internal server error'
        });
    }
};
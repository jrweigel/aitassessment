module.exports = async function (context, req) {
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: "Test API endpoint working",
            timestamp: new Date().toISOString()
        })
    };
};
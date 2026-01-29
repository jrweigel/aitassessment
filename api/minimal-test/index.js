module.exports = async function (context, req) {
    context.log('Minimal test function executed');
    
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'text/plain'
        },
        body: 'OK - Minimal Test Working'
    };
};
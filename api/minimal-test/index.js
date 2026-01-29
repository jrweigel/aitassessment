module.exports = function (context, req) {
    context.res = {
        body: "Hello World - Functions Enabled"
    };
    context.done();
};
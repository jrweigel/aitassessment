module.exports = function (context, req) {
    context.res = {
        body: "Hello World"
    };
    context.done();
};
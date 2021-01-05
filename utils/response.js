// Standard response for any requests (including errors)
function responseObj(message) {
    return { message: message };
}

function errorObj(message) {
    return { error: message };
}

module.exports = {
    responseObj,
    errorObj
}
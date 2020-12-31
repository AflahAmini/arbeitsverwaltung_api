// Standard response for any requests (including errors)
function responseObj(success, message) {
    return { success: success, message: message };
}

module.exports = {
    responseObj
}
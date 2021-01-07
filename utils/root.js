const path = require('path');

module.exports = ( () => {
    return path.dirname(require.main.filename || process.main.filename);
} )();
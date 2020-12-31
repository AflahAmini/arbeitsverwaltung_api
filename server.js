const dotenv = require('dotenv');
dotenv.config({
    path: './config/config.env'
});

process.on('uncaughtException', err => {
    console.log('Uncaught exception detected!');
    console.log(err.stack);
});

const app = require('./app');
const handleSockets = require('./routes/socketRoutes');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Listening from port ${port}`);
});

server.on('upgrade', handleSockets);

process.on('unhandledRejection', err => {
    console.log('Unhandled rejection detected!');
    console.log(err.stack);
});

module.exports = server;
const dotenv = require('dotenv');
const loadResult = dotenv.config({
    path: './config/config.env'
});

if (loadResult.error) {
    console.log('Cannot find the required config.env file! Shutting down...');
    process.exit(1);
}

process.on('uncaughtException', err => {
    console.log('Uncaught exception detected!');
    console.log(err.stack);
});

const app = require('./app');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Listening from port ${port}`);
});

process.on('unhandledRejection', err => {
    console.log('Unhandled rejection detected!');
    console.log(err.stack);
});

module.exports = server;
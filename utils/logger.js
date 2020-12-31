const winston = require('winston');
require('winston-daily-rotate-file');

const inTesting = process.env.NODE_ENV === 'test';

// Empty logger to map logger functions to nowhere so that 
// the console doesn't get bogged up.
const empty_logger = {
    info: () => { },
    error: () => { },
    debug: () => { },
    warn: () => { }
};

let db_logger = empty_logger;
let svr_logger = empty_logger;

if (!inTesting) {
    const format = winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} (${level}) : ${message}`;
    });
    
    const db_transport = new winston.transports.DailyRotateFile({
        filename: 'logs/db-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        frequency: '24h',
        maxFiles: '14d'
    });
    
    const svr_transport = new winston.transports.DailyRotateFile({
        filename: 'logs/server-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        frequency: '24h',
        maxFiles: '14d'
    });
    
    // Logger to store any SQL statements
    db_logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            format
        ),
        transports: [
            db_transport
        ]
    });
    
    // Logger to store general server logs
    svr_logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            format
        ),
        transports: [
            svr_transport
        ]
    });
}

module.exports = {
    db_logger,
    svr_logger
}
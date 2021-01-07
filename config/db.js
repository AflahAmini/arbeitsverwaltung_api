const Database = require('better-sqlite3');
const { db_logger } = require('../utils/logger');
const fs = require('fs');

const inTesting = process.env.NODE_ENV === 'test';
let DBSOURCE = ":memory:";

if (inTesting) {
    const dbPath = "./db/db.sqlite";
    if (!fs.existsSync(dbPath + '/..')) {
        fs.mkdirSync(dbPath + '/..');
    }

    DBSOURCE = dbPath;
}

if (inTesting)
    console.log("Database is in testing mode.");

const db = new Database(DBSOURCE, { verbose: db_logger.info });

try {
    db.prepare(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email text UNIQUE,
        password text,
        created_at text,
        CONSTRAINT email_unique UNIQUE (email)
        )`).run();

    db.prepare(`CREATE TABLE refresh (
        id INTEGER PRIMARY KEY,
        userId INTEGER,
        refreshToken text
        )`).run();

    db.prepare(`CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        userId INTEGER,
        weekYear text,
        dayOfWeek INTEGER,
        activeDuration INTEGER,
        inactiveDuration INTEGER
        )`).run();

    const insert = db.prepare('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)');
    insert.run("admin@example.com", "$2a$10$k8f8FpWlVW77MCJA23N6zew1uxZfiGifZLnejlMGcmMTWXdMxEGz6",
        (new Date()).toUTCString());
    
    console.log('DB initialization success!');

} catch (err) {
    // Clear all sessions upon initialization
    db.prepare('DELETE FROM refresh').run();
    console.log('Table already exists! Skipping db initialization');
}

module.exports = db;
const db = require('../config/db');

// Returns the user object with variableName equal the variable
function dbGetUserBy(variableName, variable) {
    return db.prepare(`SELECT * FROM users WHERE ${variableName} = ?`).get(variable);
}

// Returns the added user object with id (without password hash)
function dbAddUser(user) {
    const insert = db.prepare('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)');
    const info = insert.run(user.email, user.password, (new Date()).toUTCString());

    return { id: info.lastInsertRowid, email: user.email };
}

function dbAddToken(userId, token) {
    const insert = db.prepare('INSERT INTO refresh (userId, refreshToken) VALUES (?, ?)');
    insert.run(userId, token);
}

function dbGetTokenBy(variableName, variable) {
    return db.prepare(`SELECT * FROM refresh WHERE ${variableName} = ?`).get(variable);
}

function dbUpdateToken(oldToken, newToken) {
    const update = db.prepare(`UPDATE refresh SET refreshToken = ? WHERE refreshToken = ?`);
    update.run(newToken, oldToken);
}

function dbDeleteTokensById(userId) {
    db.prepare('DELETE FROM refresh WHERE userId = ?').run(userId);
}

module.exports = {
    dbAddUser,
    dbGetUserBy,
    dbGetTokenBy,
    dbAddToken,
    dbUpdateToken,
    dbDeleteTokensById
};
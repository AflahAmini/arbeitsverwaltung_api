const db = require('../config/db');

// Prepared SQL statements to make the database more efficient
const usersInsert = db.prepare('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)');

const refreshInsert = db.prepare('INSERT INTO refresh (userId, refreshToken) VALUES (?, ?)');
const refreshUpdate = db.prepare(`UPDATE refresh SET refreshToken = ? WHERE refreshToken = ?`);
const refreshDeleteByUserId = db.prepare('DELETE FROM refresh WHERE userId = ?');

const sessionsSelect = db.prepare(`SELECT * FROM sessions 
                                    WHERE userId = ? AND weekYear = ? AND dayOfWeek = ?`);
const sessionsInsert = db.prepare(`INSERT INTO sessions 
                                    (userId, weekYear, dayOfWeek, activeDuration, inactiveDuration)
                                    VALUES
                                    (?, ?, ?, ?, ?)`);
const sessionsUpdate = db.prepare(`UPDATE sessions SET activeDuration = ?, inactiveDuration = ? 
                                    WHERE userId = ? AND weekYear = ? AND dayOfWeek = ?`);

const usersTable = {
    // Gets a row from users by the specified variable
    get: (variableName, variable) => {
        return db.prepare(`SELECT * FROM users WHERE ${variableName} = ?`).get(variable);
    },
    // Adds a user to the users table
    add: (user) => {
        const info = usersInsert.run(user.email, user.password, (new Date()).toUTCString());

        return { id: info.lastInsertRowid, email: user.email };
    }
}

const refreshTable = {
    // Gets a row from refresh by the specified variable
    get: (variableName, variable) => {
        return db.prepare(`SELECT * FROM refresh WHERE ${variableName} = ?`).get(variable);
    },
    // Adds a row to the refresh table
    add: (userId, token) => {
        refreshInsert.run(userId, token);
    },
    // Updates the row containing the oldToken with the new one
    update: (oldToken, newToken) => {
        refreshUpdate.run(newToken, oldToken);
    },
    // Deletes the row/s in refresh with the specified userId
    deleteById: (userId) => {
        refreshDeleteByUserId.run(userId);
    }
}

const sessionsTable = {
    // If the session object does not exist, then add a new empty session
    // and return it, otherwise return the session entry
    getOrAddSession: (userId, weekYear, dayOfWeek) => {
        const session = sessionsSelect.get(userId, weekYear, dayOfWeek);

        if (session)
            return session;
        else {
            const insertResult = sessionsInsert.run(userId, weekYear, dayOfWeek, 0, 0);

            return db.prepare(`SELECT * FROM sessions WHERE id = ?`)
                    .get(insertResult.lastInsertRowid);
        }
    },

    // Just gets the session entry (undefined if it does not exist)
    getSession: (userId, weekYear, dayOfWeek) => {
        return sessionsSelect.get(userId, weekYear, dayOfWeek);
    },

    // Updates the session entry in the database
    updateSession: (userId, weekYear, dayOfWeek, activeDuration, inactiveDuration) => {
        sessionsUpdate.run(activeDuration, inactiveDuration, userId, weekYear, dayOfWeek);
    }
}

module.exports = {
    usersTable,
    refreshTable,
    sessionsTable
};
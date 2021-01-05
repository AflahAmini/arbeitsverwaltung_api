process.env.NODE_ENV = 'test';

const expect = require('chai').expect;

const db = require('../config/db');

describe('Database', () => {

    it('should contain the correct tables upon initialization', () => {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
        const doesUsersTableExist = tableCheck.all("users").length > 0;
        const doesRefreshTableExist = tableCheck.all("refresh").length > 0;
        const doesSessionsTableExist = tableCheck.all("sessions").length > 0;

        expect(doesUsersTableExist).to.be.true;
        expect(doesRefreshTableExist).to.be.true;
        expect(doesSessionsTableExist).to.be.true;
    });

    describe('should throw error for insertions of non-unique', () => {
        
        it('emails into the users table', () => {
            const insertUser = db.prepare("INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)");
            insertUser.run("nonunique@email.com", "123123123123", (new Date()).toUTCString());
            
            expect(() => {
                insertUser.run("nonunique@email.com", "134", "today");
            }).to.throw();
        });

    });

    after(() => {
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM refresh').run();
        db.prepare('DELETE FROM sessions').run();
    });
});
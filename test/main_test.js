process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const helper = require('./test_helper');

chai.should();
chai.use(chaiHttp);

describe('POST /api/register', () => {

    before(async () => {
        await helper.clearFilesTest();
    });

    it('should register with correct details, and login immediately', (done) => {
        const user = {
            email: "test3@example.com",
            password: "a testing password",
            passwordConfirmation: "a testing password"
        };
        chai.request(server)
            .post('/api/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(200);

                // Property checks
                res.body.should.have.property('message');
                res.body.should.have.property('id');
                res.body.should.have.property('accessToken');
                res.body.should.have.property('refreshToken');

                // Property value and type checks
                res.body.message.should.be.a('string');
                res.body.id.should.be.a('number');
                res.body.accessToken.should.be.a('string');
                res.body.accessToken.should.not.be.empty;
                res.body.refreshToken.should.be.a('string');
                res.body.refreshToken.should.not.be.empty;
                
                // There should exist a folder under filesTest
                helper.checkIfDirectoryExists(`filesTest/${res.body.id}`).should.be.true;

                done();
            });
    });

    it('should not register with incorrect details, and not login', (done) => {
        const user = {
            email: "test4@example.com",
            password: "another password",
            passwordConfirmation: "nother password"
        };
        chai.request(server)
            .post('/api/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(400);

                // Property checks
                res.body.should.have.property('error');
                res.body.should.not.have.property('accessToken');
                res.body.should.not.have.property('refreshToken');

                // Property value and type checks
                res.body.error.should.be.a('string');

                done();
            });
    });

});

describe('POST /api/login', () => {

    before((done) => {
        helper.registerHelper("logintest@example.com", "password", {}, done);
    });

    it('should login with correct credentials', (done) => {
        const creds = {
            email: "logintest@example.com",
            password: "password"
        }

        chai.request(server)
            .post('/api/login')
            .send(creds)
            .end((err, res) => {
                res.should.have.status(200);

                // Property checks
                res.body.should.have.property('message');
                res.body.should.have.property('accessToken');
                res.body.should.have.property('refreshToken');

                // Property value and type checks
                res.body.message.should.be.a('string');
                res.body.accessToken.should.be.a('string');
                res.body.accessToken.should.not.be.empty;
                res.body.refreshToken.should.be.a('string');
                res.body.refreshToken.should.not.be.empty;

                done();
            });
    });

    it("should not login with invalid credentials", (done) => {
        const creds = {
            email: "logintest@example.com",
            password: "passwrod"
        };

        chai.request(server)
            .post('/api/login')
            .send(creds)
            .end((err, res) => {
                res.should.have.status(401);

                // Property checks
                res.body.should.have.property('error');
                res.body.should.not.have.property('accessToken');
                res.body.should.not.have.property('refreshToken');

                // Property value and type checks
                res.body.error.should.be.a('string');

                done();
            });
    });

});

describe('POST /api/refresh-token', () => {

    // Access and refresh token variables
    let tokens = {};

    before((done) => {
        helper.registerHelper("refreshtest@example.com", "password", tokens, done);
    });

    it('returns a new different set of tokens given the refresh token', (done) => {
        // 1000 ms delay is intentional during tests to avoid similar tokens
        setTimeout(() => {
            chai.request(server)
                .post('/api/refresh-token')
                .send({ refreshToken: tokens.rf })
                .end((err, res) => {
                    res.should.have.status(200);

                    // Property checks
                    res.body.should.have.property('accessToken');
                    res.body.should.have.property('refreshToken');

                    res.body.accessToken.should.be.a('string');
                    res.body.accessToken.should.not.equal(tokens.ac);
                    res.body.refreshToken.should.be.a('string');
                    res.body.refreshToken.should.not.equal(tokens.rf);

                    // Reassign the tokens as they have already changed
                    tokens.ac = res.body.accessToken;
                    tokens.rf = res.body.refreshToken;

                    done();
            });
        }, 1000);
    })

    it('returns an error if an invalid refresh token is given', (done) => {
        chai.request(server)
            .post('/api/refresh-token')
            .send({ refreshToken: "abc123" })
            .end((err, res) => {
                res.should.have.status(403);
                
                res.body.should.have.property('error');
                res.body.error.should.be.a('string');
                res.body.error.should.not.be.empty;

                done();
            });
    });

    it('returns an error if an expired refresh token is given', (done) => {
        setTimeout(() => {
            chai.request(server)
                .post('/api/refresh-token')
                .send({ refreshToken: tokens.rf })
                .end((err, res) => {
                    res.should.have.status(200);

                    res.body.refreshToken.should.not.eql(tokens.rf);
                });
        }, 1000);
                    
        setTimeout(() => {
            chai.request(server)
                .post('/api/refresh-token')
                .send({ refreshToken: tokens.rf })
                .end((err, res) => {
                    res.should.have.status(403);
                    
                    res.body.should.have.property('error');
                    res.body.error.should.be.a('string');
                    res.body.error.should.not.be.empty;

                    done();
                });
        }, 1500);
    });

});

describe('GET /api/logout', () => {

    // Access and refresh token variables
    let tokens = {};

    before((done) => {
        helper.registerHelper("logouttest@example.com", "password", tokens, done);
    });

    it('logs out a user, then a token refresh attempt should be forbidden', (done) => {
        chai.request(server)
            .get('/api/logout')
            .set('Authorization', 'Bearer ' + tokens.ac)
            .end((err, res) => {
                res.should.have.status(200);

                res.body.should.have.property('message');
                res.body.message.should.be.a('string');
            });

        setTimeout(() => {
            chai.request(server)
            .post('/api/refresh-token')
            .send({ refreshToken: tokens.rf })
            .end((err, res) => {
                res.should.have.status(403);

                done();
            });
        }, 1000);
    });

});

describe('GET /api/auth-test', () => {
    // Access and refresh token variables
    let tokens = {};

    before((done) => {
        helper.registerHelper("authtest@example.com", "password", tokens, done);
    });

    it('allows requests with a valid access token in the header', (done) => {
        chai.request(server)
            .get('/api/auth-test')
            .set('Authorization', 'Bearer ' + tokens.ac)
            .end((err, res) => {
                res.should.have.status(200);

                done();
            });
    });

    it('disallows requests without an access token', (done) => {
        chai.request(server)
            .get('/api/auth-test')
            .end((err, res) => {
                res.should.have.status(401);
                done();
            });
    });

    it('disallows requets with an invalid/expired access token', (done) => {
        chai.request(server)
            .get('/api/auth-test')
            .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjo1LCJlbWFpbCI6InJlZnJlc2h0ZXN0QGV4YW1wbGUuY29tIn0sImlhdCI6MTYwODgzNzQxNSwiZXhwIjoxNjA4ODM4MzE1fQ.6VGz0DcAC_2_4mdDwL-n-ANLLl2yT7xPNXCum7_xjcc')
            .end((err, res) => {
                res.should.have.status(401);

                done();
            });
    })
});

describe('/api/sessions/', () => {
    let tokens = {};

    before((done) => {
        helper.registerHelper("sessionstest@example.com", "password", tokens, done);
    });

    describe('POST', () => {

        it('adds a session into the database if the session is unavailable', (done) => {
            chai.request(server)
                .post('/api/sessions')
                .send({ "date": "2023-05-01" })
                .set('Authorization', 'Bearer ' + tokens.ac)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('session');
                    res.body.session.should.be.a('object');
                    
                    res.body.session.should.have.property('weekYear');
                    res.body.session.should.have.property('dayOfWeek')
                    res.body.session.should.have.property('activeDuration');
                    res.body.session.should.have.property('inactiveDuration');

                    res.body.session.weekYear.should.eql('18-2023');
                    res.body.session.dayOfWeek.should.eql(1);
                    res.body.session.activeDuration.should.eql(0);
                    res.body.session.inactiveDuration.should.eql(0);

                    done();
                });
        });

    });

    describe('PUT', () => {

        it('updates the session in the database', async () => {
            await chai.request(server)
                        .post('/api/sessions')
                        .send({ "date": "2023-05-02" })
                        .set('Authorization', 'Bearer ' + tokens.ac);            

            const res1 = await chai.request(server)
                                    .put('/api/sessions')
                                    .send({ 
                                        "date": "2023-05-02",
                                        "activeDuration": 123,
                                        "inactiveDuration": 456
                                    })
                                    .set('Authorization', 'Bearer ' + tokens.ac);

            res1.should.have.status(204);

            const res2 = await chai.request(server)
                .post('/api/sessions')
                .send({ "date": "2023-05-02" })
                .set('Authorization', 'Bearer ' + tokens.ac);

            res2.should.have.status(200);
            res2.body.should.be.a('object');

            res2.body.should.have.property('session');
            res2.body.session.should.be.a('object');

            res2.body.session.weekYear.should.eql('18-2023');
            res2.body.session.dayOfWeek.should.eql(2);
            res2.body.session.activeDuration.should.eql(123);
            res2.body.session.inactiveDuration.should.eql(456);
        });

    });

    describe('GET /:weekYear', () => {

        before(async () => {
            for (let i = 0; i < 7; i++) {
                const date = "2023-05-" + (20 + i);
                await chai.request(server)
                        .post('/api/sessions')
                        .send({ "date": date })
                        .set('Authorization', 'Bearer ' + tokens.ac);
            }
        });

        it('gets all sessions in a given week-year if it has sessions', async () => {
            const res = await chai.request(server)
                                .get('/api/sessions/20-2023')
                                .set('Authorization', 'Bearer ' + tokens.ac);

            res.should.have.status(200);

            res.body.should.be.a('object');
            res.body.should.have.property('sessions');
            res.body.sessions.should.be.a('array');
            res.body.sessions.should.have.lengthOf(1);

            res.body.sessions[0].should.be.a('object');

            const res2 = await chai.request(server)
                                .get('/api/sessions/21-2023')
                                .set('Authorization', 'Bearer ' + tokens.ac);

            res2.should.have.status(200);

            res2.body.should.be.a('object');
            res2.body.should.have.property('sessions');
            res2.body.sessions.should.be.a('array');
            res2.body.sessions.should.have.lengthOf(6);
            
        });

        it('gives out an error if an invalid weekYear is given', (done) => {
            chai.request(server)
                .get('/api/sessions/20_2023')
                .set('Authorization', 'Bearer ' + tokens.ac)
                .end((err, res) => {
                    res.should.have.status(400);

                    done();
                });
        });
        
    });
});
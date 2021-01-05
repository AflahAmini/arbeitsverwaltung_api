process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

chai.should();
chai.use(chaiHttp);

describe('POST /api/register', () => {

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
        registerHelper("logintest@example.com", "password", {}, done);
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
        registerHelper("refreshtest@example.com", "password", tokens, done);
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
        registerHelper("logouttest@example.com", "password", tokens, done);
    });

    it('logs out a user, then a token refresh attempt should be forbidden', (done) => {
        chai.request(server)
            .get('/api/logout')
            .set('Authorization', 'Bearer ' + tokens.ac)
            .end((err, res) => {
                res.should.have.status(200);

                res.body.should.have.property('message');
                res.body.message.should.be.a('string');

                done();
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
        registerHelper("authtest@example.com", "password", tokens, done);
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

// Helper function for any methods requiring authentication
function registerHelper(email, password, tokensObj, done) {
    const user = {
        email: email,
        password: password,
        passwordConfirmation: password
    };

    chai.request(server)
        .post('/api/register')
        .send(user)
        .end((err, res) => {
            tokensObj.ac = res.body.accessToken;
            tokensObj.rf = res.body.refreshToken;

            done();
        });
}
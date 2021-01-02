const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const database = require('./dbController');
const { responseObj } = require('../utils/response');
const { svr_logger } = require('../utils/logger');

const email_regex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

// Middleware, registers the user into the database and logs him/her/it in.
function register(req, res) {
    const user = req.body;

    tryRegister(user).then( response => {
        if (response.success) {
            svr_logger.info(`User ${response.message.email} registered successfully with id ${response.message.id}.`);
            res.redirect(307, '/api/login');
        }
        else 
            res.json(response);
    }).catch(err => {
        svr_logger.error(err);
        res.sendStatus(501);
    });
}

// Middleware, logs the user in and responds with the refresh and access tokens.
function login(req, res) {
    const user = req.body;

    tryAuthenticate(user).then( response => {
        if (response.success) {
            svr_logger.info(`User ${response.message.email} logged in successfully.`);
            
            // Response message should equal the user object now
            const accessToken = getAccessToken(response.message);
            const refreshToken = getRefreshToken(response.message);

            response.accessToken = accessToken;
            response.refreshToken = refreshToken;
        }
        
        res.json(response);
    }).catch(err => {
        svr_logger.error(err);
        res.sendStatus(501);
    });
}

// Middleware, logs the user out, deleting the corresponding refresh key in the process.
function logout(req, res) {
    database.refreshTable.deleteById(req.user.id);

    svr_logger.info(`User ${req.user.email} logged out successfully.`);
    res.json(responseObj(true, "Logged out successfully!"));
}

// Middleware that parses the token using the secret, gets the user object from it
// and sets it as the user property in the request object
function authenticateToken(req, res, next) {
    // Gather the jwt access token from the request header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json( responseObj(false, 'Token is invalid') );
    }

    verifyToken(authHeader)
        .then(user => {
            req.user = user;
            next();
        }).catch(err => {
            return res.status(401).json( responseObj(false, err) );
        });
}

// Middleware, refreshes the refresh token and sends a response with a new set of tokens
function refreshToken(req, res) {
    const token = req.body.refreshToken;
    let user = {};

    if (!token)
        return res.status(403).json(responseObj(false, "Access is forbidden."));

    try {
        const decoded = jwt.verify(token, process.env.SECRET);

        user = database.usersTable.get('id', decoded.user.id);
        if (!user) {
            throw new Error('Access is forbidden');
        }

        const existingRefreshToken = database.refreshTable.get('userId', user.id);
        if (!existingRefreshToken) {
            throw new Error('Access is forbidden');
        } else if  (existingRefreshToken.refreshToken !== token) {
            throw new Error('Refresh token is wrong')
        }

    } catch (err) {
        const message = (err && err.message) || err;
        return res.status(403).json(responseObj(false, message));
    }

    const payload = {
        id : user.id,
        email: user.email
    };
    
    const newRefreshToken = jwt.sign({ user: payload }, process.env.SECRET, { expiresIn: process.env.REFRESH_TOKEN_LIFE });
    const newAccessToken = getAccessToken(payload);

    database.refreshTable.update(token, newRefreshToken);

    svr_logger.info(`Session refreshed for user of id ${user.id}`);

    let response = responseObj(true, "");
    response.accessToken = newAccessToken;
    response.refreshToken = newRefreshToken;
    res.json(response);
}

// Manual verification of the token, useful for client auth for web sockets
function verifyToken(token) {
    return new Promise((resolve, reject) => {
        if (!token.startsWith('Bearer')) {
            return reject('Token is invalid');
        }

        token = token.slice(7, token.length);

        jwt.verify(token, process.env.SECRET, (err, decoded) => {
            if (err) {
                return reject(err.message);
            }
            if (!decoded || !decoded.user) {
                return reject('Token is invalid');
            }
            resolve(decoded.user);
        });
    });
}

// Async function to register a user into the database,
// awaits a response JSON ( required : email, password, passwordConfirmation )
async function tryRegister(user) {
    if (user.email === undefined || user.password === undefined || user.passwordConfirmation === undefined)
        return responseObj(false, "API Error - expected fields are undefined!");

    if (!email_regex.test(user.email)) 
        return responseObj(false, "Invalid email format!");

    if (user.password.length < 8)
        return responseObj(false, "Password must be at least 8 characters long!")

    if (user.password != user.passwordConfirmation)
        return responseObj(false, "Passwords do not match!");

    // Waits until the hash is generated
    const passwordHash = await bcrypt.hash(user.password, await bcrypt.genSalt(10))
                        .catch(err =>  {
                            svr_logger.error(err);
                            return responseObj(false, "authenticate", "Seems to be something wrong on our side.")
                        });

    try {
        const entry = { email: user.email, password: passwordHash };

        // Throws error if there is already a user with the same email
        const addedUser = database.usersTable.add(entry);

        return responseObj(true, addedUser);
    } catch (err) {
        return responseObj(false, "Email already exists!");
    }
}

// Authentication method given the user object
// ( required params : email, password )
async function tryAuthenticate(user) {
    if (user.email === undefined || user.password === undefined)
        return responseObj(false, "API Error - expected fields are undefined!");

    userFromDb = database.usersTable.get('email', user.email);

    if (userFromDb) {
        // Waits until the comparison has been made
        const passwordMatches = await bcrypt.compare(user.password, userFromDb.password)
        .catch(err =>  {
            svr_logger.error(err);
            return responseObj(false, "Seems to be something wrong on our side.")
        });

        if (passwordMatches)
            return responseObj(true, { id: userFromDb.id, email: userFromDb.email});
    }

    return responseObj(false, "Email and/or password is incorrect!");
}

// Generates a short-living access token
function getAccessToken(payload) {
    return jwt.sign({ user: payload }, process.env.SECRET, { expiresIn: process.env.ACCESS_TOKEN_LIFE });
}

// Generates a long-living refresh token, and adds it to the database
function getRefreshToken(payload) {
    // Deletes any existing refresh tokens corresponding with the user (capping the session amount to 1 per user)
    database.refreshTable.deleteById(payload.id);

    const refreshToken = jwt.sign({ user: payload }, process.env.SECRET, { expiresIn: process.env.REFRESH_TOKEN_LIFE });
    database.refreshTable.add(payload.id, refreshToken);
    
    return refreshToken;
}

module.exports = {
    register,
    login,
    logout,
    authenticateToken,
    refreshToken,
    verifyToken
};
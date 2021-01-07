const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const database = require('./dbController');
const { responseObj, errorObj } = require('../utils/response');
const { svr_logger } = require('../utils/logger');

const email_regex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

// Middleware, registers the user into the database and logs him/her/it in.
function register(req, res) {
    const user = req.body;

    tryRegister(user).then( addedUser => {
        svr_logger.info(`User ${addedUser.email} registered successfully with id ${addedUser.id}.`);

        const filesPath = process.env.NODE_ENV === 'test' ? './filesTest' : './files';
        fs.mkdir(`${filesPath}/${addedUser.id}`, { recursive: true }, (err) => {
            if (err)
                throw err;
            svr_logger.info(`Folder created for user ${addedUser.id}`);
        });

        res.redirect(307, '/api/login');

    }).catch(err => {
        if (err.constructor != Error) {
            svr_logger.error(err);
            throw err;
        }
        
        res.status(400).json(errorObj(err.message));
    });
}

// Middleware, logs the user in and responds with the refresh and access tokens.
function login(req, res) {
    const user = req.body;

    tryAuthenticate(user).then( loggedInUser => {
        svr_logger.info(`User ${loggedInUser.email} logged in successfully.`);
        
        const response = responseObj("Logged in successfully!");
        response.id = loggedInUser.id;

        // User should be in the form of { id, email }
        response.accessToken = getAccessToken(loggedInUser);
        response.refreshToken = getRefreshToken(loggedInUser);
        
        res.json(response);
    }).catch(err => {
        if (err.constructor != Error){
            svr_logger.error(err);
            throw err;    
        }

        res.status(401).json(errorObj(err.message));
    });
}

// Middleware, logs the user out, deleting the corresponding refresh key in the process.
function logout(req, res) {
    database.refreshTable.deleteById(req.user.id);

    svr_logger.info(`User ${req.user.email} logged out successfully.`);
    res.json(responseObj("Logged out successfully!"));
}

// Middleware that parses the token using the secret, gets the user object from it
// and sets it as the user property in the request object
function authenticateToken(req, res, next) {
    // Gather the jwt access token from the request header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json( errorObj('Token is invalid') );
    }

    verifyToken(authHeader)
        .then(user => {
            req.user = user;
            next();
        }).catch(err => {
            return res.status(401).json( errorObj(err.message) );
        });
}

// Middleware, refreshes the refresh token and sends a response with a new set of tokens
function refreshToken(req, res) {
    const token = req.body.refreshToken;
    let user = {};

    if (!token)
        return res.status(403).json(errorObj("Access is forbidden."));

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
        return res.status(403).json(errorObj(message));
    }

    const payload = {
        id : user.id,
        email: user.email
    };
    
    const newRefreshToken = jwt.sign({ user: payload }, process.env.SECRET, { expiresIn: process.env.REFRESH_TOKEN_LIFE });
    const newAccessToken = getAccessToken(payload);

    database.refreshTable.update(token, newRefreshToken);

    svr_logger.info(`Session refreshed for user of id ${user.id}`);

    res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    });
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
        throw new Error("API Error - expected fields are undefined!");

    if (!email_regex.test(user.email)) 
        throw new Error("Invalid email format!");

    if (user.password.length < 8)
        throw new Error("Password must be at least 8 characters long!")

    if (user.password != user.passwordConfirmation)
        throw new Error("Passwords do not match!");

    // Waits until the hash is generated
    const passwordHash = await bcrypt.hash(user.password, await bcrypt.genSalt(10))
                        .catch(err =>  {
                            svr_logger.error(err);
                            throw new Error("Seems to be something wrong on our side.")
                        });

    try {
        const entry = { email: user.email, password: passwordHash };

        // Throws an error if there is already a user with the same email
        return database.usersTable.add(entry); 
    } catch (err) {
        throw new Error("Email already exists!");
    }
}

// Authentication method given the user object
// ( required params : email, password )
async function tryAuthenticate(user) {
    if (user.email === undefined || user.password === undefined)
        throw new Error("API Error - expected fields are undefined!");

    userFromDb = database.usersTable.get('email', user.email);

    if (userFromDb) {
        // Waits until the comparison has been made
        const passwordMatches = await bcrypt.compare(user.password, userFromDb.password)
        .catch(err =>  {
            svr_logger.error(err);
            throw new Error("Seems to be something wrong on our side.")
        });

        if (passwordMatches)
            return { id: userFromDb.id, email: userFromDb.email };
    }

    throw new Error("Email and/or password is incorrect!");
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
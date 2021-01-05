const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const sessionsController = require('../controllers/sessionsController');
const { responseObj } = require('../utils/response');

router.get('/', (_, res) => {
    res.json(responseObj("Okay"));
});
router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/refresh-token', authController.refreshToken);

// Routes after this line require authentication
router.use(authController.authenticateToken);

router.get('/logout', authController.logout);
router.get('/auth-test', (_, res) => {
    res.json(responseObj("You are authenticated!"));
});

router.post('/sessions/:userId', sessionsController.createSession);
router.put('/sessions/:userId', sessionsController.updateSession);

module.exports = router;
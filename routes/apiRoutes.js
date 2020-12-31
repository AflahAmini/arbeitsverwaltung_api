const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { responseObj } = require('../utils/response');

router.get('/', (_, res) => {
    res.json(responseObj(true, "Okay"));
});
router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/refresh-token', authController.refreshToken);

// Routes after this line require authentication
router.use(authController.authenticateToken);

router.get('/logout', authController.logout);
router.get('/auth-test', (_, res) => {
    res.json(responseObj(true, "You are authenticated!"));
});

module.exports = router;
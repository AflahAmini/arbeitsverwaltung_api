const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');

const authController = require('../controllers/authController');
const sessionsController = require('../controllers/sessionsController');
const filesController = require('../controllers/filesController');
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

router.post('/sessions', sessionsController.createSession);
router.put('/sessions', sessionsController.updateSession);
router.get('/sessions/:weekYear', sessionsController.getSessionsForWeekYear);

router.use(fileUpload());
router.get('/calendar/:userId', filesController.getCalendar);
router.post('/calendar/:userId', filesController.postCalendar);
router.use('/files/:userId', filesController.handleFiles);

module.exports = router;
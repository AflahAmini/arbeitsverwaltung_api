const { svr_logger } = require("../utils/logger");
const { responseObj, errorObj } = require("../utils/response");
const dateUtils = require("../utils/dateUtils");
const { sessionsTable } = require("./dbController");

// Middleware, creates a session if it does not exist and attaches the session
// to the response. Otherwise the session attached would be the existing session in the db
// (requires : date(yyyy-mm-dd))
function createSession(request, response) {
    handleExceptions(request, response, (req, res) => {
        const sessionObj = req.body;
        const weekYearAndDay = dateUtils.getWeekYearAndDay(sessionObj.date);
        
        const entry = sessionsTable.getOrAddSession(req.user.id, weekYearAndDay[0], weekYearAndDay[1]);

        let msg = "";
        if (entry.activeDuration > 0 || entry.inactiveDuration > 0) {
            svr_logger.info(`Resuming session for user ${req.user.id}`);
            msg = "Session already exists. Resuming today's session"
        } else {
            svr_logger.info(`Created new session for user ${req.user.id}`);
            msg = "New session created"
        }

        const out = responseObj(msg);
        out.session = entry;
        res.json(out);
    });
}

// Middleware, updates the session in the database
// (requires : date(yyyy-mm-dd), activeDuration, inactiveDuration)
function updateSession(request, response) {
    handleExceptions(request, response, (req, res) => {
        const sessionObj = req.body;
        const weekYearAndDay = dateUtils.getWeekYearAndDay(sessionObj.date);

        const doesExist = !!sessionsTable.getSession(req.user.id, weekYearAndDay[0], weekYearAndDay[1]);
        if (!doesExist)
            throw new Error('Session entry does not exist');

        sessionsTable.updateSession(req.user.id, weekYearAndDay[0], weekYearAndDay[1], 
            sessionObj.activeDuration, sessionObj.inactiveDuration);

        res.sendStatus(204);
    });
}

// Middleware, gets all the sessions for the user in the specified week-year
function getSessionsForWeekYear(request, response) {
    handleExceptions(request, response, (req, res) => {
        if (!dateUtils.isValidWeekYear(req.params.weekYear))
            throw new Error('Invalid week year format!')

        const sessions = sessionsTable.getSessionsByWeekYear(req.user.id, req.params.weekYear);
        res.json({sessions: sessions});
    });
}

// More or less a middleware but idk, serves as a framework for all the methods here
function handleExceptions(req, res, callback) {
    try {
        callback(req, res);
    } catch (err) {
        if (err.constructor != Error) {
            throw err;
        }

        res.status(400).json(errorObj("Bad request : " + err.message));
    }
}

module.exports = {
    createSession,
    updateSession,
    getSessionsForWeekYear
};
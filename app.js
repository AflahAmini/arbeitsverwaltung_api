const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const apiRoutes = require('./routes/apiRoutes');

const app = express();

app.use(helmet());

// Limit requests per IP to 100 requests in 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api', limiter);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/api', apiRoutes);

app.use((req, res) => {
    res.sendStatus(404);
});

module.exports = app;
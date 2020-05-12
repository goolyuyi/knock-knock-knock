let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();

app.use(express.json());
app.use(cookieParser());

let knockKnock = require('../knock-knock-knock')({});
knockKnock.enable('test', require('./sample-schema'), true);

app.post('/login', knockKnock.login(), (req, res, next) => {
    res.send('okay');
});

module.exports = app;

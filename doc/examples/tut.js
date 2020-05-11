let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();
app.use(express.json());
app.use(cookieParser());

let knockKnock = require('../knock-knock')({});
knockKnock.enable('test', require('./all-schema'), true);

app.post('/login', knockKnock.login(), (req, res, next) => {
    if (req.unauthorizedError)//req.unauthorizedError if err
        res.send('denied:' + req.unauthorizedError)

    if (req.user)//set req.user if ok
        res.send('okay!');
});

module.exports = app;

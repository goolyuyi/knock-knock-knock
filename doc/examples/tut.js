/**
 * m
 * @file
 */

let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();
app.use(express.json());
app.use(cookieParser());

let kkk = require('knock-knock-knock')({});
kkk.enable('test', require('knock-password-schema'));

app.post('/login', kkk.login('test'), (req, res, next) => {
    //req.unauthorizedError if err
    if (req.unauthorizedError)
        res.send('denied:' + req.unauthorizedError)

    //set req.user if ok
    if (req.user){
        //kkk will only make sure the auth/login process is legal
        //more verify operation here
        //...

        res.send('okay!');
    }
});

module.exports = app;

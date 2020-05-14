/**
 * tutorial for open-id login and jwt auth schema
 * @file
 */
let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();
app.use(express.json());
app.use(cookieParser('top-secret'));
app.use(express.urlencoded({extended: false}));

let kkk = require('knock-knock-knock');
let knock = kkk({});

let openidLoginSchema = require('knock-openid-schema');
let jwtAuthSchema = require('knock-jwt-schema');

//a open-id issuer discovery
openidLoginSchema.discovery('https://accounts.google.com/.well-known/openid-configuration').then((schema) => {
    knock.enable('openidLoginSchema', schema);
    knock.enable('jwtAuthSchema', new jwtAuthSchema({}));
});

//this route handles oauth request step
app.get('/login', knockKnock.oauthLogin());

//this route handles oauth callback step
app.get('/oauthcallback', knockKnock.oauthCallback(), (req, res, next) => {
    if (req.user) {
        res.send(req.user);
    }
});

//handle error
app.use(function (err, req, res, next) {
    //kkk only throw this type of Exception
    if (err instanceof UnauthorizedError) {
        console.error(err);
        res.status(err.status).send(err);
    } else {
        res.status(500).send('interal error');
    }
})

module.exports = app;

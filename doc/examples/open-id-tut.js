let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();
app.use(express.json());
app.use(cookieParser('top-secret'));
app.use(express.urlencoded({extended: false}));

let {UnauthorizedError} = require('knock-knock');
let knockKnock = require('knock-knock')({});

let openidSchema = require('google-openid-schema');

//this schema will descovery openid issuer from https://accounts.google.com/.well-known/openid-configuration
openidSchema.discovery().then((schema) => {
    return knockKnock.enable('google-openid', openidSchema, true);
}).catch((err) => {
    console.error(err);
});

app.get('/login', knockKnock.oauthLogin());

app.all('/oauthcallback', knockKnock.oauthCallback(), (req, res, next) => {
    if (req.user) {
        res.send(req.user);
    }
});

app.use(function (err, req, res, next) {
    if (err instanceof UnauthorizedError) {
        console.error(err);
        res.status(err.status).send(err);
    } else {
        res.status(500).send('interal error');
    }
})

module.exports = app;

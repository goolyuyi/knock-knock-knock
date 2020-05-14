
# Description
An authorization framework!

## Features
* extremely lightweight
* zero dependencies
* compatible with express
* RESTful design
* easy use with openid and oauth
* easy to customize

# Install
* yarn:
```bash
yarn add knock-knock
# install needed schemas
# yarn add knock-google-openid
# yarn add knock-jwt-schema
```
* npm:
```bash
npm install knock-knock
# install needed schemas
# npm install knock-google-openid
# npm install knock-jwt-schema
```
# Example
tutorial for open-id login and jwt auth schema
```js
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
    if (req.user)
        res.send('okay!');
});

module.exports = app;
```
# Custom Schemas
# API
# License

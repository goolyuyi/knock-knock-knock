let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();

app.use(express.json());
app.use(cookieParser());

const KKK = require('../');
const kkk = new KKK({});
kkk.enable('test', require('./test-schema'),true);

app.post('/login', kkk.knockLogin('test'), (req, res, next) => {
    res.send('okay');
});

module.exports = app;

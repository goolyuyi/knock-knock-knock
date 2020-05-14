const KnockKnockKnock = require('./');

module.exports = function (options) {
    return new KnockKnockKnock(options);
};

module.exports.class = KnockKnockKnock;
module.exports.mockLoginSchema = require('./mock-login-schema');
module.exports.UnauthorizedError = require('./UnauthorizedError');

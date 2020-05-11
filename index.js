const KnockKnock = require('./knock-knock');

module.exports = function (options) {
    return new KnockKnock(options);
};

module.exports.class = KnockKnock;
module.exports.mockLoginSchema = require('./mock-login-schema');
module.exports.UnauthorizedError = require('./UnauthorizedError');

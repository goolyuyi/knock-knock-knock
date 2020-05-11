/**
 * @file
 * how to use this
 * show aaa **bbb**
 */
const KnockKnock = require('./knock-knock');

module.exports = new function () {
    //must implement this to authenticate
    this.knockLogin = this.login = async function (req, res) {
        // req.user =...
        // or
        // req.unauthorizedError = new KnockKnock.unauthorizedError();
    };

    //must implement this to authorize
    this.knockAuth = this.auth = async function (req, res) {
        //you should verify a session here...

        // req.user =...
        // or
        // req.unauthorizedError = new KnockKnock.unauthorizedError();
    }

    this.create = async function (req, res) {

    }


    this.revoke = function (req, res) {

    }

    this.oauthCallback = function (req, res) {

    }
};

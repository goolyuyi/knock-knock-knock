module.exports = new function () {

    //must implement this to handle user login
    this.knockLogin = this.login = async function (req, res) {
        //must return user id object
        return 'test user';
    };

    //should implement this if you want to self-handle user authentication(like query a database)
    //or just omit/comment this and let lib's user to handle it!
    this.verify = async function (req, res) {
        console.log(req.user);
        return req.user;
    };

    //must implement this if you want to establish login session
    //you should both set and get session
    this.knockAuth = this.auth = async function (req, res) {
        console.log(req.user);
    }

    // this.create = async function (req, res) {
    //
    // }
    //
    //
    // this.revoke = function (req, res) {
    //
    // }
    //
    // this.oauthCallback = function (req, res) {
    //
    // }
};

module.exports = new function () {
    this.name="test-schema";

    //must implement for login-schema
    this.knockLogin = this.login = async function (req, res) {
        //set user object
        req.user =  'test user';
    };

    //must implement this for auth-schema
    this.knockAuth = this.auth = async function (req, res) {
        console.log(req.user);
    }
};

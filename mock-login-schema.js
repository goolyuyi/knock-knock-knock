module.exports = new function () {
    this.knockLogin = this.login = function (req, res) {
        if (req.body && req.body.user === 'mock') {
            return 'mock'
        }
    };
    this.name = 'mock login';
};

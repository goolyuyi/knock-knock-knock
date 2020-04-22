module.exports = class UnauthorizedError extends Error {
    constructor(message, rawError) {
        super(message);
        this.name = this.constructor.name;
        this.status = 401;
        this.rawError = rawError;
    }
}

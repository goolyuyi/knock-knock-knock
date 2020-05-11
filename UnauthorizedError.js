/**
 * A Unauthorized Error
 * @extends Error
 */
class UnauthorizedError extends Error {
    constructor(message, schema, rawError) {
        super(message);
        this.name = this.constructor.name;
        this.status = 401;

        if (schema)
            /**
             *
             */
            this.schema = schema;
        /**
         *
         */
        this.rawError = rawError;
    }
}

module.exports = UnauthorizedError;

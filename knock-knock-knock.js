const assert = require('assert');
const UnauthorizedError = require('./UnauthorizedError');

let schemaInterface = {};
/**
 * a schema must implement one of the interface's methods
 * @interface
 */
schemaInterface.interface = {
    /**
     * **must implement this for login-schema**.
     * @async
     * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
     * @param {Object} res - same like **express**
     * @function schemaInterface.interface.knockLogin
     */
    login: 'knockLogin',

    /**
     * **must implement this for auth schema**.
     * @async
     * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
     * @param {Object} res - same like **express**
     * @function schemaInterface.interface.knockAuth
     */
    auth: 'knockAuth'
};

schemaInterface.hasRequiredFunction =
    function (schema, type) {
        return (typeof schema[schemaInterface.interface[type]]) === 'function';
    };


schemaInterface.optional = {
    /**
     * if the schema implemented this interface , it is able to use {@link KnockKnockKnock#[schemaFunctions]} to call this function in schema
     * @interface schemaInterface.loginOptional
     */
    login: [

        'login',

        /**
         * @function schemaInterface.loginOptional.oauthLogin
         */
        'oauthLogin',

        /**
         * @function schemaInterface.loginOptional.oauthCallback
         */
        'oauthCallback'
    ],
    /**
     * if the schema implemented this interface , it is able to use {@link KnockKnockKnock#[schemaFunctions]} to call this function in schema
     * @interface schemaInterface.authOptional
     */
    auth: [
        /**
         * @function schemaInterface.authOptional.create
         */
        'create',
        'auth',

        /**
         * @function schemaInterface.authOptional.revoke
         */
        'revoke'
    ]
};

schemaInterface.lazy = {
    login: [
        'login',
        'oauthLogin',
        'oauthCallback'
    ],
    auth: [
        'auth',
        'revoke',
    ]
};

/**
 * @typedef responseFunction
 * async function (schema,req,res)
 * @function
 * @async
 * @param schema with schema.name
 * @param req
 * @param res
 */

/**
 * @typedef KnockKnockKnock~Option
 * @property {responseFunction} [globalLoginResponse] the global login response function
 * @property {responseFunction} [globalAuthResponse] the global auth response function
 * @property {boolean} [throwUnauthorizedError=true] should throw error when unauthorized-error occurs otherwise knock-knock-knock just only set req.unauthorizedError
 */

/**
 * @private
 * @param {KnockKnockKnock~Option} option
 * @return {{globalAuthResponse}|*}
 */
function normalizeOption(option) {
    option = option ? option : {};
    option.throwUnauthorizedError = option.throwUnauthorizedError || true;


    option.globalLoginResponse = option.globalLoginResponse && typeof option.globalLoginResponse === 'function' ? option.globalLoginResponse : undefined;
    option.globalAuthResponse = option.globalAuthResponse && typeof option.globalAuthResponse === 'function' ? option.globalAuthResponse : undefined;
    return option;
}

/**
 * knock-knock-knock main class
 */
class KnockKnockKnock {

    /**
     * @constructor
     * @param {KnockKnockKnock~Option} option
     */
    constructor(option) {
        this.schemas = new Map();
        this.defaultSchemasCache = {};
        this.option = normalizeOption(option);
    }

    /* eslint-disable */
    static symbolDefault = Symbol('default');

    /**
     * enable a schema
     * knock-knock-knock won't work until at least  one schema with `schema.checkType==schemaType.LOGIN` is enabled
     * @param name {string} schama name
     * @param schema {schemaInterface} schema
     * @param setDefault {boolean} default use the schema if user won't specify a schema name {@link }
     */
    enable(name, schema, setDefault = false) {
        assert(name);
        if (name && typeof name === 'string') schema['name'] = name;

        assert(name);
        assert(schema && typeof schema === 'object');

        schema[KnockKnockKnock.symbolDefault] = setDefault;

        this.schemas.set(name, schema);
        this.defaultSchemasCache = {};

        //TODO: prevent re-set same schemas?
    };

    /**
     * disable a schema
     * @param name {string} schema name
     */
    disable(name) {
        assert(name);
        this.schemas.delete(name);
        this.defaultSchemasCache = {};
    };

    /**
     * check able to work
     * knock-knock-knock won't available until least one login-schema are enabled
     * @return {boolean}
     */
    get valid() {
        if (!(this.schemas && this.schemas.size > 0)) return false;
        return Array.from(this.schemas.values()).some((i) => {
            return schemaInterface.hasRequiredFunction(i, 'login');
        })
    }

    /**
     *
     * @param name schema name
     * @param type {"auth"|"login"|null} `auth` or `login`
     * @return {any}
     * @private
     */
    _preferSchema(name, type = null) {
        if (name) {
            let res = this.schemas.get(name);
            if (type)
                res = schemaInterface.hasRequiredFunction(res, type) ? res : undefined;
            return res;
        } else if (type) {
            if (!this.defaultSchemasCache[type]) {
                this.defaultSchemasCache[type] = Array.from(this.schemas.values()).find((i) => {
                    return i[KnockKnockKnock.symbolDefault] && schemaInterface.hasRequiredFunction(i, type);
                });
            }
            return this.defaultSchemasCache[type];
        }

        return null;
    }


    /**
     *
     * @param req
     * @param param {string} name to deferred schema name
     * @return {string} prefer schema name deferred from req
     * @private
     */
    _getParamFromReq(req, param) {
        return req.params[param] || req.query[param] || req.cookies[param] || req.body[param];
    }

    _manual(schema, req, res) {
        function setUser(user) {
            if (user) {
                if (typeof user !== 'object') user = {user: user};
                req.user = user;
            }
            return user;
        }

        let login = async () => {
            assert(this.valid);

            let user = setUser(await schema[schemaInterface.interface.login](req, res) || req.user);
            if (res.headersSent)
                throw new UnauthorizedError("don't end res in schema", schema);

            if (user && !req.unauthorizedError) {
                let auth = this._preferSchema(this._getParamFromReq(req, schemaInterface.interface.auth), 'auth');
                if (auth && typeof auth['create'] === 'function') {
                    await auth['create'](req, res);
                }
            }

            if (this.option.globalLoginResponse) {
                await this.option.globalLoginResponse(schema, req, res);
            }

        };

        let auth = async () => {
            setUser(await schema[schemaInterface.interface.auth](req, res) || req.user);
            if (res.headersSent)
                throw new UnauthorizedError("don't end res in schema", schema);

            if (this.option.globalAuthResponse) {
                await this.option.globalAuthResponse(schema, req, res);
            }
        }

        return {login, auth};
    }

    /**
     * @todo implement this
     * @param router
     */
    lazy(router) {

    }
}

/**
 * get the functions from schema who implemented the interface {@link schemaInterface.loginOptional} and {@link schemaInterface.authOptional}
 *
 * e.g if a schema which implements {@link schemaInterface.loginOptional.oauthLogin} it could call `knockKnockKnock.oauthLogin(schemaName)(<schema specified args>)`
 * @function KnockKnockKnock#[schemaFunctions]
 * @param {string} schemaName schema name {@link KnockKnockKnock#enable}
 */
(function createOptionalMethods() {
    for (let [type, methods] of Object.entries(schemaInterface.lazy)) {
        methods.forEach((method) => {
                KnockKnockKnock.prototype[method] = function (schemaName) {
                    let schema;
                    if (schemaName) {
                        schema = this._preferSchema(schemaName, type);
                    }

                    return async (req, res, next) => {
                        try {
                            assert(this.valid);

                            //deduce schema hint from req
                            if (!schema) {
                                schema = this._preferSchema(
                                    this._getParamFromReq(req, type === 'login' ?
                                        schemaInterface.interface.login :
                                        schemaInterface.interface.auth
                                    )
                                    , type);
                            }


                            assert(schema && typeof (schema[method]) === 'function');
                            let isInterfaceMethod = Object.values(schemaInterface.interface).some(
                                (v) => {
                                    return schema[v] === schema[method]
                                }
                            )

                            if (isInterfaceMethod) {
                                let user = await this._manual(schema, req, res)[type]();
                                user = user || req.user;
                                if (!user && !req.unauthorizedError) {
                                    req.unauthorizedError = new UnauthorizedError(
                                        `must set req.user if login/auth success or set req.unauthorizedError otherwise`, schema
                                    );
                                }

                            } else {
                                await schema[method](req, res);
                            }

                            if (req.unauthorizedError) {
                                throw req.unauthorizedError;
                            }

                            next();
                        } catch
                            (err) {
                            if (!(err instanceof UnauthorizedError))
                                req.unauthorizedError = new UnauthorizedError(`internal error`, schema, err);

                            if (this.option.throwUnauthorizedError) {
                                next(req.unauthorizedError);
                            } else {
                                next();
                            }
                        }
                    }
                }
            }
        )
    }
})();

module.exports = KnockKnockKnock

const assert = require('assert');
const UnauthorizedError = require('./UnauthorizedError');

/**
 *
 * @interface
 * @ee ./doc/examples/all-schema.js
 */
let schemaInterface = {};

/**
 * a schema must implement one of the interface's methods
 * @interface
 */
schemaInterface.interface = {

    // /**
    //  * **must implement** for a name of schema
    //  * @member schemaInterface.interface.name
    //  */
    // name: 'name',

    /**
     * **must implement** for login-schema.
     * @async
     * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
     * @param {Object} res - same like **express**
     * @function schemaInterface.interface.knockLogin
     * @ee ./doc/examples/login-schema.js
     */
    login: 'knockLogin',

    /**
     * **must implement** for auth schema.
     * @async
     * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
     * @param {Object} res - same like **express**
     * @function schemaInterface.interface.knockAuth
     * @ee ./doc/examples/auth-schema.js
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
        /**
         * @function schemaInterface.loginOptional.login
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
         */
        'login',

        /**
         * @function schemaInterface.loginOptional.oauthLogin
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
         */
        'oauthLogin',

        /**
         * @function schemaInterface.loginOptional.oauthCallback
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
         */
        'oauthCallback'
    ],
    /**
     * if the schema implemented this interface , it is able to use {@link KnockKnockKnock#[schemaFunctions]} to call this function in schema
     * @interface schemaInterface.authOptional
     */
    auth: [
        /**
         * @function schemaInterface.authOptional.createSession
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
         */
        'createSession',
        /**
         * @function schemaInterface.authOptional.auth
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
         */
        'auth',
        /**
         * @function schemaInterface.authOptional.revoke
         * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
         * @param {Object} res - same like **express**
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
 * @typedef userVerifyFunction
 * async function (req,res)
 * **must** return a user object if verified, otherwise it means can't verify the current request
 * also can access `req.user` for current user status or `req.unauthorizedError` for current error
 * @function
 * @async
 * @param {Object} req - `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error
 * @param {Object} res - same like **express**
 * @ee ./doc/examples/kkkverify.js
 */

/**
 * @typedef KnockKnockKnock~Option
 * @property {userVerifyFunction} [globalLoginVerify] the global login verify function
 * @property {userVerifyFunction} [globalAuthVerify] the global auth verify function
 * @property {boolean} [throwUnauthorizedError=true] should throw error when unauthorized-error occurs otherwise kkk just only set `req.unauthorizedError`
 */

/**
 * @private
 * @param {KnockKnockKnock~Option} option
 */
function normalizeOption(option) {
    option = option ? option : {};
    option.throwUnauthorizedError = option.throwUnauthorizedError || true;

    option.globalLoginVerify = option.globalLoginVerify && typeof option.globalLoginVerify === 'function' ? option.globalLoginVerify : undefined;
    option.globalAuthVerify = option.globalAuthVerify && typeof option.globalAuthVerify === 'function' ? option.globalAuthVerify : undefined;
    return option;
}

/**
 * knock-knock-knock main class
 * @ee ./doc/examples/newKKK.js
 */
class KnockKnockKnock {

    /**
     * @constructor
     * @param {KnockKnockKnock~Option} [option=undefined]
     */
    constructor(option) {
        this.schemas = new Map();
        this.defaultSchemasCache = {};
        this.option = normalizeOption(option);
    }

    /* eslint-disable */
    static symbolDefault = Symbol('default');
    static symbolID = Symbol('id');

    /* eslint-enable */

    _validSchema(schema) {
        //assert(schema['name'] && typeof schema['name'] === 'string', 'schema must has name member');
        assert(
            schemaInterface.hasRequiredFunction(schema, 'login') || schemaInterface.hasRequiredFunction(schema, 'auth'),
            new TypeError(`schema must implement one of ${schemaInterface.interface.login} or ${schemaInterface.interface.auth}`));
    }

    /**
     * enable a schema
     * knock-knock-knock won't work until at least one login schema is enabled
     * @param id {string} schama id
     * @param schema {schemaInterface} schema
     * @param setDefault {boolean} default use the schema if user won't specify a schema id
     * @example
     * kkk.enable('test',schemaForKKK ,true);
     */
    enable(id, schema, setDefault = false) {
        assert(id && typeof id === 'string');
        this._validSchema(schema);

        schema[KnockKnockKnock.symbolDefault] = setDefault;
        schema[KnockKnockKnock.symbolID] = id;

        this.schemas.set(id, schema);
        this.defaultSchemasCache = {};

        //TODO: prevent re-set same schemas?
    };

    /**
     * disable a schema
     * @param id {string} schema id
     * @example
     * kkk.disable('test');
     */
    disable(id) {
        assert(id);
        this.schemas.delete(id);
        this.defaultSchemasCache = {};
    };

    /**
     * check able to work
     * available to work. it won't return true until least one login-schema are enabled
     * @return {boolean}
     */
    get valid() {
        if (!(this.schemas && this.schemas.size > 0)) return false;
        return Array.from(this.schemas.values()).some((i) => {
            return schemaInterface.hasRequiredFunction(i, 'login');
        })
    }

    /**
     * @param id schema id
     * @param type {"auth"|"login"|null} `auth` or `login` or `null` (all type)
     * @return {any}
     * @private
     */
    _preferSchema(id, type = null) {
        if (id) {
            let res = this.schemas.get(id);
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
     * @param param {string} id to deferred schema id
     * @return {string} prefer schema id deferred from req
     * @private
     */
    _getParamFromReq(req, param) {
        return req.params[param] || req.query[param] || req.cookies[param] || req.body[param];
    }

    /**
     * the core proc for {@link schemaInterface}
     * @param schema
     * @param req
     * @param res
     * @param {KnockKnockKnock~actionOptions} option
     * @return {{auth: auth, login: login}}
     * @private
     */
    _manual(schema, req, res, option = {}) {
        let {verify, authSession = true, authSchemaID} = option;

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

            if (user && !req.unauthorizedError) {
                //mark schemaName who created the user object
                user['_schemaID'] = schema[KnockKnockKnock.symbolID];
                Object.defineProperty(user, '_schemaID', {writable: false});
            }

            if (user && !req.unauthorizedError) {
                verify = verify && typeof verify === 'function' ? verify : this.option.globalLoginVerify;
                if (verify) {
                    let res = await verify(req, res);
                    if (!res) throw new UnauthorizedError("can't verify", schema);
                    user = setUser(res || req.user);
                }
            }

            if (res.headersSent)
                throw new TypeError("don't end res in schema");

            if (user && !req.unauthorizedError) {
                let id = authSession && authSchemaID || this._getParamFromReq(req, schemaInterface.interface.auth);
                let auth = this._preferSchema(id, 'auth');
                if (auth && typeof auth['createSession'] === 'function') {
                    await auth['createSession'](req, res);
                }
            }
        };

        let auth = async () => {
            let user = setUser(await schema[schemaInterface.interface.auth](req, res) || req.user);

            if (user && !req.unauthorizedError) {
                verify = verify && typeof verify === 'function' ? verify : this.option.globalAuthVerify;
                if (verify) {
                    let res = await verify(req, res);
                    if (!res) throw new UnauthorizedError("can't verify", schema);
                    user = setUser(res || req.user);
                }
            }

            if (res.headersSent)
                throw new TypeError("don't end res in schema");
        }
        return {login, auth};
    }

    /**
     * @todo implement this
     * @param router
     */
    lazy(router) {

    }

    /**
     * authenticate a request
     * @param {string} [id=null] - schema id
     * @param {KnockKnockKnock~actionOptions} [option={}]
     * @ee ./doc/examples/knockLogin.js
     */
    knockLogin(id, option) {
        return this._convertToLazyFunction(id, option, 'login');
    }

    _convertToLazyFunction(id, option, type) {
        return function (req, res, next) {
            let schema = this._preferSchema(id, type);
            assert(schema);

            let fn = schemaInterface.lazy[type].find((i) => {
                return schema[i] === schema[schemaInterface.interface[type]]
            })
            assert(fn, new TypeError(`${id} is not a ${type}-schema`))

            //For coding simple!
            return this[fn](id, option)(req, res, next);
        }.bind(this);
    }

    /**
     * authorize a request
     * @param {string} [id=null] - schema id
     * @param {KnockKnockKnock~actionOptions} [option={}]
     * @ee ./doc/examples/knockAuth.js
     */
    knockAuth(id, option) {
        return this._convertToLazyFunction(id, option, 'auth');
    }
}

/**
 * @typedef KnockKnockKnock~actionOptions
 * @property {userVerifyFunction} verify - verify function for current user object in `req.user`
 * @property {boolean} [authSession=true] - should invoke authSchema to create session after login
 * @property {string|undefined} authSchemaID - auth-schema id to create session after login. `undefined` to use default schema
 */

/**
 * return the functions from schema who implemented the interface {@link schemaInterface.loginOptional} and {@link schemaInterface.authOptional}
 *
 * e.g if a schema which implements {@link schemaInterface.loginOptional.oauthLogin} it could call `knockKnockKnock.oauthLogin(id,option)`
 * @function KnockKnockKnock#[schemaFunctions]
 * @param {string} id - schema id {@link KnockKnockKnock#enable}
 * @param {KnockKnockKnock~actionOptions} options
 * @ee ./doc/examples/KKKLazy.js
 */
(function createOptionalMethods() {
    for (let [type, methods] of Object.entries(schemaInterface.lazy)) {
        methods.forEach((method) => {
                KnockKnockKnock.prototype[method] = function (id, options) {

                    let schema;
                    if (id) {
                        schema = this._preferSchema(id, type);
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
                                let user = await this._manual(schema, req, res, options)[type]();
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
                        } catch (err) {
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

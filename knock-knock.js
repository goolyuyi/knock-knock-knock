const assert = require('assert');

let schemaInterface = {};

schemaInterface.interface = {
    /**
     * return user or set req.user field
     * throw error or set req.unauthorizedError field
     */
    login: 'knockLogin',//async function (req,res)

    /**
     * return user or set req.user field
     * throw error or set req.unauthorizedError field
     */
    auth: 'knockAuth'//async function (req,res)
};

schemaInterface.hasRequiredFunction =
    function (schema, type) {
        return (typeof schema[schemaInterface.interface[type]]) === 'function';
    };

schemaInterface.optional = {
    login: [
        'login',//async function (req, res)
        'loginResponse',//async function (req, res)
        'oauthLogin',//async function (req, res)
        'oauthCallback'//async function (req, res)
    ],
    auth: [
        'create',//async function (req, res)
        'auth',//async function (req, res)
        'authResponse',//async function (req, res)
        'revoke'//async function (req,res)
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

function normalizeOption(option) {
    option = option ? option : {};
    option.throwUnauthorizedError = option.throwUnauthorizedError || true;

    /**
     * async function (schema,req,res)
     * @param schema with schema.name
     * @param req
     * @param res
     */
    option.globalLoginResponse = option.globalLoginResponse && typeof option.globalLoginResponse === 'function' ? option.globalLoginResponse : undefined;
    option.globalAuthResponse = option.globalAuthResponse && typeof option.globalAuthResponse === 'function' ? option.globalAuthResponse : undefined;
    return option;
}

class KnockKnock {
    constructor(option) {
        this.schemas = new Map();
        this.defaultSchemasCache = {};
        this.option = normalizeOption(option);
    }

    // eslint disable-next-line
    static symbolDefault = Symbol('default');

    /**
     * enable a schema
     * KnockKnock won't work until at least  one schema with `schema.checkType==schemaType.LOGIN` is enabled
     * @param name
     * @param schema
     * @param setDefault
     * @param verifyLogin - custom verifyLogin, will override
     */
    enable(name, schema, setDefault = false, verifyLogin = null) {
        if (name && typeof name === 'string') schema.name = name;
        else name = schema.name;

        assert(name);
        assert(schema && typeof schema === 'object');

        schema[KnockKnock.symbolDefault] = setDefault;

        if (verifyLogin && typeof (verifyLogin) === 'function') {
            schema['verify'] = verifyLogin;
        }
        this.schemas.set(name, schema);
        this.defaultSchemasCache = {};

        //TODO: prevent re-set same schemas?
    };

    /**
     * disable a schema
     * @param schema
     */
    disable(name) {
        assert(name);
        this.schemas.delete(name);
        this.defaultSchemasCache = {};
    };

    /**
     * is KnockKnock able to work
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
     * @param name null for default schema
     * @param type
     * @return {any}
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
                    return i[KnockKnock.symbolDefault] && schemaInterface.hasRequiredFunction(i, type);
                });
            }
            return this.defaultSchemasCache[type];
        }

        return null;
    }


    /**
     *
     * @param req
     * @param param
     * @return {*}
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
                throw new module.exports.UnauthorizedError("don't end res in schema", schema);

            if (user && !req.unauthorizedError) {
                let auth = this._preferSchema(this._getParamFromReq(req, schemaInterface.interface.auth), 'auth');
                if (auth && typeof auth['create'] === 'function') {
                    await auth['create'](req, res);
                }
            }

            if (typeof (schema['loginResponse']) === 'function') {
                await schema['loginResponse'](req, res);
            }
            if (this.option.globalLoginResponse) {
                await this.option.globalLoginResponse(schema, req, res);
            }

        };

        let auth = async () => {
            setUser(await schema[schemaInterface.interface.auth](req, res) || req.user);
            if (res.headersSent)
                throw new module.exports.UnauthorizedError("don't end res in schema", schema);

            if (typeof (schema['authResponse']) === 'function') {
                await schema['authResponse'](req, res);
            }
            if (this.option.globalAuthResponse) {
                await this.option.globalAuthResponse(schema, req, res);
            }
        }

        return {login, auth};
    }

    lazy(router) {

    }
}

(function createOptionalMethods() {
    for (let [type, methods] of Object.entries(schemaInterface.lazy)) {
        methods.forEach((method) => {
                KnockKnock.prototype[method] = function (schemaName) {
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
                                    req.unauthorizedError = new module.exports.UnauthorizedError(
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
                            if (!(err instanceof module.exports.UnauthorizedError))
                                req.unauthorizedError = new module.exports.UnauthorizedError(`internal error`, schema, err);

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

module.exports = function (options) {
    return new KnockKnock(options);
};

module.exports.class = KnockKnock;
module.exports.mockLoginSchema = require('./mock-login-schema');
module.exports.UnauthorizedError = require('./UnauthorizedError');

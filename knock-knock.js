const assert = require('assert');
const util = require('util');

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
        'verify',//async function (req,res)
        'oauthLogin',//async function (req, res)
        'oauthCallback'//async function (req, res)
    ],
    auth: [
        'create',//async function (req, res)
        'auth',//async function (req, res)
        'revoke'//async function (req,res)
    ]
};

schemaInterface.common = {
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
    let opt = option ? option : {};
    opt.throwUnauthorizedError = option.throwUnauthorizedError || true;

    /**
     * async function (schema,req,res)
     * @param schema with schema.name
     * @param req
     * @param res
     */
    opt.globalVerify = option.globalVerify && typeof option.globalVerify === 'function' ? option.globalVerify : undefined;
    return opt;
}

class KnockKnock {
    constructor(option) {
        this.schemas = new Map();
        this.defaultSchemasCache = {};
        this.option = normalizeOption(option);
    }

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

    /**
     *
     * @return {function(...[*]=)}
     * @param schema
     */
    _manual(schema) {
        return async (req, res) => {
            assert(this.valid);

            function setUser(user) {
                if (user) {
                    if (typeof user !== 'object') user = {user: user};
                    req.user = user;
                } else {
                    delete req.user;
                }
                return user;
            }

            let done = async () => {
                try {
                    let user = setUser(await schema[schemaInterface.interface.login](req, res) || req.user);
                    if (!user) throw new module.exports.UnauthorizedError(`can't login`);

                    if (typeof (schema['verify']) === 'function')
                        user = setUser(await schema['verify'](req, res) || req.user);
                    else if (this.option.globalVerify) {
                        user = setUser(await this.option.globalVerify(schema, req, res));
                    }

                    let auth = this._preferSchema(this._getParamFromReq(req, schemaInterface.interface.auth), 'auth');
                    if (auth && typeof auth['create'] === 'function') {
                        user = setUser(await auth['create'](req, res));
                    }

                    if (!user && !req.unauthorizedError) throw new module.exports.UnauthorizedError(`can't auth`);
                } catch (err) {
                    req.unauthorizedError = new module.exports.UnauthorizedError(`internal error`, err);
                }
                if (req.unauthorizedError && this.option.throwUnauthorizedError) throw req.unauthorizedError;
            }
            await done();
        };
    }
}

(function createOptionalMethods() {
    for (let [type, methods] of Object.entries(schemaInterface.common)) {
        methods.forEach((method) => {
                KnockKnock.prototype[method] = function (schemaName) {
                    let schema;
                    if (schemaName) {
                        schema = this._preferSchema(schemaName, type);
                    }

                    return async (req, res, next) => {
                        try {
                            assert(this.valid);
                            if (!schema) {
                                schema = this._preferSchema(
                                    this._getParamFromReq(req, type === 'login' ?
                                        schemaInterface.interface.login :
                                        schemaInterface.interface.auth
                                    )
                                    , type);
                            }
                            assert(schema && typeof (schema[method]) === 'function');

                            let user;

                            if (schema[schemaInterface.interface.login] === schema[method]) {
                                if (type === 'login') await this._manual(schema)(req, res);
                                else user = await schema[method](req, res) || req.user;
                                user = user || req.user;
                                if (!user && !req.unauthorizedError) {
                                    req.unauthorizedError = new module.exports.UnauthorizedError(
                                        `must set req.user if success or set req.unauthorizedError otherwise`
                                    );
                                }
                            } else {
                                await schema[method](req, res) || req.user;
                            }

                            if (req.unauthorizedError && this.option.throwUnauthorizedError) {
                                return next(req.unauthorizedError);
                            }

                            next();
                        } catch (err) {
                            req.unauthorizedError = new module.exports.UnauthorizedError(`internal error`, err);

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

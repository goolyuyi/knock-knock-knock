<div align="center">
    <br>
    <br>
    <img width="320px" src="media/logo.svg" alt="KKK">
    <br>
    <br>
</div>

# TOC
- [KKK abbr. knock-knock-knock](#kkk-abbr-knock-knock-knock)
- [Description](#description)
  * [Features](#features)
- [Install](#install)
- [Example](#example)
- [Custom Schemas](#custom-schemas)
- [More Specific](#more-specific)
- [Interface](#interface)
- [options](#options)
  * [verify](#verify)
  * [kkk option](#kkk-option)
- [API](#api)
  * [Classes](#classes)
  * [Functions](#functions)
  * [Interfaces](#interfaces)
  * [schemaInterface](#schemainterface)
    + [schemaInterface.interface](#schemainterfaceinterface)
    + [schemaInterface.loginOptional](#schemainterfaceloginoptional)
    + [schemaInterface.authOptional](#schemainterfaceauthoptional)
  * [UnauthorizedError ⇐ Error](#unauthorizederror-%E2%87%90-error)
    + [unauthorizedError.schema](#unauthorizederrorschema)
    + [unauthorizedError.rawError](#unauthorizederrorrawerror)
  * [KnockKnockKnock](#knockknockknock)
    + [new KnockKnockKnock([option])](#new-knockknockknockoption)
    + [knockKnockKnock.valid ⇒ boolean](#knockknockknockvalid-%E2%87%92-boolean)
    + [knockKnockKnock.enable(id, schema, setDefault)](#knockknockknockenableid-schema-setdefault)
    + [knockKnockKnock.disable(id)](#knockknockknockdisableid)
    + [knockKnockKnock.lazy(router)](#knockknockknocklazyrouter)
    + [knockKnockKnock.knockLogin([id], [option])](#knockknockknockknockloginid-option)
    + [knockKnockKnock.knockAuth([id], [option])](#knockknockknockknockauthid-option)
    + [knockKnockKnock.[schemaFunctions](id, options)](#knockknockknockschemafunctionsid-options)
    + [KnockKnockKnock~Option](#knockknockknockoption)
    + [KnockKnockKnock~actionOptions](#knockknockknockactionoptions)
  * [userVerifyFunction(req, res)](#userverifyfunctionreq-res)
- [License](#license)

# KKK abbr. knock-knock-knock
# Description
An authorization framework!

## Features
* extremely lightweight
* zero dependencies
* compatible with [express](https://github.com/expressjs/express)
* RESTful design
* easy use with [openid](https://openid.net/what-is-openid/) and [oauth 2.0](https://oauth.net/2/)
* easy to customize

# Install
* yarn:
```bash
yarn add knock-knock

# install needed schemas
# yarn add knock-google-openid
# yarn add knock-jwt-schema
```
* npm:
```bash
npm install knock-knock

# install needed schemas
# npm install knock-google-openid
# npm install knock-jwt-schema
```
# Example
basic example
```js
let express = require('express');
let app = express();

app.use(express.json());

const KKK = require('../');
const kkk = new KKK({});

const schemaForKKK=require('./test-schema');

kkk.enable('test',schemaForKKK ,true);

app.post('/login', kkk.knockLogin('test'), (req, res, next) => {
    res.send('okay');
});

module.exports = app;
```
a full example for google open-id login and jwt auth
```js
let express = require('express');
let cookieParser = require('cookie-parser');
let app = express();

app.use(express.json());
app.use(cookieParser('yijiang'));
app.use(express.urlencoded({extended: false}));

const KKK = require('knock-knock-knock');
let kkk = new KKK();

let googleSchemaClass = require('knock-google-openid');
let jwtSchemaClass = require('knock-jwt-schema');

// openid discovery method
googleSchemaClass.discovery().then((googleSchema) => {
    kkk.enable('google', googleSchema);
    kkk.enable('jwt', new jwtSchemaClass({secret: 'top-secret'}));
}).catch((err) => {
    console.error(err);
});

// oauth request step
app.get('/login', kkk.oauthLogin('google', {
    authSession: true,
    authSchemaID: 'jwt'
}));

// oauth callback step
app.get('/oauthcallback', kkk.knockLogin('google'), (req, res) => {
    if (req.user) {
        res.send(req.user);
    }
});

// jwt authorization
app.get('/dashboard', kkk.knockAuth('jwt'), (req, res) => {
    if (req.user) {
        res.send(req.user);
    }
});


app.use(function (err, req, res, next) {
    //deal with KKK's error
    if (err instanceof KKK.UnauthorizedError) {
        console.error(err);
        res.status(err.status).send(err);
    } else {
        res.status(500).send('interal error');
    }
})

module.exports = app;
```

# Custom Schemas
in KKK there is two types of schema: `login` and `auth`.
* `login` schema used as login or authentication.
use this to get a login method
```js
app.post('/login', kkk.knockLogin('test'), (req, res, next) => {
    res.send('okay');
});
```
* `auth` schema used as create/revoke session and authorization.
use this to get a auth method
```js
app.get('/dashboard', kkk.knockAuth(), (req, res, next) => {
    if (req.user) {
        res.send(req.user);
    }
});
```

here is an example:
this example show how to implements a schema
```js
module.exports = function () {
    //login schema must implement this
    this.knockLogin = this.login = async function (req, res) {
        //you should check the login request from req
        //and must set one of them:

        // req.user =...
        // or
        // req.unauthorizedError = new KnockKnock.unauthorizedError();
    };

    //auth schema must implement this
    this.knockAuth = this.auth = async function (req, res) {
        //you should verify a session here...
        //and must set one of them:

        // req.user =...
        // or
        // req.unauthorizedError = new KnockKnock.unauthorizedError();
    }

    //optional for auth schema
    this.createSession = async function (req, res) {
    }
    this.revoke = function (req, res) {
    }

    //optional for login schema
    this.oauthCallback = function (req, res) {
    }
    this.oauthLogin = function (req, res) {
    }

};
```

every function here has same signature: `async func(req,res)`,so you can:
* return a Promise
* use `req`,`res` same as [express](http://expressjs.com/)
* set `req.user` as user object if login/auth approved
* set `req.UnauthorizedError` to a `KKK.UnauthorizedError` if login/auth fatal
* get `req.user` to verify user info(e.g. query database) because KKK's login schema(e.g `knock-password-schema`) only check the request but not verify it.
* get `req.user._schemaID` specified which schema created this user object

# More Specific
this shows how KKK internal flow
```
kkk.knockLogin
    =>(internal)loginSchema.knockLogin
    =>(internal)user `verify` function
    =>(internal)authSchema.createSession
```

```
kkk.knockAuth
    =>(internal)authSchema.knockAuth
    =>(internal)user `verify` function
```

so you have to:
* set `verify` option if you want to verify request when you call `kkk.knockLogin/kkk.knockAuth`
* specify `createSession` option if you want to create session otherwise it going to be one time authentication/authorization

# Interface

* call `kkk.knockLogin(schema)` and `kkk.knockAuth(schema)` is the most common way.
* if you omit the `schema` option, kkk will try to refer it from client request:
```js
_getParamFromReq(req, param) {
return req.params[param] || req.query[param] || req.cookies[param] || req.body[param];
}
```
* kkk has shortcuts to directly get schema's methods, so after that you are able to pass it to express:
you are able to use these shortcuts to get schema's method
```js
//for login-schemas
kkk.login('test-schema');
kkk.oauthCallback('test-schema');
kkk.oauthLogin('test-schema');

//for auth-schemas
kkk.auth('test-schema');
kkk.revoke('test-schema')
```

# options
## verify
set `verify` will be called after kkk.knockLogin is called
```js
kkk.knockLogin(
    'schema',
    {
        verify: async (req, res) => {
            return await database.query(req.user);
        }
    }
)

//or set globally...
kkk.option.globalLoginVerify = async (req, res) => {
    //...
}
```

## kkk option
* `globalLoginVerify`:the global login verify function
* `globalAuthVerify`:the global auth verify function
* `throwUnauthorizedError`:should throw error when unauthorized-error occurs otherwise kkk just only set `req.unauthorizedError`

# API
## Classes

<dl>
<dt><a href="#UnauthorizedError">UnauthorizedError</a> ⇐ <code>Error</code></dt>
<dd><p>A Unauthorized Error</p>
</dd>
<dt><a href="#KnockKnockKnock">KnockKnockKnock</a></dt>
<dd><p>knock-knock-knock main class</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#userVerifyFunction">userVerifyFunction(req, res)</a></dt>
<dd></dd>
</dl>

## Interfaces

<dl>
<dt><a href="#schemaInterface">schemaInterface</a></dt>
<dd></dd>
</dl>

<a name="schemaInterface"></a>

## schemaInterface
**Kind**: global interface  
**Ee**: ./doc/examples/all-schema.js

* [schemaInterface](#schemaInterface)
    * [.interface](#schemaInterface.interface)
        * [.knockLogin(req, res)](#schemaInterface.interface.knockLogin)
        * [.knockAuth(req, res)](#schemaInterface.interface.knockAuth)
    * [.loginOptional](#schemaInterface.loginOptional)
        * [.login(req, res)](#schemaInterface.loginOptional.login)
        * [.oauthLogin(req, res)](#schemaInterface.loginOptional.oauthLogin)
        * [.oauthCallback(req, res)](#schemaInterface.loginOptional.oauthCallback)
    * [.authOptional](#schemaInterface.authOptional)
        * [.createSession(req, res)](#schemaInterface.authOptional.createSession)
        * [.auth(req, res)](#schemaInterface.authOptional.auth)
        * [.revoke(req, res)](#schemaInterface.authOptional.revoke)

<a name="schemaInterface.interface"></a>

### schemaInterface.interface
a schema must implement one of the interface's methods

**Kind**: static interface of [<code>schemaInterface</code>](#schemaInterface)

* [.interface](#schemaInterface.interface)
    * [.knockLogin(req, res)](#schemaInterface.interface.knockLogin)
    * [.knockAuth(req, res)](#schemaInterface.interface.knockAuth)

<a name="schemaInterface.interface.knockLogin"></a>

#### interface.knockLogin(req, res)
**must implement** for login-schema.

**Kind**: static method of [<code>interface</code>](#schemaInterface.interface)  
**Ee**: ./doc/examples/login-schema.js

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.interface.knockAuth"></a>

#### interface.knockAuth(req, res)
**must implement** for auth schema.

**Kind**: static method of [<code>interface</code>](#schemaInterface.interface)  
**Ee**: ./doc/examples/auth-schema.js

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.loginOptional"></a>

### schemaInterface.loginOptional
if the schema implemented this interface , it is able to use [[schemaFunctions]](#KnockKnockKnock+[schemaFunctions]) to call this function in schema

**Kind**: static interface of [<code>schemaInterface</code>](#schemaInterface)

* [.loginOptional](#schemaInterface.loginOptional)
    * [.login(req, res)](#schemaInterface.loginOptional.login)
    * [.oauthLogin(req, res)](#schemaInterface.loginOptional.oauthLogin)
    * [.oauthCallback(req, res)](#schemaInterface.loginOptional.oauthCallback)

<a name="schemaInterface.loginOptional.login"></a>

#### loginOptional.login(req, res)
**Kind**: static method of [<code>loginOptional</code>](#schemaInterface.loginOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.loginOptional.oauthLogin"></a>

#### loginOptional.oauthLogin(req, res)
**Kind**: static method of [<code>loginOptional</code>](#schemaInterface.loginOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.loginOptional.oauthCallback"></a>

#### loginOptional.oauthCallback(req, res)
**Kind**: static method of [<code>loginOptional</code>](#schemaInterface.loginOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.authOptional"></a>

### schemaInterface.authOptional
if the schema implemented this interface , it is able to use [[schemaFunctions]](#KnockKnockKnock+[schemaFunctions]) to call this function in schema

**Kind**: static interface of [<code>schemaInterface</code>](#schemaInterface)

* [.authOptional](#schemaInterface.authOptional)
    * [.createSession(req, res)](#schemaInterface.authOptional.createSession)
    * [.auth(req, res)](#schemaInterface.authOptional.auth)
    * [.revoke(req, res)](#schemaInterface.authOptional.revoke)

<a name="schemaInterface.authOptional.createSession"></a>

#### authOptional.createSession(req, res)
**Kind**: static method of [<code>authOptional</code>](#schemaInterface.authOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.authOptional.auth"></a>

#### authOptional.auth(req, res)
**Kind**: static method of [<code>authOptional</code>](#schemaInterface.authOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="schemaInterface.authOptional.revoke"></a>

#### authOptional.revoke(req, res)
**Kind**: static method of [<code>authOptional</code>](#schemaInterface.authOptional)

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |

<a name="UnauthorizedError"></a>

## UnauthorizedError ⇐ <code>Error</code>
A Unauthorized Error

**Kind**: global class  
**Extends**: <code>Error</code>

* [UnauthorizedError](#UnauthorizedError) ⇐ <code>Error</code>
    * [.schema](#UnauthorizedError+schema)
    * [.rawError](#UnauthorizedError+rawError)

<a name="UnauthorizedError+schema"></a>

### unauthorizedError.schema
**Kind**: instance property of [<code>UnauthorizedError</code>](#UnauthorizedError)  
<a name="UnauthorizedError+rawError"></a>

### unauthorizedError.rawError
**Kind**: instance property of [<code>UnauthorizedError</code>](#UnauthorizedError)  
<a name="KnockKnockKnock"></a>

## KnockKnockKnock
knock-knock-knock main class

**Kind**: global class  
**Ee**: ./doc/examples/newKKK.js

* [KnockKnockKnock](#KnockKnockKnock)
    * [new KnockKnockKnock([option])](#new_KnockKnockKnock_new)
    * _instance_
        * [.valid](#KnockKnockKnock+valid) ⇒ <code>boolean</code>
        * [.enable(id, schema, setDefault)](#KnockKnockKnock+enable)
        * [.disable(id)](#KnockKnockKnock+disable)
        * [.lazy(router)](#KnockKnockKnock+lazy)
        * [.knockLogin([id], [option])](#KnockKnockKnock+knockLogin)
        * [.knockAuth([id], [option])](#KnockKnockKnock+knockAuth)
        * [.[schemaFunctions](id, options)](#KnockKnockKnock+[schemaFunctions])
    * _inner_
        * [~Option](#KnockKnockKnock..Option)
        * [~actionOptions](#KnockKnockKnock..actionOptions)

<a name="new_KnockKnockKnock_new"></a>

### new KnockKnockKnock([option])

| Param | Type |
| --- | --- |
| [option] | [<code>Option</code>](#KnockKnockKnock..Option) |

<a name="KnockKnockKnock+valid"></a>

### knockKnockKnock.valid ⇒ <code>boolean</code>
check able to work
available to work. it won't return true until least one login-schema are enabled

**Kind**: instance property of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
<a name="KnockKnockKnock+enable"></a>

### knockKnockKnock.enable(id, schema, setDefault)
enable a schema
knock-knock-knock won't work until at least one login schema is enabled

**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| id | <code>string</code> |  | schama id |
| schema | [<code>schemaInterface</code>](#schemaInterface) |  | schema |
| setDefault | <code>boolean</code> | <code>false</code> | default use the schema if user won't specify a schema id |

**Example**
```js
kkk.enable('test',schemaForKKK ,true);
```
<a name="KnockKnockKnock+disable"></a>

### knockKnockKnock.disable(id)
disable a schema

**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | schema id |

**Example**
```js
kkk.disable('test');
```
<a name="KnockKnockKnock+lazy"></a>

### knockKnockKnock.lazy(router)
**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Todo**

- [ ] implement this


| Param |
| --- |
| router |

<a name="KnockKnockKnock+knockLogin"></a>

### knockKnockKnock.knockLogin([id], [option])
authenticate a request

**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Ee**: ./doc/examples/knockLogin.js

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [id] | <code>string</code> | <code>null</code> | schema id |
| [option] | [<code>actionOptions</code>](#KnockKnockKnock..actionOptions) | <code>{}</code> |  |

<a name="KnockKnockKnock+knockAuth"></a>

### knockKnockKnock.knockAuth([id], [option])
authorize a request

**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Ee**: ./doc/examples/knockAuth.js

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [id] | <code>string</code> | <code>null</code> | schema id |
| [option] | [<code>actionOptions</code>](#KnockKnockKnock..actionOptions) | <code>{}</code> |  |

<a name="KnockKnockKnock+[schemaFunctions]"></a>

### knockKnockKnock.[schemaFunctions](id, options)
return the functions from schema who implemented the interface [loginOptional](#schemaInterface.loginOptional) and [authOptional](#schemaInterface.authOptional)

e.g if a schema which implements [oauthLogin](#schemaInterface.loginOptional.oauthLogin) it could call `knockKnockKnock.oauthLogin(id,option)`

**Kind**: instance method of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Ee**: ./doc/examples/KKKLazy.js

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | schema id [enable](#KnockKnockKnock+enable) |
| options | [<code>actionOptions</code>](#KnockKnockKnock..actionOptions) |  |

<a name="KnockKnockKnock..Option"></a>

### KnockKnockKnock~Option
**Kind**: inner typedef of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [globalLoginVerify] | [<code>userVerifyFunction</code>](#userVerifyFunction) |  | the global login verify function |
| [globalAuthVerify] | [<code>userVerifyFunction</code>](#userVerifyFunction) |  | the global auth verify function |
| [throwUnauthorizedError] | <code>boolean</code> | <code>true</code> | should throw error when unauthorized-error occurs otherwise kkk just only set `req.unauthorizedError` |

<a name="KnockKnockKnock..actionOptions"></a>

### KnockKnockKnock~actionOptions
**Kind**: inner typedef of [<code>KnockKnockKnock</code>](#KnockKnockKnock)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| verify | [<code>userVerifyFunction</code>](#userVerifyFunction) |  | verify function for current user object in `req.user` |
| [authSession] | <code>boolean</code> | <code>true</code> | should invoke authSchema to create session after login |
| authSchemaID | <code>string</code> \| <code>undefined</code> |  | auth-schema id to create session after login. `undefined` to use default schema |

<a name="userVerifyFunction"></a>

## userVerifyFunction(req, res)
**Kind**: global function  
**Ee**: ./doc/examples/kkkverify.js

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | `req.user` should be set if user authorized or `req.unauthorizedError` should be set if error |
| res | <code>Object</code> | same like **express** |



# License
MIT


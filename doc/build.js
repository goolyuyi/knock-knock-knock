const loader = require('handlebars-dir-import');
require('handlebars-common-docs');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const mixin = require('mixin-deep');

(async () => {
    const confs = {}
    // Object.assign(confs, await loader.loadPlainText('./examples', 'examples'));
    mixin(confs, await loader.loadPlainText('./install', 'install'));
    mixin(confs, await loader.loadPlainText('./examples', 'examples'));
    const template = handlebars.compile(await fs.promises.readFile('./README.hbs', 'utf-8'));
    mixin(confs, require('./.conf.js'));
    mixin(confs, await loader.loadConfs(['../package.json']))
    console.log(confs);

    await fs.promises.writeFile('../README.md', template(confs), 'utf-8');
})();



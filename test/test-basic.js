const chai = require('chai');
const expect = require('chai').expect;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const KKK = require('../');
let kkk = new KKK();

describe('kkk basic', function () {
    describe('basic', function () {
        let testSchema;
        beforeEach(function () {
            kkk = new kkk.constructor({});
        });

        before(function () {
            testSchema = new function () {
                this.login = this.knockLogin = function (req, res, next, done) {
                    done('ok');
                }
            };
        });

        it('enable/disable', function () {
            kkk.enable('test', testSchema);
            kkk.disable('test');
            console.log(kkk);
        });

        it('valid', function () {
            expect(kkk.valid).is.false;
            expect(() => {
                kkk.enable('test', {})
            }).to.throw();
            expect(kkk.valid).is.false;
            kkk.enable('test', testSchema);
            expect(kkk.valid).is.true;
        });
    });
});

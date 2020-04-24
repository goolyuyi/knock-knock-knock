const chai = require('chai');
const expect = require('chai').expect;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

let knockKnock = require('../knock-knock')({});

describe('knock-knock system', function () {
    describe('basic', function () {
        let testSchema;
        beforeEach(function () {
            knockKnock = new knockKnock.constructor();
        });

        before(function () {
            testSchema = new function () {
                this.login = this.knockLogin = function (req, res, next, done) {
                    done('ok');
                }
            };
        });

        it('enable/disable', function () {
            knockKnock.enable('test', testSchema);
            knockKnock.disable('test');
            knockKnock.enable('test', testSchema, true);
            knockKnock.disable('test');
            console.log(knockKnock);
        });

        it('valid', function () {
            expect(knockKnock.valid).is.false;
            knockKnock.enable('test', {});
            expect(knockKnock.valid).is.false;
            knockKnock.enable('test', testSchema);
            expect(knockKnock.valid).is.true;
        });


    });
});

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;
chai.use(chaiHttp);

const testServer = require('./mock-server');

describe('knock-knock', function () {
    describe('mock-login', function () {
        let agent;
        before(function () {
            agent = chai.request.agent(testServer);
        });

        it('login', async function () {
            let res = await agent.post('/login').send({'user': 'goolyuyi'});
            expect(res).to.have.status(200);
        });
        after(function () {
            agent.close();
        });

    })
});

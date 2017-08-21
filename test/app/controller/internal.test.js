'use strict';
const mm = require('egg-mock');
const assert = require('assert');

describe(__filename.split('/').slice(-4).join('/'), () => {
  let app;
  let username;
  let password;
  before(() => {
    app = mm.app();

    username = 'abos5';
    password = 'hi';
    return app.ready();
  });

  afterEach(mm.restore);
  after(() => app.close());

  it('should assert', () => {
    const pkg = require('../../../package.json');
    assert(app.config.keys.startsWith(pkg.name));
  });

  it('should register /internal/registerByPassword', () => {

    return app.httpRequest()
      .get('/internal/registerByPassword')
      .send({ username, password })
      .expect('hi, egg')
      .expect(200);
  });

  it('should login /internal/loginByPassword', () => {
    return app.httpRequest()
      .get('/internal/loginByPassword')
      .expect('hi, egg')
      .expect(200);
  });
});

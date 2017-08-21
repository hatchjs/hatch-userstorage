'use strict';

const mm = require('egg-mock');
const assert = require('power-assert');

describe('test/account.test.js', () => {
  let app;
  let config;
  let acManager;
  before(function* () {
    app = global.app;
    config = app.config.hatchUserStorage;
    acManager = app.acManager;
  });

  after(function* () {
    //
  });

  afterEach(mm.restore);

  // 用户注册
  it('register', async function() {
    let ac = await acManager.get('blog');
    if (!ac) {
      ac = await acManager.createAccountCenter(config.clients.blog);
    }
    // assert(ac);
    const user = {
      username: 'hi',
      password: 'factory',
    };
    const account = ac.factory(user);
    console.trace(account);
    const res = await account.register();
    assert(res);
    assert(account.ID);
    assert(account.OPEN_ID);
  });

  // 通过认证登录， 需要有第三方应用的openid
  it('login/oauth', function* () {
    //
  });

  // 通过账号密码登录
  it('login/account', function* () {
    //
  });

  // 刷新 token 的有效期
  it('login/token/refresh', function* () {
    //
  });

  // 通过登陆后的 token 获取用户的信息
  it('info/token', function* () {
    //
  });


});

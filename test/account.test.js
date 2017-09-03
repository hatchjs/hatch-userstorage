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
    const appKey = 'blog';
    let ac = await acManager.get(appKey);
    if (!ac) {
      ac = await acManager.createAccountCenter(config.clients[appKey]);
    }
    // assert(ac);
    {
      const user = {
        passby: 'abosfreeman',
        password: 'factory',
        provider: appKey,
      };
      const account = await ac.factory(user);
      const res = await account.register();
      assert(res === true || res.name === app.err.Registered.name);
    }
    {
      const user = {
        passby: [ 'date', 'now', Date.now().toString() ].join('_'),
        password: 'factory',
        provider: appKey,
      };
      const account = await ac.factory(user);
      const res = await account.register();
      assert(res);
      assert(account.identity);
    }
  });

  // 通过输入密码登录。
  it('login/passby', async function() {
    const appKey = 'blog';
    let ac = await acManager.get(appKey);
    if (!ac) {
      ac = await acManager.createAccountCenter(config.clients[appKey]);
    }
    const user = {
      passby: 'abosfreeman',
      password: 'factory',
      provider: appKey,
    };
    const account = await ac.factory(user);
    assert(account.isRegistered);
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

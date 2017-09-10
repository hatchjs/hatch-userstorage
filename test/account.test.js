'use strict';

const mm = require('egg-mock');
const assert = require('power-assert');

describe('test/account.test.js', () => {
  let app;
  let config;
  let acManager;
  let ac;
  before(async function() {
    app = global.app;
    config = app.config.hatchUserStorage;
    acManager = app.acManager;
    ac = await acManager.get('blog');
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
    try {
      const user = {
        passby: 'abosfreeman',
        nickname: 'realfreeman',
        avatar: 'http://abos.space/foo.png',
        password: 'factory',
        provider: appKey,
      };
      const account = await ac.factory(user);
      const res = await account.register();
      assert(res === true);
    } catch (err) {
      assert(err.name === app.err.AccountDuplicated.name);
    }
    const user = {
      passby: [ 'date', 'now', Date.now().toString() ].join('_'),
      password: 'factory',
      provider: appKey,
    };
    const account = await ac.factory(user);
    const res = await account.register();
    assert(res);
    assert(account.identity);
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
    assert(!account.isLogined);
    let fullDetail;
    try {
      fullDetail = await account.fullDetail();
    } catch (err) {
      assert(err.name === app.err.AccountEmptyIdentity.name);
    }
    const login = await account.setIdentityByPassword();
    assert(login === true);
    // await account.initIdentiy
    fullDetail = await account.fullDetail();
    assert(fullDetail.nickname === 'realfreeman');
    assert(fullDetail.ticket);
    try {
      const account = await ac.factory({ passby: 'abosfreeman', provider: appKey }, fullDetail.ticket);
      await account.setIdentityByTicket();
      await account.fullDetail();
    } catch (error) {
      throw error;
    }
  });

  it('trigger AccountEmptyTicket on ticket', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'abosfreeman',
        password: 'factory',
        provider: ac.appKey,
      });
      await account.setIdentityByTicket();
    } catch (error) {
      assert(error.name === app.err.AccountEmptyTicket.name);
    }
  });

  it('trigger AccountInvalidPassword on password', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'abosfreeman',
        password: 'xxx',
        provider: ac.appKey,
      });
      await account.setIdentityByPassword();
    } catch (error) {
      assert(error.name === app.err.AccountInvalidPassword.name);
    }
  });

  it('trigger AccountIdentityExists on password', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'abosfreeman',
        password: 'factory',
        provider: ac.appKey,
      });
      account.identity = 'xxx';
      await account.setIdentityByPassword();
    } catch (error) {
      assert(error.name === app.err.AccountIdentityExists.name);
    }
  });

  it('trigger account identitiy exits', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'abosfreeman',
        password: 'factory',
        provider: ac.appKey,
      });
      account.identity = 'xxx';
      await account.register();
    } catch (error) {
      assert(error.name === app.err.AccountIdentityExists.name);
    }
  });

  it('trigger invalid passby', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'bbosfreeman',
        password: 'factory',
        provider: ac.appKey,
      });
      await account.setIdentityByPassword();
    } catch (error) {
      assert(error.name === app.err.AccountInvalidPassby.name);
    }
  });

  it('trigger AccountInvalidIdentity on dbDetail', async function() {
    try {
      const account = await ac.forceFactory({
        passby: 'bbosfreeman',
        password: 'factory',
        provider: ac.appKey,
      });
      account.identity = 'xxx';
      await account.dbDetail();
    } catch (error) {
      assert(error.name === app.err.AccountInvalidIdentity.name);
    }
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

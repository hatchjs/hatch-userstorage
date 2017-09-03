'use strict';

const mm = require('egg-mock');
const request = require('supertest');
const assert = require('power-assert');


describe('test/account-center.test.js', () => {
  let app;
  let config;
  let acManager;
  before(function* () {
    app = global.app;
    config = app.config.hatchUserStorage;
    acManager = app.acManager;
  });

  after(function* () {
    // return;
    const db = acManager.db;

    for (const client of [ config.clients.blogtest ]) {
      const ac = yield acManager.get(client.appKey);
      // 如果 ac 已经配置， 则需要清理创建的数据表
      if (!ac) {
        return;
      }
      const tables = yield ac.fetchTables();

      yield tables.map(function* (item) {
        const query = `drop database if exists ${item.dbName} `;
        yield db.query(query);
      });
      yield db.query(`delete from \`${acManager.config.db.tableTB}\` where \`APP_KEY\`=  '${ac.appKey}' `);
      yield db.query(`delete from \`${acManager.config.db.tableAC}\` where \`APP_KEY\`=  '${ac.appKey}' `);
    }
  });

  afterEach(mm.restore);

  it('should GET /', () => {
    return request(app.callback())
      .get('/')
      .expect('hi, abos')
      .expect(200);
  });

  it('should create a new app', async function() {

    // try get an empty app
    const preparedBlogAccountConfig = config.clients.blogtest;
    const appKey = preparedBlogAccountConfig.appKey;
    let emptyAccount;
    try {
      emptyAccount = await acManager.get(appKey);
    } catch (e) {
      assert(e.code === 'ERR_ASSERTION');
    }
    assert(!emptyAccount, 'should not be created yet');

    // create a prepared account center
    const firstCreate = await acManager.createAccountCenter(preparedBlogAccountConfig);
    assert(firstCreate);

    // try create a exists account center
    try {
      await acManager.createAccountCenter(preparedBlogAccountConfig);
      assert(false, 'duplicate should throw error');
    } catch (e) {
      assert(e);
      assert(e.toString() === 'Error: app key dupilicated');
    }

    const secondAccount = await acManager.get(appKey);

    assert(secondAccount, 'should return immediately');
    assert(firstCreate.appKey === preparedBlogAccountConfig.appKey);
  });

});

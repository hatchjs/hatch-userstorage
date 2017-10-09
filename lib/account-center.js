'use strict';


const randomstring = require('randomstring');
const PM_GENERATE_TOKEN = Symbol('AccountCenter#PM_GENERATE_TOKEN');

module.exports = app => {

  const Account = require('./account')(app);
  return class AccountCenter {
    constructor(manager, record) {
      // manager column
      this.app = app;
      this.manager = manager;
      this.appKey = manager.config.appKey;
      this.tableTB = manager.config.db.tableTB;
      this.tableAC = manager.config.db.tableAC;
      this.tableHash = manager.config.db.tableHash;
      this.tableMap = manager.config.db.tableMap;

    // table column
      this.id = record.ID;
      this.appKey = record.APP_KEY;
      this.describe = record.DESCRIBE;
      this.counterDatabase = record.COUNTER_DATABASE;
      this.counterTable = record.COUNTER_TABLE;
      this.tables = null;
      this.accounts = {};
    }

    /**
     * cause constructor won't support generator,
     * so we have to do it
     */
    async init() {
    // return;
    }

    get redis() {
      return app.redis.get('ac');
    }

    async generateIdentity() {
      return this[PM_GENERATE_TOKEN]('ID');
    }

    async generateTicket() {
      return this[PM_GENERATE_TOKEN]('TICKET');
    }

    /**
     * 1. token 的生成可以放到一个进程里，加上服务器识别、进程号识别等信息
     * 2. 不需要通过 mysql 来确定唯一， 而是通过业务在register时检测唯一
     * @param {String} usage 代表生成的token的作用
     * @todo 目前的生成是会堆积很多垃圾数据，不是每个 token 都有用.
     *
     * @return {String} a 92 long string
     */
    async [PM_GENERATE_TOKEN](usage = 'null') {
      if (this.appKey.toString().length > 16) {
        throw new app.err.AccountCenterAppKeyTooLong();
      }
      if (usage.toString().length > 8) {
        throw new app.err.AccountCenterAppKeyTooLong();
      }
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWSYZ1234567890';
      const trans = await this.manager.db.beginTransaction();
      const prefix = Date.now().toString().padStart(18, 'DU');
      const appKeyStr = this.appKey.toString().padStart(16, 'AK');
      let tried = 0;
      let token = null;
      let found = false;
      usage = usage.padStart(8, 'USE');
      while (tried++ < 99) {
        try {
          const triedStr = tried.toString().padStart(2, 'T');
          const randomStr = randomstring.generate(48, charset); // 88-48
          token = `${prefix}${triedStr}${appKeyStr}${usage}${randomStr}`.toUpperCase();
          await trans.insert(this.tableHash, { TOKEN: token });
          found = true;
          await trans.commit();
          break;
        } catch (error) {
          await trans.rollback();
          throw error;
        }
      }
      if (!found) {
        throw new Error(`failed to generate a unique token after ${tried} times`);
      }
      return token;
    }

    async forceFactory(user, ticket) {
      return await this.factory(user, ticket, true);
    }

    async factory(user, ticket, force = false) {

      if (force) {
        delete this.accounts[user.identity];
      } else if (this.accounts.hasOwnProperty(user.identity)) {
        return this.accounts[user.identity];
      }

      const account = new Account(this, user, ticket);
      return account;
    }

    async fetchTables() {
      if (this.tables) {
        return this.tables;
      }
      const tables = await this.manager.db.select(this.tableTB, {
        where: { APP_KEY: this.appKey },
        orders: [[ 'DB_NAME', 'asc' ], [ 'TB_NAME', 'ASC' ]],
      });
      this.tables = tables.map(record => {

        return {
          id: record.ID,
          appKey: record.APP_KEY,
          dbName: record.DB_NAME,
          tbName: record.TB_NAME,
          dbHost: record.DB_HOST,
          dbPort: record.DB_PORT,
          dbUser: record.DB_USER,
          dbPassword: record.DB_PASSWORD,
        };
      });
      return this.tables;
    }
};
};

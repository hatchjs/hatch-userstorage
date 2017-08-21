'use strict';


const assert = require('assert');

module.exports = app => {

  const Account = require('./account')(app);
  return class AccountCenter {
    constructor(manager, record) {
      // manager column
      this.app = app;
      this.manager = manager;
      this.tableTB = manager.config.db.tableTB;
      this.tableAC = manager.config.db.tableAC;

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
    * init() {
    // return;
    }

    * factory(user, force = false) {
      assert(user.identity, 'empty user.identity');

      if (force) {
        delete this.accounts[user.identity];
      } else if (this.accounts.hasOwnProperty(user.identity)) {
        return this.accounts[user.identity];
      }

      const account = new Account(this, user);
      yield account.init();

      return account;
    }

    * fetchTables() {
      if (this.tables) {
        return this.tables;
      }
      const tables = yield this.manager.db.select(this.tableTB, {
        where: { APP_KEY: this.appKey },
        orders: [[ 'DB_NAME', 'asc' ], [ 'TB_NAME', 'ASC' ]],
      });
      this.tables = yield tables.map(function* (record) {
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

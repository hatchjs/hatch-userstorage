'use strict';
/**
 * 插件直接对外的所有方法, 算是适配器
 *
 * @author Abos Freeman
 * @date(Apr 16, 2017) 7:18 PM
 */
// const assert = require('assert');
const assert = require('assert');
const randomstring = require('randomstring');


// eggjs 会传 app 进来并实例化插件
module.exports = app => {
  const AC = require('./account-center')(app);
  class AccountCenterManager {
    constructor() {
      this.allowedCounter = [ 1, 2, 4, 8, 16 ];
      this.acs = [];
      this.app = app;
      this.config = app.config.hatchUserStorage;
      this.db = app.mysql.get('ac');
    }

    async get(name) {
      assert(this.config.clients[name], `missing AC config ${name}`);

      if (!this.acs[name]) {
        this.acs[name] = await this.auth(this.config.clients[name]);
      }
      return this.acs[name];
    }

    /**
     * 所有 AccountCenter 的实例都必须从这个方法获取
     * 会自行获取配置、会判断密码是否错误等
     *
     * @param {Object} acConfig 一个配置对象
     * @return {any} boolean
     */
    async auth(acConfig) {
      assert(acConfig.appKey, '应用key缺失');
      assert(acConfig.password, '数据库密码缺失');

      const record = await this.db.get(this.config.db.tableAC, {
        APP_KEY: acConfig.appKey,
        PASSWORD: acConfig.password,
      });
      if (record) {
        const ac = new AC(this, record);
        await ac.init();
        return ac;
      }

      return false;
    }

    /**
     * 1. 校验数据
     * 2. 添加 ac 数据 appKey, password, counterDB, counterTB
     * 3. 添加 ac db 配置数据: host,port,user,db,password
     * 3. 按创建数据库, 数据表
     * 4. 分配
     *
     * @param {any} acConfig 一个 js 数组
     * @return {any} boolean
     */
    async createAccountCenter(acConfig) {
      const that = this;
      const tables = [];
      const tableSchema = this.tableSchema;

      // 数据校验
      this.validateCreateAC(acConfig);
      const tr = await this.db.beginTransaction();

      try {
        const inserted = await tr.get(this.config.db.tableAC, {
          APP_KEY: acConfig.appKey,
        });
        if (inserted) {
          throw new Error('app key dupilicated');
        }
        // 创建实例
        await tr.insert(that.config.db.tableAC, {
          APP_KEY: acConfig.appKey,
          COUNTER_DATABASE: acConfig.counterDatabase,
          COUNTER_TABLE: acConfig.counterTable,
          PASSWORD: acConfig.password,
          PASSWORD_SALT: randomstring.generate(32, that.config.passwordCharset),
          DESCRIBE: acConfig.describe,
        });

        // 创建对应的db
        await Promise.all(Array(acConfig.counterDatabase).fill().map(async function(item, index) {
          const dbName = `${acConfig.prefixDatabase}${index}`;
          const sqlCreateDB = `create database if not exists \`${dbName}\` charset=utf8`;

          await tr.query(sqlCreateDB);

          // 创建对应的 table
          return await Promise.all(Array(acConfig.counterTable).fill().map(async function(item, index) {

            const tableName = `${acConfig.prefixTable}${index}`;
            const sqlCreateTable = tableSchema.replace(':tableName', tableName).replace(':dbName', dbName);
            await tr.query(sqlCreateTable);
            return tables.push({
              APP_KEY: acConfig.appKey,
              DB_NAME: dbName,
              TB_NAME: tableName,
              DB_HOST: acConfig.configDBHost,
              DB_PORT: acConfig.configDBPort,
              DB_USER: acConfig.configDBUser,
              DB_PASSWORD: acConfig.configDBPassword,
            });
          }));
        }));

        // 授权db
        await tr.query(`grant all privileges on \`${acConfig.prefixDatabase}*\`.* to ${acConfig.configDBUser} identified by '${acConfig.configDBPassword}' `);

        // 更新配置表
        await tr.insert(this.config.db.tableTB, tables);

        // 确认数据并提交
        await tr.commit();
      } catch (e) {
        await tr.rollback();
        throw e;
      }

      return await this.auth(acConfig);
    }

    validateCreateAC(acConfig) {
      assert(acConfig.appKey, 'should define a app id');
      assert(acConfig.password, 'empty ac password');
      assert(acConfig.password.length === 32, 'fixed password length');
      assert(acConfig.describe, 'should at least have some content');
      assert(!isNaN(acConfig.counterDatabase), 'db counter should be a number');
      assert(!isNaN(acConfig.counterTable), 'table counter should be a number');
      assert(acConfig.counterDatabase <= 512, 'db counter should be less than 512');
      assert(acConfig.counterTable <= 512, 'table counter should be less than 512');
      assert(acConfig.counterDatabase > 0, 'db counter should be greater than 1');
      assert(this.allowedCounter.indexOf(acConfig.counterDatabase) > -1, 'db count can not larger than 16 (vscode can\'t hold)');
      assert(this.allowedCounter.indexOf(acConfig.counterTable) > -1, 'table count can not larger than 16 (vscode can\'t hold)');
      assert(acConfig.counterTable > 0, 'table counter should be greater than 1');
      assert(acConfig.configDBHost, 'empty db host');
      assert(acConfig.configDBHost.length <= 32, 'db host length');
      assert(!isNaN(acConfig.configDBPort), 'db port should be a number');
      assert(acConfig.configDBUser, 'empty db user');
      assert(acConfig.configDBUser.length <= 32, 'prefix with a proper length');
    }

    get tableSchema() {
      return `create table if not exists \`:dbName\`.\`:tableName\` (
            ID int not null primary key auto_increment,
            TOKEN varchar(128) not null default '' ,
            IDENTITY varchar(128) not null default '' ,
            NICKNAME varchar(128) not null default '' ,
            OPENID varchar(128) not null default '' ,
            USERID varchar(128) not null default '' ,
            UNIONID varchar(128) not null default '' ,
            PASSWORD varchar(128) not null default '',

            INDEX \`I_OPENID\` (\`OPENID\`),
            INDEX \`I_UNIONID\` (\`UNIONID\`),
            INDEX \`I_IDENTITY\` (\`IDENTITY\`)
      )`;
    }
  }

  // 定义类并且直接实例化
  // 粗暴的单例
  return new AccountCenterManager();
};


/**
 * 注销用户:
 *     程序生成的用户id + 注销标示
 *     所有程序记录必须使用生成的用户id, 而非可变的用户登录号
 *     登录、注册必须通过统一入口
 *
 * @author Abos Freeman
 * @date(Apr 16, 2017) 10:42 PM
 */
const assert = require('assert');
const charset = 'ABCDEFGHIJKLMNOPQRSTUVWSYZabcdefghijklmnopqrstuvwsyz1234567890!@#$%^&*()';
const randomstring = require('randomstring');
const crc = require('crc');


module.exports = app => {

  /**
   * 提供用户的基本信息.
   */
  return class Account {

    constructor(ac, detail) {
      this.ac = ac;
      this.detail = detail;

      // delayed cache
      this.__db = null;
      this.__tb = null;
      this.__table = null;
    }

    login() {

    }

    * init() {
      return yield done => {
        done(true);
      };
    }

    async register() {
      assert(this.provider, 'empty user provider!');
      assert(this.identity, 'empty account identity');
      assert(/^[a-zA-Z0-9_]{5,}$/.test(this.identity), 'invalid account identity, should match: /^[a-zA-Z0-9_]{5,}$/');

      const tb = await this.getTB();
      const db = await this.getDB();

      const conn = await db.beginTransaction();
      try {
        const exists = await conn.get(tb.tbName, { identity: this.identity });
        if (exists) {
          conn.rollback();
          return false;
        }

        await conn.insert(tb.tbName, {
          identity: this.identity,
          token: '',
          openid: randomstring.generate(charset, 32),
        });

        await conn.commit();
      } catch (error) {
        conn.rollback();
      }

      this.register = true;
    }

    get isLogined() {
      return !!this.detail.token;
    }

    get isRegistered() {
      return !!this.detail.token;
    }

    async getDB() {
      if (this.__db) {
        return this.__db;
      }
      const table = await this.getTB();
      this.__db = app.mysql.createInstance({
        host: table.dbHost,
        port: table.dbPort,
        user: table.dbUser,
        password: table.dbPassword,
        database: table.dbName,
      });
      return this.__db;
    }

    async getTB() {
      if (this.__tb) {
        return this.__tb;
      }

      if (this.ac.manager.allowedCounter.indexOf(this.ac.counterDatabase) < 0) {
        throw new Error(`account center database counter is invlid: ${this.ac.counterDatabase}`);
      }

      if (this.ac.manager.allowedCounter.indexOf(this.ac.counterTable) < 0) {
        throw new Error(`account center table counter is invlid: ${this.ac.counterTable}`);
      }

      let crcIndex = 1;
      const crcCount = this.ac.counterTable * this.ac.counterDatabase;

      if (crcCount % 32 === 0) {
        crcIndex = 32;
      } else if (crcCount % 16 === 0) {
        crcIndex = 16;
      } else if (crcCount % 8 === 0) {
        crcIndex = 8;
      } else if (crcCount % 4 === 0) {
        crcIndex = 4;
      } else if (crcCount % 2 === 0) {
        crcIndex = 2;
      }

      const calculated = crc[`crc${crcIndex}`](this.detail.identity);
      const remainder = calculated % crcIndex;
      const tables = await this.ac.fetchTables();
      assert(tables[remainder], 'failed to calculate the storage of current user.');
      this.__tb = tables[remainder];
      return this.__tb;
    }
  };
};


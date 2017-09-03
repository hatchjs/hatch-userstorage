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
const charset = 'ABCDEFGHIJKLMNOPQRSTUVWSYZ1234567890';
const crypto = require('crypto');
const randomstring = require('randomstring');
const crc = require('crc');

const PROVIDERS = {
  PHONE: 'phone',
  ACCOUNT: 'account',
  WECHAT: 'wechat',
  QQ: 'qq',
};
Object.freeze(PROVIDERS);

module.exports = app => {

  /**
   * 提供用户的基本信息.
   */
  return class Account {

    constructor(ac, detail) {
      this.ac = ac;
      this.detail = detail;
      this.identity = null;

      // delayed cache
      this.__db = null;
      this.__tb = null;
      this.__table = null;
      this.passbyRegExp = /^[a-zA-Z0-9][a-zA-Z0-9_]{4,63}$/;
    }

    /**
     * 登录动作的目的
     * 1. 通过帐号获取到永久token
     * 2. 获取帐号详细信息
     * 3. 检验密码是否正确
     * 4. 生成用户临时token与永久token的对照
     */
    async loginByPassword() {
      if (!this.identity) {
        const map = this.map();
        if (!map) {
          return app.err.NotRegisteredAccount;
        }
        this.identity = map.token;
      }
      this.setRegistered(map);
      const tb = await this.getTB();
      const db = await this.getDB();
      const detail = await db.get(tb, {identity: this.identity});
      const hashStr = [ this.ac.manager.config.generalSalt, detail.SALT, this.detail.password ].join('|');
      const encryptedPassword = crypto.createHash('md5').update(hashStr).digest('hex');
      if (encryptedPassword !== detail.PASSWORD) {
        return app.err.InvalidPassword;
      }

      this.detail.nickname = detail.NICKNAME;
      const redKey = app.redKey.accountTmpToken(this);
      const red = await this.getRed();
      await red.set(redKey, this.identity, ['ex', 3600])
    }

    async map() {
      const db = await this.ac.manager.db;
      const map = await db.get(this.ac.tableMap, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
      if (! map) {
        return false;
      }
      return {
        passby: map.ITEM,
        appKey: map.APP_KEY,
        token: map.TOKEN,
      }
    }

    /**
     * 目的: 获取用户信息
     * 1. 通过用户临时 token 获取永久 token
     * 2. 通过永久 token 获取用户信息
     */
    async fullDetail() {
      const redKey
    }

    async init() {
      return true;
    }

    async register() {
      // 检验字段格式
      assert(this.detail.provider, 'empty user provider!');
      assert(this.passbyRegExp.test(this.detail.passby), `account should match: ${this.passbyRegExp}, not: "${this.detail.passby}" `);
      // 检验登录名是否已经被占用, 并且生成登录名称
      const tableMap = this.ac.tableMap;
      const acdb = this.ac.manager.db;
      const map = { ITEM: this.detail.passby, APP_KEY: this.ac.appKey };
      const tranInsert = await acdb.beginTransaction();
      try {
        const exists = await tranInsert.get(tableMap, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
        if (exists) {
          return app.err.DuplicatedAccount;
        }
        await tranInsert.insert(tableMap, map);
        await tranInsert.commit();
      } catch (error) {
        await tranInsert.rollback();
        throw error;
      }

      // 获取 identity
      this.identity = await this.ac.generateToken();
      const tranUpdate = await acdb.beginTransaction();
      try {
        await tranUpdate.update(tableMap, {
          TOKEN: this.identity,
        }, {
          where: map,
        });
        await tranUpdate.commit();
      } catch (error) {
        await tranUpdate.rollback();
        throw error;
      }

      const tb = await this.getTB();
      const db = await this.getDB();
      const conn = await db.beginTransaction();
      try {
        const exists = await conn.get(tb.tbName, { identity: this.identity });
        if (exists) {
          await conn.rollback();
          return false;
        }
        const personnalSalt = randomstring.generate(32, charset).toUpperCase();
        const hashStr = [ this.ac.manager.config.generalSalt, personnalSalt, this.detail.password ].join('|');
        const encryptedPassword = crypto.createHash('md5').update(hashStr).digest('hex');
        await conn.insert(tb.tbName, {
          IDENTITY: this.identity,
          NICKNAME: this.detail.nickname || '',
          PASSWORD: encryptedPassword,
          SALT: personnalSalt,
        });
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      }

      this.setRegistered({ token: this.identity });
      return true;
    }

    get isLogined() {
      return false;
    }

    get isRegistered() {
      return !!this.detail.token;
    }

    setRegistered(map) {
      this.detail.token = map.token;
    }

    async getDB() {
      if (this.__db) {
        return this.__db;
      }
      const table = await this.getTB();
      this.__db = await app.mysql.createInstance({
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
      const calculated = crc[`crc${crcIndex}`](this.identity);
      const remainder = calculated % crcIndex;
      const tables = await this.ac.fetchTables();
      assert(tables[remainder], 'failed to calculate the storage of current user.');
      this.__tb = tables[remainder];
      return this.__tb;
    }
  };
};


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

    constructor(ac, detail, ticket = null) {
      this.ac = ac;
      this.detail = detail;
      this.identity = null;
      this.ticket = ticket;

      // delayed cache
      this.__db = null;
      this.__tb = null;
      this.__table = null;
      this.__dbDetail = null;
      this.passbyRegExp = /^[a-zA-Z0-9][a-zA-Z0-9_]{4,63}$/;
    }

    async setIdentityByTicket() {
      if (!this.ticket) {
        throw new app.err.AccountEmptyTicket();
      }
      const rediskey = app.rediskey.accountTicket(this, this.ticket);
      const redis = await this.getRedis();
      const identity = await redis.get(rediskey);
      if (identity === null) {
        throw new app.err.AccountInvalidTicket();
      }
      this.identity = identity;
    }

    async setIdentityByPassword() {
      if (this.identity) {
        throw new app.err.AccountIdentityExists();
      }
      // this.ac.manager.db
      const mapDB = await this.getMapDB();
      const mapTB = await this.getMapTB();
      const map = await mapDB.get(mapTB.tbName, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
      if (!map) {
        throw new app.err.AccountInvalidPassby();
      }
      // 设置 identity
      this.identity = map.IDENTITY;
      const dbDetail = await this.dbDetail();
      const hashStr = [ this.ac.manager.config.generalSalt, dbDetail.SALT, this.detail.password ].join('|');
      const encryptedPassword = crypto.createHash('md5').update(hashStr).digest('hex');

      if (encryptedPassword !== dbDetail.PASSWORD) {
        throw new app.err.AccountInvalidPassword();
      }
      console.log(this.ticket);
      if (!this.ticket) {
        await this.setTicketByIdentity();
      }
      return true;
    }

    /**
     * 登录动作的目的
     * 1. 通过帐号获取到永久token
     * 2. 获取帐号详细信息
     * 3. 检验密码是否正确
     * 4. 生成用户临时token与永久token的对照
     */
    async setTicketByIdentity() {
      if (this.ticket) {
        throw new app.err.AccountTicketExists();
      }
      if (!this.identity) {
        throw new app.err.AccountEmptyIdentity();
      }

      const ticket = await this.ac.generateToken();
      const redisKeyTicket = app.rediskey.accountTicket(this, ticket);
      const redis = await this.getRedis();
      const settled = await redis.set(redisKeyTicket, this.identity, [ 'nx', 'ex', 3600 ]);
      if (settled) {
        this.ticket = ticket;
      } else {
        this.ticket = await redis.get(redisKeyTicket);
      }
    }

    async fullDetail() {
      const dbDetail = await this.dbDetail();
      return {
        passby: this.detail.passby,
        nickname: dbDetail.NICKNAME,
        avatar: dbDetail.AVATAR,
        ticket: this.ticket,
      };
    }

    /**
     * 目的: 获取用户信息
     * 1. 通过用户临时 token 获取永久 token
     * 2. 通过永久 token 获取用户信息
     */
    async dbDetail() {
      if (!this.identity) {
        throw new app.err.AccountEmptyIdentity();
      }
      if (this.__dbDetail) {
        return this.__dbDetail;
      }
      const keyDBDetail = app.rediskey.accountDBDetail(this);
      const redis = await this.getRedis();
      let dbDetail = await redis.get(keyDBDetail);

      if (!dbDetail) {
        const tb = await this.getTB();
        const db = await this.getDB();
        dbDetail = await db.get(tb.tbName, { IDENTITY: this.identity });
      } else {
        dbDetail = JSON.parse(dbDetail);
      }

      if (!dbDetail) {
        throw new app.err.AccountInvalidIdentity();
      }
      await redis.set(keyDBDetail, JSON.stringify(dbDetail), [ 'ex', 3600 ]);
      this.__dbDetail = dbDetail;
      return this.__dbDetail;
    }

    async register() {
      // 检验字段格式
      assert(this.detail.provider, 'empty user provider!');
      assert(this.passbyRegExp.test(this.detail.passby), `account should match: ${this.passbyRegExp}, not: "${this.detail.passby}" `);
      // 检验登录名是否已经被占用, 并且生成登录名称
      const mapDB = await this.getMapDB();
      const mapTB = await this.getMapTB();
      const map = { ITEM: this.detail.passby, APP_KEY: this.ac.appKey };
      const tranInsert = await mapDB.beginTransaction();
      try {
        const exists = await tranInsert.get(mapTB.tbName, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
        if (exists) {
          throw new app.err.AccountDuplicated();
        }
        await tranInsert.insert(mapTB.tbName, map);
        await tranInsert.commit();
      } catch (error) {
        await tranInsert.rollback();
        throw error;
      }

      // 获取 identity
      this.identity = await this.ac.generateToken();
      const tranUpdate = await mapDB.beginTransaction();
      try {
        await tranUpdate.update(mapTB.tbName, {
          IDENTITY: this.identity,
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
          AVATAR: this.detail.avatar || '',
          PASSWORD: encryptedPassword,
          SALT: personnalSalt,
        });
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      }

      return true;
    }

    get isLogined() {
      return false;
    }

    async getRedis() {
      return this.ac.redis;
    }

    async getMapDB() {
      return this.ac.manager.db;
    }

    async getMapTB() {
      return {
        tbName: this.ac.tableMap,
      };
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

    /**
     *
     * 获取分表分库的逻辑，后续可以改为 identity 按时间、分段获取
     *
     * @returns
     */
    async getTB() {
      if (this.__tb) {
        return this.__tb;
      }
      assert(this.identity, 'should have an identity');
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


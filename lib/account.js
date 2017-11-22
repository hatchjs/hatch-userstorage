'use strict';
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
// PA: private attribute
const PA_DB = Symbol('Account#DB');
const PA_TB = Symbol('Account#TB');
const PA_TABLE = Symbol('Account#TABLE');
const PA_DB_DETAIL = Symbol('Account#PA_DB_DETAIL');
const PA_IDENTITY = Symbol('Account#PA_IDENTITY');
// PM: private method
const PM_DB_DETAIL = Symbol('Account#PM_DB_DETAIL');
const PM_GET_REDIS = Symbol('Account#PM_GET_REDIS');
const PM_GET_TB = Symbol('Account#PM_GET_TB');
const PM_GET_DB = Symbol('Account#PM_GET_DB');
const PM_GET_MAP_TB = Symbol('Account#PM_GET_MAP_TB');
const PM_GET_MAP_DB = Symbol('Account#PM_GET_MAP_DB');


module.exports = app => {

  /**
   * 提供用户的基本信息.
   */
  return class Account {

    constructor(ac, detail, ticket = null) {
      this.ac = ac;
      this.detail = detail;
      this[PA_IDENTITY] = null;
      this.ticket = ticket;

      // delayed cache
      this[PA_DB] = null;
      this[PA_TB] = null;
      this[PA_TABLE] = null;
      this[PA_DB_DETAIL] = null;
      this.passbyRegExp = /^[a-zA-Z0-9][a-zA-Z0-9_]{4,63}$/;
    }

    get identity() {
      return this[PA_IDENTITY];
    }

    async register() {
          // 检验字段格式
      assert(this.detail.provider, 'empty user provider!');
      assert(this.passbyRegExp.test(this.detail.passby), `account should match: ${this.passbyRegExp}, not: "${this.detail.passby}" `);
      if (this.identity) {
        throw app.err.AccountIdentityExists();
      }
          // 检验登录名是否已经被占用, 并且生成登录名称
      const mapDB = await this[PM_GET_MAP_DB]();
      const mapTB = await this[PM_GET_MAP_TB]();
      const map = { ITEM: this.detail.passby, APP_KEY: this.ac.appKey };
      const tranInsert = await mapDB.beginTransaction();
      try {
        const exists = await tranInsert.get(mapTB.tbName, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
        if (exists) {
          throw app.err.AccountRegistered();
        }
        await tranInsert.insert(mapTB.tbName, map);
        await tranInsert.commit();
      } catch (error) {
        await tranInsert.rollback();
        throw error;
      }

          // 获取 identity
      this[PA_IDENTITY] = await this.ac.generateIdentity();
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

      const tb = await this[PM_GET_TB]();
      const db = await this[PM_GET_DB]();
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

    async setIdentityByTicket() {
      if (!this.ticket) {
        throw app.err.AccountEmptyTicket();
      }
      const rediskey = app.rediskey.accountTicket(this, this.ticket);
      const redis = await this[PM_GET_REDIS]();
      const identity = await redis.get(rediskey);
      if (identity === null) {
        throw app.err.AccountInvalidTicket();
      }
      this[PA_IDENTITY] = identity;
    }

    async setIdentityByPassword() {
      if (this.identity) {
        throw app.err.AccountIdentityExists();
      }
      // this.ac.manager.db
      const mapDB = await this[PM_GET_MAP_DB]();
      const mapTB = await this[PM_GET_MAP_TB]();
      const map = await mapDB.get(mapTB.tbName, { ITEM: this.detail.passby, APP_KEY: this.ac.appKey });
      if (!map) {
        throw app.err.AccountInvalidPassby();
      }
      // 设置 identity
      this[PA_IDENTITY] = map.IDENTITY;
      const dbDetail = await this[PM_DB_DETAIL]();
      const hashStr = [ this.ac.manager.config.generalSalt, dbDetail.SALT, this.detail.password ].join('|');
      const encryptedPassword = crypto.createHash('md5').update(hashStr).digest('hex');

      if (encryptedPassword !== dbDetail.PASSWORD) {
        throw app.err.AccountInvalidPassword();
      }
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
        throw app.err.AccountTicketExists();
      }
      if (!this.identity) {
        throw app.err.AccountEmptyIdentity();
      }

      const ticket = await this.ac.generateTicket();
      const redisKeyTicket = app.rediskey.accountTicket(this, ticket);
      const redis = await this[PM_GET_REDIS]();
      const settled = await redis.set(redisKeyTicket, this.identity, [ 'nx', 'ex', 3600 ]);
      if (settled) {
        this.ticket = ticket;
      } else {
        this.ticket = await redis.get(redisKeyTicket);
      }
    }

    async fullDetail() {
      const dbDetail = await this[PM_DB_DETAIL]();
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
     * @return {Object} user infomation in an object from database
     */
    async [PM_DB_DETAIL]() {
      if (!this.identity) {
        throw app.err.AccountEmptyIdentity();
      }
      if (this[PA_DB_DETAIL]) {
        return this[PA_DB_DETAIL];
      }
      const keyDBDetail = app.rediskey.accountDBDetail(this);
      const redis = await this[PM_GET_REDIS]();
      let dbDetail = await redis.get(keyDBDetail);
      if (!dbDetail) {
        const tb = await this[PM_GET_TB]();
        const db = await this[PM_GET_DB]();
        dbDetail = await db.get(tb.tbName, { IDENTITY: this.identity });
      } else {
        dbDetail = JSON.parse(dbDetail);
      }

      if (!dbDetail) {
        throw app.err.AccountInvalidIdentity();
      }
      await redis.set(keyDBDetail, JSON.stringify(dbDetail), [ 'ex', 3600 ]);
      this[PA_DB_DETAIL] = dbDetail;
      return this[PA_DB_DETAIL];
    }

    async [PM_GET_REDIS]() {
      return this.ac.redis;
    }

    async [PM_GET_MAP_DB]() {
      return this.ac.manager.db;
    }

    async [PM_GET_MAP_TB]() {
      return {
        tbName: this.ac.tableMap,
      };
    }

    async [PM_GET_DB]() {
      if (this[PA_DB]) {
        return this[PA_DB];
      }
      const table = await this[PM_GET_TB]();
      this[PA_DB] = await app.mysql.createInstance({
        host: table.dbHost,
        port: table.dbPort,
        user: table.dbUser,
        password: table.dbPassword,
        database: table.dbName,
      });
      return this[PA_DB];
    }

    /**
     *
     * 获取分表分库的逻辑，后续可以改为 identity 按时间、分段获取
     *
     * @return {Object} database config and table name of this account from database
     */
    async [PM_GET_TB]() {
      if (this[PA_TB]) {
        return this[PA_TB];
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
      this[PA_TB] = tables[remainder];
      return this[PA_TB];
    }
  };
};


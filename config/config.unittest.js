'use strict';

const randomstring = require('randomstring');
const passwordCharset = 'ABCDEFGHIJKLMNOPQRSTUVWSYZabcdefghijklmnopqrstuvwsyz1234567890!@#$%^&*()';
const util = require('util');

exports.keys = 'hatch-userstorage|192m31o3jxheiuhdw123456';


// had enabled by egg
// exports.static = true;
// const path = require('path')

exports.mysql = {
  app: true,
  agent: true,
  clients: {
    ac: {
      // host
      host: 'localhost',
      // 端口号
      port: '3306',
      // 用户名
      user: 'root',
      // 密码
      password: 'awesome',
      // 数据库名
      database: 'hatch_usercenter',
      // 以下三个表应该放在用户帐号库， 而不是管理中心的库
      /*
      CREATE TABLE `account_center` (
        `ID` int(11) NOT NULL AUTO_INCREMENT,
        `APP_KEY` varchar(20) NOT NULL,
        `PASSWORD` varchar(32) NOT NULL,
        `PASSWORD_SALT` varchar(32) NOT NULL,
        `CREATE_DATETIME` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `DESCRIBE` varchar(128) NOT NULL,
        `COUNTER_DATABASE` tinyint(3) unsigned NOT NULL,
        `COUNTER_TABLE` tinyint(3) unsigned NOT NULL,
        PRIMARY KEY (`ID`),
        UNIQUE KEY `APP_KEY_UNIQUE` (`APP_KEY`)
      ) ENGINE=InnoDB
      */
      /*
      CREATE TABLE `account_center_tb` (
        `ID` int(11) NOT NULL AUTO_INCREMENT,
        `APP_KEY` varchar(64) NOT NULL,
        `DB_NAME` varchar(45) NOT NULL COMMENT '数据库名称',
        `TB_NAME` varchar(45) NOT NULL COMMENT '表名称',
        `DB_HOST` varchar(45) NOT NULL,
        `DB_PORT` varchar(45) NOT NULL,
        `DB_PASSWORD` varchar(45) NOT NULL,
        `DB_USER` varchar(45) NOT NULL,
        PRIMARY KEY (`ID`),
        UNIQUE KEY `I_UNIQUE_DB_TB` (`DB_HOST`,`DB_PORT`,`DB_NAME`,`TB_NAME`)
      ) ENGINE=InnoDB
      */
      /*
      CREATE TABLE `account_center_map` (
        `IDENTITY` char(92) NOT NULL DEFAULT '',
        `ITEM` char(64) NOT NULL,
        `APP_KEY` char(20) NOT NULL,
        PRIMARY KEY (`APP_KEY`,`ITEM`),
        KEY `I_IDENTITY` (`IDENTITY`) USING BTREE
      ) ENGINE=InnoDB
      */
      /*
      CREATE TABLE `account_center_hash` (
        `TOKEN` char(92) NOT NULL,
        PRIMARY KEY (`TOKEN`)
      ) ENGINE=InnoDB
      */
    },
  },
};


exports.hatchUserStorage = {
  passwordCharset,
    // Multi Service Register
  clients: {
    blog: {
      appKey: 'blog',
      password: 'cbRSnU4Igj3Xfrp6BMgreJ7LVpLrW0hF',
      describe: 'super awesome',
      prefixDatabase: 'blog_account_',
      prefixTable: 'tb_account_',
      counterDatabase: 1,
      counterTable: 1,
      configDBHost: 'mysql.i.abos.space',
      configDBPort: 3306,
      configDBUser: 'blogaccount',
      configDBPassword: '6BMgreIgj3XfrpJ7LVpLrW0hFcbRSnU4',
      generalSalt: 'blogsuperawesomeabos',
    },
    blogtest: {
      appKey: 'blogtest',
      password: 'cbRSnU4Igj3Xfrp6BMgreJ7LVpLrW0hF', // randomstring.generate(32, passwordCharset),
      describe: 'super awesome',
      prefixDatabase: 'blog_account_test_',
      prefixTable: 'blog_account_',
      counterDatabase: 8,
      counterTable: 8,
      configDBHost: 'mysql.i.abos.space',
      configDBPort: 3306,
      configDBUser: 'blogaccount',
      configDBPassword: '6BMgreIgj3XfrpJ7LVpLrW0hFcbRSnU4',
      generalSalt: 'blogtestsuperawesomeabos',
    },
    game: {
      appKey: 'host',
      password: 'port',
    },
  },
};

exports.unittest = {

  // 登录或授权后的返回数据
  accountInfo: [
    {
      token: '',
      identity: '',
      nickname: '',
      openId: '',
      userId: '',
      unionId: '',
      password: '',
    },
  ],
  // 用于传入登录或授权的数据
  user: [
    {
      token: '',
      identity: '',
      password: '',
      provider: '',
    },
  ],
};


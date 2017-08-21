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
      password: '',
      // 数据库名
      database: 'huodong',
    },
  },
};


exports.hatchUserStorage = {
  passwordCharset,
  db: {
    tableAC: 'account_center',
    tableTB: 'account_center_tb',
  },
    // Multi Service Register
  clients: {
    blog: {
      appKey: 'blog',
      password: 'cbRSnU4Igj3Xfrp6BMgreJ7LVpLrW0hF',
      describe: 'super awesome',
      prefixDatabase: 'blog_account_',
      prefixTable: 'tb_account_',
      counterDatabase: 8,
      counterTable: 8,
      configDBHost: 'mysql.i.abos.space',
      configDBPort: 3306,
      configDBUser: 'blogaccount',
      configDBPassword: '6BMgreIgj3XfrpJ7LVpLrW0hFcbRSnU4',
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


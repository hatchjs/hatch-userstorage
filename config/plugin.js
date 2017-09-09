'use strict';
const path = require('path');
// had enabled by egg
// exports.static = true;

exports.hatchErrors = {
  enabled: true,
  path: path.join(__dirname, '..', '..', 'hatch-errors'),
  package: 'hatch-errors',
};

exports.mysql = {
  enabled: true,
  package: 'egg-mysql',
};

exports.redis = {
  enabled: true,
  package: 'egg-redis',
};

exports.hatchRediskey = {
  enable: true,
  package: 'hatch-rediskey',
  path: path.join(__dirname, '../../hatch-rediskey'),
};


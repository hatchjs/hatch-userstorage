'use strict';

const manager = require('./lib/manager');
module.exports = app => {
  app.acManager = manager(app);
};

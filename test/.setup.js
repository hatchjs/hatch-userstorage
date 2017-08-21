'use strict';

const mm = require('egg-mock');
let app;
before(() => {
  app = global.app = mm.app();
  return app.ready();
});



after(() => app.close());

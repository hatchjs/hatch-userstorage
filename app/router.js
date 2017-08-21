'use strict';

module.exports = app => {
  app.get('/internal/loginByPassword', 'internal.loginByPassword');
  app.get('/internal/registerByPassword', 'internal.registerByPassword');
  app.get('/', app.controller.home.helloWorld);
  // app.get('/public/', 'public.index');
};

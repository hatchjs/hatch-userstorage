'use strict';

module.exports = app => {
  class HomeController extends app.Controller {

    async helloWorld() {
      this.ctx.body = 'hi, abos';
      return;
    }
  }
  return HomeController;
};

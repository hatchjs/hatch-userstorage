'use strict';

module.exports = app => {
  class InternalController extends app.Controller {

    async loginByPassword() {
      this.ctx.body = 'hi, egg';
    }
    async registerByPassword() {
      this.ctx.body = 'hi, egg';
    }
  }
  return InternalController;
};

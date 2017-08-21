'use strict';

module.exports = options => {
  return function* userstorage(next) {
    // this.user = yield options.service.getUser(this);
    yield next;
  };
};

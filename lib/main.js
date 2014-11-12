(function (root, factory) {
  var deps = ['./realtime-client'];

  if (typeof exports === 'object') {
    // CommonJS
    var a = require('./realtime-client');
    module.exports = factory(a);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (RealtimeClient) {
  return RealtimeClient;
}));

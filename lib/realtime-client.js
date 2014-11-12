(function (root, factory) {
  var deps = [];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require.apply(null, deps));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function () {
  return function (){
    this.foo = true;
  };
}));

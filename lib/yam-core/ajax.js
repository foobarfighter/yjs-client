(function (root, factory) {
  var deps = ["jquery"];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(
      require('jquery')
    );
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function ($) {
  return $.ajax;
}));

(function (root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(
        require('./bayeux')
    );
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      './bayeux'
    ], function () { return factory.apply(null, arguments); });
  }
}(this, function (bayeux) {
  return function (){
    this.bayeux = bayeux;
  };
}));

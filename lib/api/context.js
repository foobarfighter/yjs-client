(function (root, factory) {
  var deps = [
    './resource'
  ];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require.apply(null, deps));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (Resource) {

// define(['./resource'], function (Resource){
  var Context = function (){
    this._options = {};
  };

  Context.prototype.newContext = function (){
    return new Context();
  }

  Context.prototype.resource = function (path){
    return new Resource(this, path);
  }

  Context.prototype.setOptions = function (method, options){
    this._options[method.toUpperCase()] = _.clone(options);
    return this;
  }

  Context.prototype.getOptions = function (method){
    return this._options[method.toUpperCase()];
  };

  return Context;
}));

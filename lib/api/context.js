if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['./resource'], function (Resource){
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
});

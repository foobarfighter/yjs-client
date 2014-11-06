if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  "./bayeux-monitor"
], function (){
  return function (){
    this.foo = true;
  };
});

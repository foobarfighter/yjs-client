if (typeof define !== 'function') { var define = require('amdefine')(module) }

var __global = (function (){ return this; })();

// Core functions that need to be replaced with updated stuff
define([
  "underscore"
]
, function (_){
  return {
    _handleCounter: 0
  , _subscriptions: {}

  , ns: function (ns, obj) {
      if (!ns) {
        throw new Error('yam.ns requires at least one parameter');
      }
      var parentObj = __global;
      var modules = typeof ns === "string" ? ns.split(".") : ns;
      for (var i = 0; i < modules.length; i++) {
        var m = modules[i];
        if (!parentObj[m]) {
          parentObj[m] = {};
        }
        parentObj = parentObj[m];
      }
      if (obj) {
        _.extend(parentObj, obj);
      }
      return parentObj;
    }

  , subscribe: function (topic, fn) {
      var self = this;

      if (_.isArray(topic)) {
        var topics = [];
        _.each(topic, function (x) {
          topics.push(self.subscribe(x, fn));
        });
        return topics;
      }

      var id = this._handleCounter, s = this._subscriptions;

      if (!s[topic]) { s[topic] = {}; }
      s[topic][id] = fn;
      this._handleCounter++;

      return [topic, id];
    }

  , unsubscribe: function (handle) {
      if (!handle) { return; }

      var topic = handle[0], id = handle[1];
      var s = this._subscriptions;

      if (s[topic] && s[topic][id]) {
        s[topic][id] = null;
        delete s[topic][id];
      }
    }

  , publish: function (topic, args) {
      var s = this._subscriptions
        , res = [];

      if (!s[topic]) { return; }
      for (var id in s[topic]) {
        var fn = s[topic][id];
        if (args instanceof Array !== true) {
          args = [args];
        }

        res.push(fn.apply(fn, args || []));
      }

      return res;
    }
  };

});

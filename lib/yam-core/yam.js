(function (root, factory) {
  var deps = [
    "underscore",
    "yam-core/config",
    "yam-core/window"
  ];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require.apply(null, deps));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (_, config, win) {

  var yam = {
    _handleCounter: 0
  , _subscriptions: {}
  , _currentNetwork: undefined
  , _currentUser: undefined

  // Differs from core implementation
  , treatment: function (){ return false; }

  // Differs from core implementation
  , getCurrentNetwork: function (){
    return this._currentNetwork;
  }

  // Differs from core implementation
  , setCurrentNetwork: function (network){
    this._currentNetwork = network;
  }

  // Differs from core implementation
  , getCurrentUser: function (){
    return this._currrentUser;
  }

  // Differs from core implementation
  , setCurrentUser: function (user){
    this._currrentUser = user;
  }

  // Differs from core implementation
  , config: config

  , setTimeout: function (){
    window.setTimeout.apply(window, arguments);
  }

  // From ./window
  , window: win

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

  , paramify: function (obj, o) {
      var opts = o || {},
          str = '',
          key,
          val,
          isValid,
          itemArray,
          arr = [],
          arrVal;

      for (var p in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, p)) {
          val = obj[p];

          // This keeps valid falsy values like false and 0
          // It's duplicated in the array block below. Could
          // put it in a function but don't want the overhead
          isValid = !( val === null || val === undefined ||
                      (typeof val === 'number' && isNaN(val)) );

          key = opts.snakeize ? this.snakeize(p) : p;
          if (isValid) {
            // Multiple vals -- array
            if (_.isArray(val) && val.length) {
              itemArray = [];
              for (var i = 0, ii = val.length; i < ii; i++) {
                arrVal = val[i];
                // This keeps valid falsy values like false and 0
                isValid = !( arrVal === null || arrVal === undefined ||
                             (typeof arrVal === 'number' && isNaN(arrVal)) );

                itemArray[i] = isValid ? encodeURIComponent(arrVal) : '';
                if (opts.escapeVals) {
                  itemArray[i] = this.escapeXML(itemArray[i]);
                }
              }
              // Consolidation mode -- single value joined on comma
              if (opts.consolidate) {
                arr.push(key + '=' + itemArray.join(','));
              }
              // Normal mode -- multiple, same-named params with each val
              else {
                // {foo: [1, 2, 3]} => 'foo=1&foo=2&foo=3'
                // Add into results array, as this just ends up getting
                // joined on ampersand at the end anyhow
                arr.push(key + '=' + itemArray.join('&' + key + '='));
              }
            }
            // Single val -- string
            else {
              if (opts.escapeVals) {
                val = this.escapeXML(val);
              }
              arr.push(key + '=' + encodeURIComponent(val));
            }
            str += '&';
          }
          else {
            if (opts.includeEmpty) { arr.push(key + '='); }
          }
        }
      }
      return arr.join('&');
    }

  , objectify: function (str, options) {
      var opts = options || {};
      var d = {};
      var consolidate = typeof opts.consolidate === 'undefined' ?
          true : opts.consolidate;
      var plus_regex = /\+/g;
      if (str) {
        var arr = str.split('&');
        for (var i = 0; i < arr.length; i++) {
          var pair = arr[i].split('=');
          var name = pair[0];
          var val = pair[1];

          try{
            // decodeURIComponent incorrectly decodes plus signs.
            // Manually replace them with spaces.
            val = decodeURIComponent(
              (pair[1] || '').replace(plus_regex, '%20')
            );
          } catch(e){
            // decodeURIComponent lets us down sometimes. Looks like there are
            // urls around that aren't standard compliant and can't be encoded by decodeURIComponent
            // instead of building our own decodeURIComponent, we just give up here and return the unencoded value.
            // Thats not nice, but better then reinventing the wheel
            // see https://jira.int.yammer.com/browse/YAMJS-2117 for this specific case
            // and http://en.wikipedia.org/wiki/Percent-encoding#Character_data
          }

          // "We've already got one!" -- arrayize if the flag
          // is set
          if (typeof d[name] !== 'undefined' && consolidate) {
            if (typeof d[name] === 'string') {
              d[name] = [d[name]];
            }
            d[name].push(val);
          }
          // Otherwise just set the value
          else {
            d[name] = val;
          }
        }
      }
      return d;
    }

  , escapeXML: function (s) {
      if (s == null) { return; }
      return s.replace(/&(?!\w+;)|['"<>`]/g, function (s) {
        switch(s) {
        case "&": return "&amp;";
        case '"': return '&quot;';
        case "'": return '&#39;';
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "`": return "&#96;";
        default: return s;
        }
      });
    }

  , snakeize: function (s, separ) {
      var repl = /([A-Z]+)/g
      , lead = /^_/g;

      var sep = separ || '_'
        , leading = separ ? new RegExp('^' + this.escapeRegExp(sep), 'g') : lead;
      return s.replace(repl, sep + '$1').toLowerCase().
        replace(leading, '');
    }

  , escapeRegExp: function(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

  };

  return yam;
}));

(function (root, factory) {
  var deps = [
    "yam-core/yam"
  ];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require("./yam"));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (yam) {

  /**
    @name win.location
    @function
    @description wrapper function for window.location. should ape all the common functionality of the window.location object
    @param {location} the location you want to navigate to
    @returns new href
  */

  //this would be more awesome if we could use getters and setters

  var eventBase = "win.location";

  var actionStub = function(action) {
    if (!action) {
      action = "location";
    }

    return function(val) {
      if (val && action !== 'reload' && action !== 'valueOf' && action !== 'toString' && action !== 'ancestorOrigins') {
        yam.publish(eventBase, {action: action, val: val});
        return val;
      } else if (val == null && action === 'replace') {
        yam.publish(eventBase, {action: action, val: undefined});
        return undefined;
      } else if (action === 'reload') {
        yam.publish(eventBase, {action: action});
        return window.location;
      } else if(action !== "location") {
        return window.location[action];
      }

      return window.location;
    };
  };

  var toString = function() {return actionStub()().href;};

  var win = {

    location: function(location) {

      var r = actionStub()(location);
      if (r !== window.location) {
        return r;
      }

      return {
        assign:      actionStub('assign')
        , toString:  toString
        , href:      actionStub('href')()
        , protocol:  actionStub('protocol')()
        , host:      actionStub('host')()
        , hostname:  actionStub('hostname')()
        , hash:      actionStub('hash')()
        , pathname:  actionStub('pathname')()
        , port:      actionStub('port')()
        , origin:    actionStub('origin')()
        , search:    actionStub('search')()
        , ancestorOrigins: actionStub('ancestorOrigins')()
        , replace:   actionStub('replace')
        , reload:    actionStub('reload')
      };
    }
  };

  win.location.assign   = actionStub('assign');
  win.location.toString = toString;

  win.location.href     = actionStub('href');
  win.location.protocol = actionStub('protocol');
  win.location.host     = actionStub('host');
  win.location.hostname = actionStub('hostname');
  win.location.hash     = actionStub('hash');
  win.location.pathname = actionStub('pathname');
  win.location.port     = actionStub('port');
  win.location.origin   = actionStub('origin');
  win.location.search   = actionStub('search');
  win.location.ancestorOrigins = actionStub('ancestorOrigins');
  win.location.replace   = actionStub('replace');
  win.location.reload   = actionStub('reload');

  return win;

}));

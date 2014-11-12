(function (root, factory) {
  var deps = [];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require.apply(null, deps));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (yam) {

  // Private vars
  //---------------
  var _config = {
        debug: false,
        throwExceptions: false
      }
    , _mix = function (to, from) {
        for (var p in from) {
          to[p] = from[p];
        }
        return to;
      };
  /*
   * Updates and retrieves the current settings for a yamjs application.
   *
   * yam.config is meant to be used as a global registry for yamjs
   * configuration.  The idea is that a module can check these
   * settings to determine state and behavior. Other modules or user
   * code can change these settings via one convenient method. And at
   * any given time you can check this to get a snap- shot of the
   * current state of yamjs.
   *
   *     var config = yam.config();
   *     console.log(config.baseURI);  // undefined
   *     // note that you always get a copy of the object
   *     config = yam.config({
   *       baseURI: 'https://www.staging.yammer.com'
   *     });
   *     console.log(config.baseURI);  // staging url
   *
   * One thing to keep in mind with this is that here is no mechanism
   * to be alerted when settings have changed. Some settings may be
   * "live" in the sense that a module always checks the latest
   * value. But others may only be checked on first initialization of
   * the module. See yam.request and "authMethod".  In this case, the
   * behavior will be different based on using yam.config before
   * request has been initialized and after.
   *
   *     yam.config({
   *       baseURI: 'https://www.staging.yammer.com'
   *       , authMethod: 'oauth2'
   *     });
   *     yam.request({
   *       url: yam.uri.api('messages/following/json')
   *       , success: function() { /* do something /* }
   *     });
   *     // Makes a request to the staging api using an oauth2 token
   *
   * @param {Object} [settings] an object which will be shallow-mixed into
   * the current configuration object.
   * -or-
   * @param {string} [key] the desired yam.config key
   * @param {object} the value to be set at the yam.config key
   * @returns {Object} A copy of the settings object
   */
  return function () {
    var settings;
    if (arguments.length === 2 && typeof arguments[0] === 'string') {
      var key = arguments[0]
        , val = arguments[1];

      _config[key] = val;
    } else if (arguments.length === 1) {
      settings = arguments[0];
    }

    if (settings && typeof settings === 'object') {
      _config = _mix(_config, settings);
    }
    return _mix({}, _config);
  };
  
}));

(function (root, factory) {
  var deps = [
    './api/context',
  ];

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory(require.apply(null, deps));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(deps, function () { return factory.apply(null, arguments); });
  }
}(this, function (Context) {

  var DEFAULT_GET_OPTIONS = {
      url: ''
    , method: 'GET'
    , data: {}
    , dataType: 'json'
    , contentType: 'text/javascript'
    , auth: 'oauth2'
  };

  var DEFAULT_POST_OPTIONS = {
      url: ''
    , contentType: 'application/x-www-form-urlencoded'
    , method: 'POST'
    , data: {}
    , dataType: 'json'
    , auth: 'oauth2'
  };

  var DEFAULT_PUT_OPTIONS = {
      url: ''
    , contentType: 'application/x-www-form-urlencoded'
    , method: 'POST'
    , data: { _method: 'PUT' }
    , dataType: 'text'
    , auth: 'oauth2'
  };

  var DEFAULT_DELETE_OPTIONS = {
      url: ''
    , contentType: 'application/x-www-form-urlencoded'
    , method: 'POST'
    , data: { _method: 'DELETE' }
    , dataType: 'text'
    , auth: 'oauth2'
  };

  return new Context().setOptions('GET', DEFAULT_GET_OPTIONS)
                      .setOptions('POST', DEFAULT_POST_OPTIONS)
                      .setOptions('PUT', DEFAULT_PUT_OPTIONS)
                      .setOptions('DELETE', DEFAULT_DELETE_OPTIONS);

  // Context.newContext();
                // .setDefaultGetOptions(DEFAULT_GET_OPTIONS)
                // .setDefaultPostOptions(DEFAULT_PUT_OPTIONS)
                // .setDefaultPutOptions(DEFAULT_PUT_OPTIONS)
                // .setDefaultDeleteOptions(DEFAULT_DELETE_OPTIONS);
}));

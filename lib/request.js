define([
  "underscore",
  "jquery", // for Deferred and trim
  "./yam",
  "./uri",
  "./ajax"
], function (_, $, yam, yuri, ajax){
  return new (function (yam, undefined) {
    var requestObj = this;

    // Constants
    // ----------
    var DEBUG = false;

    // Private vars
    // ----------
    var _config = {
          appId: null
          , authMethod: null
          , xdrHostname: null
        }
      , _initialized = false
      , _initializer
      , _seeds = 1
      , _handles = {}

      // These are the built-in request methods

      // Default requester
      , basicRequester = {
        send: function() {
          return ajax.apply(yam, arguments);
        }
      }

      // Cross-domain requester using xdr
      , xDomainRequester = {
        init: function(done) {
          yam.require('yam.xdr');

          var config = {
            hostname: _config.xdrHostname
          };

          yam.xdr.init(config, done);
        }
        , send: function() {
          return yam.xdr.ajax.apply(yam.xdr, arguments);
        }
      }

      // default requester could be overriden by config vars
      , _requester

      // These are the built-in authentication handlers

      , basicAuthenticator = {
          _CSRFToken: null
          , _getCSRFToken: function() {
            // #commonjs
            return requestObj.util.authenticityToken();
          }
          , _getNetworkId: function() {
            if(yam.getCurrentNetwork()) {
              return yam.getCurrentNetwork().id;
            }
            return null;
          }
          , getAuthenticationHeaders: function(networkId) {
            networkId = networkId || this._getNetworkId();

            if(!networkId) { console.warn('Network id required for api calls'); }

            return {
              'X-CSRF-Token': this._getCSRFToken()
              , 'NETWORK_ID': networkId || ''
            };
          }
          , getParamsForWrite: function() {
            return {
              authenticity_token: this._getCSRFToken()
            };
          }
          , beforeSend: function(xhr, settings) {
            // Pass in settings.networkId. This allows you to override.
            // Otherwise, the network will get pulled in from the page.
            requestObj.util.addAuthenticationParams(settings, xhr, this, settings.networkId);
          }
        }

      // OAuth2 handler
      , oAuth2Authenticator = {
          _authToken: null
          , _getAuthToken: function(origRequest) {
            var self = this
              // forward error and complete back to the original request
              , error = origRequest.error || undefined
              , complete = origRequest.complete || undefined
              , url = yuri.join( yuri.base(), 'oauth2/access_token.json' );

            _request({
              url: url
              // this is an auth call so suppress the normal behavior
              , auth: false
              , data: {
                client_id: _config.appId
              }
              , success: function(data) {
                if(data && data.access_token) {
                  self._authToken = data.access_token;

                  // signal a retry
                  return self.onRetry(origRequest);
                } else {
                  // no data so fail
                  this.error();
                }
              }
              , error: function() {
                self._authToken = null;
                if(typeof error === 'function') {
                  error.apply(origRequest, arguments);
                }
              }
              , complete: function() {
                // No retry, so complete original request
                if(!self._authToken) { // it worked
                  complete.apply(this, arguments);
                }
              }
            });
          }
          , setAuthToken: function(token) {
            if(typeof token === 'string') {
              this._authToken = { token: token };
              return;
            }

            this._authToken = token;
          }
          , onRetry: function() {
            _resend.apply(requestObj, arguments);
          }
          , getAuthenticationHeaders: function() {
            if(!this._authToken) { return {}; }
            return {
              'Authorization': 'Bearer ' + this._authToken.token
            };
          }
          , getParamsForWrite: function() {
            if(!this._authToken) { return {}; }
            return {
              access_token: this._authToken.token
            };
          }
          // check the auth status of a completed request
          , _authFailed: function(req, xhr) {
            return (xhr.status == 401 && xhr.getResponseHeader('WWW-Authenticate'));
          }
          , _addRetryHandler: function(req) {
            var self = this
              , times = 1
              , errFunc = req.error;

            if(typeof req._retries === 'undefined' || req._retries == null) {
              req._retries = times;
            } else {
              req._retries--;
            }

            var handler = function(xhr, textStatus) {
              // always reset error handler
              req.error = errFunc;

              if(textStatus === 'error' && self._authFailed(req, xhr) && yam.config().appId) {
                // kill invalid token
                self.setAuthToken(null);

                // this may have been set by jquery.ajax
                if (req.context === req) {
                  delete req.context;
                }

                if(req._retries > 0) {
                  // start request over, send it straight to the requester
                  // because it's already normalized
                  _log('oauth2 retry:', req);
                  return _resend.call(requestObj, req);
                }
              }

              if(typeof errFunc === 'function') {
                return errFunc.apply(this, arguments);
              }
            };

            req.error = handler;
          }

          , beforeSend: function(xhr, settings) {
            var self = this;

            if(!self._authToken) {
              // attempt to authenticate and then retry
              yam.setTimeout(function() {
                self._getAuthToken(settings);
              }, 10);
              return false;
            }


            // handle things like oauth retry
            if(self._authToken) {
              self._addRetryHandler(settings);
            }

            requestObj.util.addAuthenticationParams(settings, xhr, self, self._networkId);
          }
        }

      // default authenticator could be overriden by config vars
      , _authenticator;

      // Request handle that allows cancelling
      var  _RequestHandle = function() {
        this.id = _seeds++;
        this._isCancelled = false;
        // should be explicitly set to true
        this._inFlight = false;
      };
      _RequestHandle.prototype.inFlight = function() {
        return this._inFlight;
      };
      _RequestHandle.prototype.isCancelled = function() {
        return this._isCancelled;
      };
      _RequestHandle.prototype.cancel = function() {
        if(this._isCancelled) { return; }

        this._isCancelled = true;

        try {
          if (this.xhr && this.xhr.abort){ this.xhr.abort(); }
        } catch(e){}

        if(this.category) {
          _removeHandle(this);
        }
      };
      // alias abort => cancel
      _RequestHandle.prototype.abort = _RequestHandle.prototype.cancel;



    // Private functions
    // ----------
    var _log = function () {
          if (DEBUG && yam.config().debug) {
            yam.log.apply(yam, arguments);
          }
        }

      // Copy config. But only the appropriate keys
      , _updateConfig = function() {
          var configKeys = _.keys(_config)
            , yam_config = yam.config()
            , key;
          for(var i=0; i<configKeys.length; i++) {
            key = configKeys[i];
            // copy all properties that have been explicitly set
            if(yam_config[key] !== undefined) { _config[key] = yam_config[key]; }
          }
        }

      , _getRequester = function() {
          return _requester;
        }

      , _setRequester = function (r) {
          return _requester = r;
        }

      , _getAuthenticator = function(req) {
          var authenticator = _authenticator;

          // override authenticator via req.auth
          if(req && 'auth' in req) {

            // explicitly bypass authentication
            if(req.auth === false) {
              authenticator = null;
            }

            // use a custom authenticator object
            if(req.auth && typeof req.auth === 'object') {
              authenticator = req.auth;
            }

            if(typeof req.auth === 'string') {
              switch(req.auth) {
                case 'oauth2':
                  authenticator = oAuth2Authenticator;
                  break;
                default: // no recognized, use default
                  break;
              }
            }
          }

          return authenticator;
        }

      , _setAuthenticator = function (a) {
          if(typeof a === 'string') {
            // Try to lookup the authenticator by name. If not recognized
            // the current value will not change
            _authenticator = _getAuthenticator({ auth: a});
          } else {
            _authenticator = a;
          }
          return _authenticator;
        }

      , _init = function () {
          // yam.require('yam.util');
          // yam.require('yam.promise');

          _updateConfig();

          _initialized = true;
          _initializer = _getInitializerReference();

          var done = function () {
            _initializer.resolve();
          };

          // change settings based on config
          _initializeDeps();

          // requester may need to be initialized as well
          if(typeof _requester.init === 'function') {
            _requester.init(done);
          } else {
            done();
          }
        }

      , _ensureInit = function (callback) {
          if (!_initialized) {
            _init();
          }

          if (typeof callback == 'function') {
            _initializer.then(callback);
          }
        }

      , _getInitializerReference = function () {
          var pInit = new $.Deferred();
          $.when(pInit).then(function (){
            return requestObj.afterInit.apply(requestObj, arguments);
          });
          return pInit;
        }

      , _initializeDeps = function () {
          // Set up requester
          if(!_requester) {
            if (_config.xdrHostname) {
              _setRequester(xDomainRequester);
            } else {
              _setRequester(basicRequester);
            }
          }

          // Set up authenticator
          _setAuthenticator(basicAuthenticator);
          if(_config.authMethod) {
            switch(_config.authMethod) {
              case 'oauth2':
                _setAuthenticator(oAuth2Authenticator);
                break;
              default:
                break;
            }
          }
        }

      , _normalizeURL = function(url) {
        // In english: all instances of 2 or more consecutive dots; either
        // followed by a forward slash or at the end of the string
        var re = /\.{2,}(\/|$)/g;
        if(re.test(url)) {
          var o = yuri.parse(url);
          // for security, remove all up linking path segments, e.g. "/api/v1/../../etc/passwd"
          o.directory = yam.trim(o.directory).replace(re, '');
          o.file = yam.trim(o.file).replace(re, '');
          url = yuri.stringify(o);
        }
        return url;
      }

      // add the given capability value to the yammer-capabilities header
      , _withCapability = function (headers, capability) {
        headers = _.extend({}, headers);
        var capabilities = headers['yammer-capabilities'];
        if (capabilities == null) {
          // we're the first
          capabilities = capability;
        } else {
          // else, add our capability, comma-separated
          capabilities = _.union(capabilities.split(','), [capability]).join(',');
        }
        return _.extend(headers, {
          'yammer-capabilities': capabilities
        });
      }

      , _normalizeRequest = function(req) {
          var newReq = _.extend({
            // prefer json data
            dataType: 'json'
          }, req);

          newReq.url = _normalizeURL(newReq.url);

          // normalize / fix jquery options here
          if(newReq.method) {
            newReq.type = newReq.method;
          } else {
            newReq.type = newReq.type || 'GET';
            newReq.method = newReq.type;
          }

          var complete = req.complete;
          newReq.complete = function () {
            if (typeof complete === 'function') {
              complete.apply(this, arguments);
            }
          };

          // Dirty hack to get around jquery erroring on json responses with a
          // single space.
          var oldDataFilter = newReq.dataFilter;
          newReq.dataFilter = function (data, dataType) {
            data = dataType == 'json' && $.trim(data) === '' ?  '{}' : data;
            if (oldDataFilter) {
              data = oldDataFilter(data, dataType);
            }
            return data;
          };

          // Cache busting logic
          if (newReq.method && newReq.method.toLowerCase() == 'get'){
            var bust = new Date().getTime() + Math.floor(Math.random() * 255);

            requestObj.util.addData(newReq, {_: bust});
          }

          // add custom capabilities headers if we're talking to the workfeed API
          // the workfeed API also supports this in the CORS OPTIONS request
          if (newReq.url.indexOf(yuri.api()) === 0) {
            var headers = req.headers || {};
            newReq.headers = _withCapability(headers, 'external-messaging');
          }

          // don't clobber beforeSend
          var beforeSend = req.beforeSend;
          newReq.beforeSend = function() {
            // call our custom handler that will authenticate if necessary
            if(_beforeSendHandler.apply(this, arguments) === false) { return false; }

            // TODO: if _beforeSendHandler has to do async stuff to authenticate,
            // it will cancel the request and this won't get called
            // until the retry.
            // That's a potential source of weird bugs. But generally okay.
            if(typeof beforeSend === 'function') {
              if(beforeSend.apply(this, arguments) === false) { return false; }
            }

            return true;
          };

          return newReq;
        }

      , _beforeSendHandler = function(xhr) {
          var authenticator = _getAuthenticator(this, xhr)
            , ret;
          if(authenticator && typeof authenticator.beforeSend === 'function') {
            // call authenticator and return value to allow cancelling
            ret = authenticator.beforeSend(xhr, this);
          }

          return ret;
        }

      , _send = function(req) {
          req = _normalizeRequest(req);
          var args = Array.prototype.slice.call(arguments, 1);
          args.unshift(req);
          var handle = _createHandle(req);

          _ensureInit(function () {
            _log('sending:', args, 'with requester:', _requester, 'authenticator:', _getAuthenticator(req));
            handle.xhr = _requester.send.apply(_requester, args);
          });

          return handle;
        }

      // retry request, skip normalization, etc.
      , _resend = function() {
          var args = Array.prototype.slice.call(arguments);
          _log('resending:', args, 'with requester:', _requester, 'authenticator:', _getAuthenticator(args[0]));
          _requester.send.apply(_requester, args);
        }

      // request handle functions
      , _wrapHandleFunc = function (handle, options, evt){
          if (evt === "error") {
            options.error = _unauthorizedHandler(handle, options);
          }

          var func = options[evt];

          var wrapper = function () {
            if (this.category) { _removeHandle(this); }
            if(evt === 'complete') {
              this._inFlight = false;
            }
            if (this._isCancelled){ return; }
            if (func) {
              return func.apply(options, arguments);
            }
          };

          return _.bind(wrapper, handle);
        }

      // modify request handler with special behaviour for 401s
      , _unauthorizedHandler = function (handle, options){
          var errFunc = options.error || function() {};

          //if we are requesting a uri from a domain which is not on our server
          //then options.url will contain // but not yam.config().baseURI
          //in this case, we ignore everything below and return the original error handler
          //we also bail if there is no url present

          if (!options.url || options.url.indexOf('//') >= 0 && options.url.indexOf(yam.config().baseURI) < 0) {
            return errFunc;
          }

          var redirectHome = function(errObj) {
            //it's either going to be a 200, 401 or a 500 here
            //only in the case of a 401, we need to log the user out immediately
            //everything else is 'safe'

            if (errObj.status == 401) {
              _request({
                type: 'POST'
                , url: "/logout"
                , data: { authenticity_token: requestObj.util.authenticityToken(), _method: 'delete' }
                , success: function() { yam.window.location.href("/logout_landing"); }
              });
            }
          };

          var verifySessionActivity = function(errObj, errStatus, errName) {
            //immediately call the request error handler. there is no harm in doing this prior to receiving the response from the session validation service
            errFunc.apply(handle, [errObj, errStatus, errName]);

            var validate_url = yuri.app() + '/account_activity/validate_session';

            if ((errObj.status == 401 || errObj.status == 403) && validate_url.indexOf(options.url) < 0) { //sometimes we use a 403 when we really mean a 401, need to check for both
              //at this point, we hit the session management endpoint to check if the user really *is* logged out
              //if the user really *is* logged out, we bounce them. if not, let the error handler deal with it

              //do ajax post to /api/int/account_activity/validate_session

              //200 means they are valid, no need to do anything
              //401 response from that service means user is logged out - bounce them to log in
              //any other response is not expected.

              if (yam.getCurrentUser()) {
                _request({
                  type: 'POST'
                  , url: validate_url
                  , data: {oauth_token: yam.getCurrentUser().web_oauth_access_token}
                  , success: function(){}
                  , error: redirectHome
                });
              }
            }

            return;
          };

          return verifySessionActivity;
        }

      , _createHandle = function(req) {
          var RequestHandle = _RequestHandle;
          var handle = new RequestHandle(req);
          handle._inFlight = true;

          req.success  = _wrapHandleFunc(handle, req, 'success');
          req.error = _wrapHandleFunc(handle, req, 'error');
          req.complete = _wrapHandleFunc(handle, req, 'complete');

          if(req.category) {
            handle.category = req.category;
            _addHandle(handle);
          }

          return handle;
        }

      , _getRequestHandles = function (){
          return _handles;
        }

      , _getHandles = function(category) {
          var handles;
          if (category === '*'){
            handles = {};
            for (category in _handles){
              yam.mixin(handles, _handles[category]);
            }
          } else {
            handles = _handles[category];
          }

          return handles || {};
        }

      , _addHandle = function(handle) {
          var category = handle.category;
          _handles[category] = _handles[category] || {};
          _handles[category][handle.id] = handle;
        }

      , _removeHandle = function(handle) {
          var category = handle.category;
          if (_handles[category] && _handles[category][handle.id]){
            _handles[category][handle.id] = null;
            delete _handles[category][handle.id];
          }

          if(_.isEmpty(_handles[category])) {
            _handles[category] = null;
            delete _handles[category];
          }
        }

      , _cancel = function (category){
          var handles = _getHandles(category);
          for (var id in handles){
            handles[id].cancel();
          }
        };



    // Public methods
    // --------------

    // #commonjs
    this.util = {
      isChangeRequest: function(req) {
        var type = req.type.toLowerCase();
        return type !== 'get' && type !== 'head';
      }
      , reEncoded: /application\/x-www-form-urlencoded/i
      , isURLEncoded: function(req) {
        return typeof req.contentType === 'undefined' ||
          this.reEncoded.test(req.contentType);
      }
      , addData: function(req, newData) {
        if(!newData) { return; }

        req.data = req.data || '';

        // Whether data is an object or string, keep it that way
        if(typeof req.data  === 'object') {
          if(typeof newData === 'string') {
            newData = yam.objectify(newData);
          }
          req.data = _.extend(req.data, newData);
        } else {
          if(typeof newData === 'object') {
            newData = yam.paramify(newData, {includeEmpty:true});
          }
          req.data += '&' + newData;
        }
      }
      , addAuthenticationParams: function (req, xhr, authenticator, networkId) {
        var header
          , authHeaders
          , params;

        if(typeof authenticator.getAuthenticationHeaders === 'function') {
          authHeaders = authenticator.getAuthenticationHeaders(networkId);

          // Need to add the headers to the request object
          // Otherwise they don't get passed down to XHR frame
          if(!req.headers) { req.headers = {}; }
          _.extend(req.headers, authHeaders);

          for(header in authHeaders) {
            xhr.setRequestHeader(header, authHeaders[ header ]);
          }
        }

        // For destructive actions, may need to add query data
        // Can only do this for URL-encoded data
        if(this.isChangeRequest(req) && this.isURLEncoded(req)) {
          if(typeof authenticator.getParamsForWrite === 'function') {
            params = authenticator.getParamsForWrite(networkId);
            this.addData(req, params);
            if(req.data) {
              if(!req.headers) { req.headers = {}; }
              req.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
              xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            }
          }
        }
      }
      // #commmonjs - should this be a config?
      , authenticityToken: function (){
        return "TODO";
      }
    };

    this.getRequester = _getRequester;
    this.setRequester = _setRequester;

    this.getAuthenticator = _getAuthenticator;
    this.setAuthenticator = _setAuthenticator;

    this._getRequestHandles = _getRequestHandles;

    this.cancel = _cancel;

    this.afterInit = function () {};

    // needed for specs to reset the config
    this._updateConfig = _updateConfig;

    // #commonjs
    var _request = function () {
      return _send.apply(requestObj, arguments);
    };

    // #commonjs
    _.extend(_request, this);

    // #commonjs
    // yam._getRequestHandles = yam.request._getRequestHandles;

    // #commonjs
    // yam.cancel = yam.request.cancel;

    return _request;
  })(yam);
});

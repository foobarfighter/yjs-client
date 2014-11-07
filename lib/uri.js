define([
  "./yam"
], function (yam){

  var yuri = {
    /**
     * Resolves the base URI
     */
    base: function () {
      var config = yam.config();
      var base = config && config.baseURI;
      return base || "";
    }

    /**
     * Resolves the base URI
     */
    ,apiBase: function () {
      var apiBase
        , config = yam.config();

      //overwrite the old behavior if expriment is not on
      if (!yam.treatment('yamjs_api_server') && !config.appId) {
        return this.base();
      }



      if (config.apiBaseURI) {
        apiBase = config.apiBaseURI;
      }

      if(!apiBase) {
        //generate from the base
        apiBase = this.base().replace('www.', 'api.');
      }

      return apiBase;

    }

    /**
    * Resolves the service uri base plus the network permalink
    * and appends the relative location
    */
    , app: function (relative) {
      var base = this.base();
      var network = yam.getCurrentNetwork();
      var permalink = network && network.permalink;
      return permalink ? this.join(base, permalink, relative) : this.join(base, relative);
    }

    /**
     * Resolves the yammer api's base uri and appends the location
     */
    , api: function (relative) {
      var prefix = yam.apiPrefix || 'api/v1';
      return this.join(this.apiBase(), prefix, relative);
    }

     , join: function () {
      var parts = [], joined, locIndex;
      for (var i = 0, ii = arguments.length; i < ii; ++i) {
        if (arguments[i]) { parts.push(arguments[i]); }
      }
      joined = parts.join('/');
      if (!arguments[0]) joined = "/" + joined;
      locIndex = joined.indexOf('#');
      // if the character immediatly preceding the a # is a / remove it
      if (locIndex >= 0 && joined.charAt(locIndex - 1) === '/') {
        joined = joined.substring(0, locIndex - 1) + joined.substring(locIndex, joined.length);
      }
      return joined;
    }
  };

  // This is the yammer fork of parseuri.js.
  // Any changes MUST BE IMMEDIATELY pushed back upstream, as this will be
  // copy pasted over.
  // To prevent jsmin from removing copyright, /*! */ is added.
  // =============== BEGIN parseUri =========================

  /*!
  // a node.js module fork of
  // parseUri 1.2.2
  // (c) Steven Levithan <stevenlevithan.com>
  // MIT License
  // see: http://blog.stevenlevithan.com/archives/parseuri
  // see: http://stevenlevithan.com/demo/parseuri/js/
  */

  function parseUri (str) {
    var o   = parseUri.options,
    m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str||''),
    uri = {},
    i   = o.key.length;

    while (i--) {
      uri[o.key[i]] = m[i] || "";
    }

    uri[o.q.name] = yam.objectify(uri.query) || {};

    return uri;
  }

  parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };

  // =========== END parseUri ===========

  if(yuri === undefined) { yuri = {}; }

  /**
   * Parse a URI string into an object with keys representing the relevant parts.
   * See parseUri
   * @param String The uri to parse
   */
  yuri.parse = parseUri;

  /**
   * Join the parts of an object created by yuri.parse into a valid uri. This is
   * not guaranteed to work with custom objects. Also, if you have not modified the
   * parsed object, just use uriObj.source which contains the original string.
   * @param Object an object returned from yuri.parse
   */
  yuri.stringify = function(parsedUrl) {
    var parts = ["protocol","user","password","host","port","directory","file","query","anchor"]
      , uri = ''
      , key;

    for(var i = 0, len = parts.length; i < len; i++) {
      key = parts[i];

      if(key === 'password' && parsedUrl[key]) { uri += ':'; }

      if(key === 'host' && parsedUrl.userInfo) { uri += '@'; }

      if(key === 'port' && parsedUrl[key]) { uri += ':'; }

      if(key === 'anchor' && parsedUrl[key]) { uri += '#'; }

      // Query is a special case. If queryKey was parsed or set to a custom object
      // use that. If it's not there, just use the query string val.
      if(key === 'query' && parsedUrl.queryKey) {
        var queryStr = yam.paramify( parsedUrl.queryKey );
        queryStr = queryStr || parsedUrl[key];
        if(queryStr) {
          uri += '?' + queryStr;
        }
      } else {
        uri += parsedUrl[key];
      }

      if(key === 'protocol' && parsedUrl[key]) {
        uri += '://';
      }
    }

    return uri;
  };

  /**
    @name yuri.replaceParam
    @function
    @description Sets a query parameter in a uri

    @param {Object|String} the uri to modify
    @param {String} the query parameter key to set
    @param {String} the query parameter value

    @returns uri with set query parameter
   */
  yuri.replaceParam = function (uri, param, value){
  //  if (typeof uri == 'string'){
      var obj = yuri.parse(uri);
      obj.queryKey[param] = value;
      return yuri.stringify(obj);
  //  } else {
  //    obj.queryKey[param] = value;
  //    return obj;
  //  }
  };

  /**
    @name yuri.setAbsentParam
    @function
    @description Sets a query parameter in a uri if it is absent

    @param {Object|String} the uri to modify
    @param {String} the query parameter key to set
    @param {String} the query parameter value

    @returns uri with set query parameter
   */
  yuri.setAbsentParam = function (uri, param, value){
    var obj = yuri.parse(uri);
    if(!obj.queryKey[param]) {
      obj.queryKey[param] = value;
    }
    return yuri.stringify(obj);
  };

  yuri.normalize = function (url) {
    if (!url.match(/^[^:\/?#]+:\/\/.*/)) {
      url = 'http://' + url;
    }

    var canonical = [];

    var location = yuri.parse(url);

    if (location.protocol != null) {
      canonical.push(location.protocol.toLowerCase() + ":");
    }
    if (location.authority != null) {
      canonical.push("//" + location.authority);
    }

    var segments = (location.path || '/').split('/');
    var canonSegments = [];
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (segment === '.') {
        continue;
      } else if (segment === '..') {
        canonSegments.pop();
      } else if (segment){
        canonSegments.push(segment);
      }
    }
    canonical.push('/' + (canonSegments.length > 0 ? canonSegments.join('/') : ''));

    if (location.query) {
      canonical.push('?' + location.query);
    }
    if (location.anchor) {
      canonical.push('#' + location.anchor);
    }

    return canonical.join('');
  };

  yuri.isIntranet = function (url) {
    return url.indexOf('.') < 0; // it contains no TLD
  };

  yuri.isInternal = function (url) {
    var list = [
      'www.yammer.dev'
    , 'www.yammer.com'
    , 'www.staging.yammer.com'
    ];

    var host = yuri.parse(url).host;
    return _.contains(list, host);
  };

  yuri.extractThreadId = function (url) {
    var threadId;
    var match;

    var parsed     = yuri.parse(url);
    var webUrl     = parsed.protocol + '://' + parsed.authority + parsed.path;
    var network    = yam.getCurrentNetwork();
    var networkUrl = network.web_url;

    if (webUrl.indexOf(networkUrl) === 0) {
      // Try to match on path.
      match = parsed.path.match(/messages\/(\d+)/);
      if (match != null && match.length > 0) {
        threadId = match[1];
      }
      else {
        // Try to match on anchor.
        match = parsed.anchor.match(/threadId=(\d+)/);
        if (match != null && match.length > 0) {
          threadId = match[1];
        }
      }
    }

    return threadId;
  };

  return yuri;

});

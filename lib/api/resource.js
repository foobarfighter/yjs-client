if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['underscore', '../request'], function (_, request){

  var Resource = function (context, path){
    this._context = context;
    this._path = path;
    this._params = {};
  };

  Resource.prototype.getContext = function (){
    return this._context;
  }

  Resource.prototype.getPath = function (){
    return this._path;
  }

  Resource.prototype.params = function (params){
    _.extend(this._params, params);
    return this;
  }

  Resource.prototype.getParams = function (){
    return this._params;
  }

  Resource.prototype.get = function (callback){
    return this.request('get', callback);
  }

  Resource.prototype.post = function (callback){
    return this.request('post', callback);
  }

  Resource.prototype.put = function (callback){
    return this.request('put', callback);
  }

  Resource.prototype.delete = function (callback){
    return this.request('delete', callback);
  }

  Resource.prototype.request = function (method, callback){
    var success = this._wrapSuccess(callback),
        error   = this._wrapError(callback);

    var options = _.extend({}, this.getContext().getOptions(method), {
      method:  method,
      url:     this.getPath(),
      params:  this.getParams(),
      success: success,
      error:   error
    });

    return request(options);
  }

  Resource.prototype._wrapSuccess = function (callback){
    return _.wrap(callback, function (cb){
      var args = _.toArray(arguments).splice(1);
      args.unshift(null);
      
      return cb.apply(this, args);
    });
  }

  Resource.prototype._wrapError = function (callback){
    return _.wrap(callback, function (cb){
      var e = new Error(arguments[2]);
      e.xhr = arguments[0];
      e.textStatus = arguments[1];
      e.errorThrown = arguments[2];

      return cb(e);
    });
  }

  return Resource;
});

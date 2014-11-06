define([
  'underscore'
, 'jquery'
, 'jquery.cometd'
, './yam'
, './bayeux-monitor'
] , function (_, $, cometd, yam, BayeuxMonitor){
  
  yam.client = {};

  return yam.client.bayeux = (function (){
    var bayeux = {}
      , _EMPTY_FN = function (){};

    var SubscriptionHolder = function(id) {
      this.id = id;
      this._subs = {};

      // track when each SubscriptionHolder was created
      this._timestamp = (new Date()).getTime();
    };
    SubscriptionHolder.prototype = {
      get: function(channel) {
        if(!this.has(channel)) { return null; }

        return this._subs[channel];
      }
      , add: function(channel, handle) {
        if(!this._subs[channel]) {
          this._subs[channel] = [];
        }
        this._subs[channel].push(handle);
      }
      , has: function(channel) {
        if(this._subs[channel] && this._subs[channel].length) {
          return true;
        }
        return false;
      }
      , remove: function(channel) {
        delete this._subs[channel];
      }
      , isEmpty: function() {
        return _.isEmpty(this._subs);
      }
      , clear: function() {
        this._subs = {};
      }
    };
    bayeux.SubscriptionHolder = SubscriptionHolder;

    // Mutable global variables
    var _rtToken
      , _rtUrl
      , _hMonitor
      , _hDisconnect
      , _subscriptions = {};

    // Aliases and helpers for debugging
    bayeux.__subscriptions = yam.client.__subscriptions = _subscriptions;
    bayeux.__hookHandlers = yam.client.__hookHandlers = function (){};

    var _pConnected = null;                 // Used by _connect to determine the status of the connection
    yam.client.__pConnected = _pConnected;  // For debugging

    /**
     * _connect: Initializes the cometd connection
     */
    var _connect = function (url, token){
      // If the client is disconnected or disconnecting, then proceeed.
      if (cometd.getStatus() != 'disconnected' &&
          cometd.getStatus() != 'disconnecting') {
        return _pConnected;
      }

      _hDisconnect = yam.subscribe('/realtime/connection/close', _onDisconnect);

      // Don't reset session variables
      _rtToken = token || _rtToken;
      _rtUrl   = url   || _rtUrl;

      // Set up the connection promise to be used in almost every other server interaction
      // to ensure that we have connected before doing some thing like a subscribe.
      _pConnected = promise.when('connected')
        .otherwise(function (){ yam.log('Could not connect to realtime. Handshake failed.'); });

      var success = function (message){
        if (!message.successful){ return; }

        _pConnected.satisfy('connected');
        cometd.removeListener(hHandshake);
        cometd.removeListener(hConnect);
      };

      // If we get a successful handshake or connect message then we
      // are connected.
      var hHandshake = cometd.addListener('/meta/handshake', success)
        , hConnect   = cometd.addListener('/meta/connect', success);

      cometd.onListenerException = function (e){
        console.error("cometd Listener Exception: ", e);
      };

      // Start monitoring of cometd
      _hMonitor = new BayeuxMonitor();
      _hMonitor.start();

      // disable websockets here
      cometd.websocketEnabled = false;

      // acknowledgement extension
      cometd.ackEnabled = yam.treatment('realtime_ack_ext') ? true : false;

      cometd.configure({ 
        url: url 
      , logLevel: 'none' 
      , backoffIncrement: 45000
      });

      var ext = {
        token: token
      , auth: 'oauth'
      };
      if (yam.treatment('realtime_message_ids')) {
        ext.push_message_bodies = false;
      }

      cometd.handshake({ext: ext});

      return _pConnected;
    };

    /**
     * Get the subscription holder for the given id. If none
     * found, create one
     */
    var _getSubscriptionHolder = function(id) {
      if(!_subscriptions[id]) {
        _subscriptions[id] = new SubscriptionHolder(id);
      }
      return _subscriptions[id];
    };

    var _hasSubscriptionsForChannel = function(channel) {
      return _.any(_subscriptions, function(holder) {
        return holder.has(channel);
      });
    };

    var _hasSubscriptions = function() {
      return _.any(_subscriptions, function(holder) {
        return !holder.isEmpty();
      });
    };

    var _clearSubscriptions = function() {
      _.each(_subscriptions, function(holder) {
        holder.clear();
      });
    };

    var _onDisconnect = function() {
      _clearSubscriptions();
      yam.unsubscribe(_hDisconnect);
      _hDisconnect = null;
    };

    /**
     * Subscribes to an array of channels and ensures that the subscriptions are successful.
     */
    var _ensureSubscriptions = function (channels, options){
      options.onData    = options.onData    || _EMPTY_FN;
      options.onSuccess = options.onSuccess || _EMPTY_FN;
      options.onError   = options.onError   || _EMPTY_FN;

      var _subscriptions = _getSubscriptionHolder(options.id || 'default')
        , handles = [];

      // Set up a promise condition for each new channel
      var p = promise.when.apply(promise, channels)
        .then(yam.curry(null, options.onSuccess, handles));

      // Subscribe to each channel via a cometd batch
      // Batching ensures we make only 1 request to artie during subscription
      cometd.batch(function (){
        _.each(channels, function (channel, index){
          // Satisfies each condition
          var h;
          if(_hasSubscriptionsForChannel(channel)) {
            // We assume we're already registered with the server
            _.defer(function() { p.satisfy(channel); });
          } else {
            // Otherwise we're subscribing with the server, listen for a response
            h = cometd.addListener('/meta/subscribe', function (message){
              if (message.subscription == channel && message.successful){
                p.satisfy(channel);
              }
            });

            // clean up
            p.then(yam.curry(cometd, 'removeListener', h));
            p.otherwise(yam.curry(cometd, 'removeListener', h));
          }

          // If a subscription already exists for this channel, remove the existing listener
          // We'll add a fresh one during the resubscription.
          var subs = _subscriptions.get(channel);
          if (subs){
            _.each(subs, function(s) {
              cometd.removeListener(s);
            });
            _subscriptions.remove(channel);
          }

          // Capture subscription handle
          var handle = cometd.subscribe(channel, options.onData);
          _subscriptions.add(channel, handle);
          handles[index] = handle;
        });
      });

      // Call the error callback after we have cleaned up any handlers for these channel subscriptions.
      // (See previous otherwise blocks)
      p.otherwise(function (){
        yam.log('subscription failure: ' + channels.join(', '), options.onError);
        options.onError();
      });
    };

    // Public methods
    /**
     * Ensures that the client is connected first and then subscribes
     * the client to the channels.
     */
    bayeux.subscribe = function (options){
      options = options || {};

      var pConnected = _connect(options.url, options.token);

      // Ensure connectedness
      pConnected.then(function (){
        _ensureSubscriptions(options.channels || [], options);
      }).otherwise(options.onError);
    };

    /**
     * Unsubscribes all channels specified in options.channels
     */
    bayeux.unsubscribe = function(options) {
      options.onSuccess = options.onSuccess || _EMPTY_FN;
      options.onError = options.onError || _EMPTY_FN;

      var _subscriptions = _getSubscriptionHolder(options.id || 'default')
        , err
        , p = promise.when.apply(promise, options.channels);

      p.then(yam.bind(options, 'onSuccess'))
        .otherwise(yam.curry(options, 'onError', err));

      cometd.batch(function (){
        _.each(options.channels, function (channel){
          var h;

          if (_hasSubscriptionsForChannel(channel)){
            h = cometd.addListener('/meta/unsubscribe', function(message) {
              if(message.subscription == channel) {
                if(message.successful) {
                  p.satisfy(channel);
                  _subscriptions.remove(channel);
                  if (_subscriptions.isEmpty()) {
                    delete bayeux._subscriptions[_subscriptions.id];
                  }
                } else {
                  err = new Error(message.error);
                }
              }
            });

            // clean up
            p.then(yam.curry(cometd, 'removeListener', h));
            p.otherwise(yam.curry(cometd, 'removeListener', h));

            var subs = _subscriptions.get(channel);
            if(subs) {
              _.each(subs, function(s) {
                cometd.unsubscribe(s);
              });
            }
          } else {
            // no subs to remove
            _.defer(function() { 
              p.satisfy(channel); 
              if (_subscriptions.isEmpty()) {
                delete bayeux._subscriptions[_subscriptions.id];
              }
            });
          }
        });
        if (!_hasSubscriptions()) { cometd.disconnect(); }
      });
    };

    /**
     * Disconnect and subscribe all listeners from all channels
     */
    bayeux.disconnect = function (){
      cometd.disconnect();
    };

    /**
     * Publishes a message on the given channel, containing the given content.
     * @param channel the channel to publish the message to
     * @param content the content of the message (in JSON)
     */
    bayeux.publish = function(channel, content) {
      // cometd.publish() accepts two additional optional parameters which
      // can be exposed if required:
      //    publishProps - an object to be merged with the publish message
      //    publishCallback - a callback that is invoked once the server has 
      //                      actually published the message
      cometd.publish(channel, content);
    };

    /**
     * Alias the status of the connection
     */
    bayeux.getStatus = cometd.getStatus;

    bayeux._subscriptions = _subscriptions;

    return bayeux;
  })();
});

if (typeof define !== 'function') { var define = require('amdefine')(module) }

/**
 *  Adds a cometd listener to '/meta/splatsplat' (all events on the meta channel)
 *  and listens for /meta/connect and /meta/disconnect.
 *
 *  Broadcasts connect and disconnect events using yam.publish on these topics:
 *    CONNECTED:      '/realtime/connection/connected'
 *    RECONNECTED:    '/realtime/connection/reconnected'
 *    INTERRUPTED:    '/realtime/connection/interrupted'
 *    REESTABLISHING:  '/realtime/connection/REESTABLISHING'
 *    DISCONNECTED:   '/realtime/connection/close'
 *
 *  Usage: var monitor = new yam.client.BayeuxMonitor();
 *         monitor.start();
 *         yam.subscribe(monitor.CONNECTED, callbackFunction);
 */
define([
  'underscore',
  './yam',
  'jquery.cometd'
// , 'yam.$.cometd'
], function (_, yam, cometd){

  var BayeuxMonitor = function (){
    this.init();
  };

  _.extend(BayeuxMonitor.prototype, {

    // Monitor state pub/sub topics
      CONNECTED:      '/realtime/connection/connected'
    , RECONNECTED:    '/realtime/connection/reconnected'
    , INTERRUPTED:    '/realtime/connection/interrupted'
    , REESTABLISHING: '/realtime/connection/reestablishing'
    , DISCONNECTED:   '/realtime/connection/close'
    , FAILURE:        '/realtime/connection/failure'

    // 40 failed requests and responses
    // with an incremental backoff of 45s, this would allow for retries up to 60m
    , FAILURE_THRESHOLD: 40

    // Amount of time to determine when to throttle
    , RECONNECT_PERIOD: 300000

    // maximum number of subscriptions to bayeux
    , SUBSCRIPTION_LIMIT: 15

    , init: function (){
      // The cometd listener that is listening to /meta/**
      this._cometdListener = null;

      // State variables
      this._isConnected  = false;
      this._hasConnected = false;
      this._wasConnected = false;
      this._hasFailed    = false;
      this._handshakeRetries = 0;
      this._lastReconnectTime = 0;

      // track whether the error received from Artie said we timed out
      this._sessionTimedOut = false;

      // throttle this function to limit the number of reconnections that
      // are published -- matches the workfeed desktop throttling time value
      this._throttledPublish = _.throttle(_.bind(this._publish, this), this.RECONNECT_PERIOD);
    }

    , start: function (){
      this._cometdListener = cometd.addListener('/meta/**', _.bind(this._onMessage, this));
    }

    , stop: function (){
      cometd.removeListener(this._cometdListener);
      this._cometdListener = null;
    }

    , _onMessage: function (message){
        switch (message.channel){
          case '/meta/handshake':
            // Fail realtime if we can't connect immediately
            if (!message.successful && !this._hasConnected && !this._hasFailed && (++this._handshakeRetries >= this.FAILURE_THRESHOLD)){
              this._hasFailed = true;
              this._publish(this.FAILURE);
            }
            break;

          case '/meta/connect':
            this._wasConnected = this._isConnected;
            this._isConnected  = message.successful === true;

            // Never been connected and gained connection == CONNECTED
            if (this._isConnected && !this._hasConnected && !this._wasConnected){
              this._publish(this.CONNECTED);
            }
            // Was connected but lost connection == REESTABLISHING
            else if (!this._isConnected && this._hasConnected && !this._wasConnected){
              this._publish(this.REESTABLISHING);
            }
            // Was connected, lost connection, regained connection == RECONNECTED
            else if (this._isConnected && this._hasConnected && !this._wasConnected){
              this._publishReconnect();
            }
            // Was connected and lost connection == INTERRUPTED
            else if (!this._isConnected && this._wasConnected){
              this._publish(this.INTERRUPTED);

              // If the error we received from Artie is a 402, we've timed out
              // We could time out for multiple reasons -- sleep/standby or Artie rebalancing
              this._sessionTimedOut = (message.error && message.error.indexOf('402::Unknown client') != -1);

            }

            this._hasConnected = this._hasConnected || this._isConnected;
            break;

          case '/meta/disconnect':
            this._isConnected = this._wasConnected = this._hasConnected = false;
            this._publish(this.DISCONNECTED);
            break;

          case '/meta/subscribe':
            this._limitSubscriptions();
            break;
        }
    }

    , _limitSubscriptions: function() {
      // need to enforce a subscription limit
      var subscriptions = yam.client.bayeux._subscriptions;
      var trim = _.size(subscriptions) - this.SUBSCRIPTION_LIMIT;
      if (trim > 0) {
        // trim off old clients and subscriptions
        // find all unimportant feeds, ordered by oldest to newest
        // and dispatch a kill event
        _.chain(subscriptions)
          .sortBy(function(sub) { // sortBy is in ascending order (older first)
            return sub._timestamp;
          })
          .each(function(sub) {
            // if there are subscriptions to kill
            if (trim > 0 && /(?:in_group|from_user|about_topic|in_thread)/.test(sub.id)) {
              trim--;
              this._publish('/realtime/client/stop', sub.id);
            }
          }, this);
      }
    }

    , _publishReconnect: function() {
      // track the last time instead of using a count because
      // throttling should only occur when clients have connection issues.
      // a client could have a spurt of issues but stabilize and
      // we shouldn't keep them perpetually throttled.
      var now = (new Date()).getTime();

      // if the session timed out, delay a publish
      if (this._sessionTimedOut) {
        // jitter to avoid thundering herd of requests when
        // thousands of yamjs clients have been simultaneously disconnected
        // min of 30s, max of 3m
        var jitter = Math.max(30000, Math.floor(Math.random() * 180000));
        _.delay(_.bind(this._publish, this), jitter, this.RECONNECTED);

        this._sessionTimedOut = false;

      } else if ((now - this._lastReconnectTime) < this.RECONNECT_PERIOD) {
        // Start throttling the reconnects if we keep getting disconnected
        this._throttledPublish(this.RECONNECTED);
      } else {
        this._publish(this.RECONNECTED);
      }

      this._lastReconnectTime = now;
    }

    , _publish: function (){
      // this._ylog('publishing connection event: ', arguments[0]);
      yam.publish.apply(yam, arguments);
    }

    , _ylog: function(){
      // var args = _.toArray(arguments);
      // args.unshift('--> yam.client.bayeux: ');
      // console.log.apply(console, args);
    }

  });

  return BayeuxMonitor;
});

if (typeof define !== 'function') { var define = require('amdefine')(module) }


// FIXME: Rewrite spec to run under nodejs
(function (){
if (typeof global !== 'undefined') {
  console.warn("Not running bayeux-monitor-spec.js under nodejs");
  return;
}

define([
  "underscore",
  "yam-core/yam",
  "../lib/bayeux-monitor"
], function(_, yam, BayeuxMonitor){

  // An inbox that collects pubsub events.
  // Event assertions are asserted in the order that they were collected.
  var OrderedInbox = function (c){
    this._context = c || {};
    this._events = [];
    this._subscriptions = [];

    this.reset = function(){
      for (var i = 0, ii = this._subscriptions.length; i < ii; ++i){
        yam.unsubscribe(this._subscriptions[i]);
      }
    };

    this.assertEvent = function(topic){
      expect(this._events.shift()).toEqual(topic);
    }

    this.assertEmpty = function(){
      expect(this._events.length).toBe(0);
    }

    this.on = function(topic){
      var self = this;
      this._subscriptions.push(yam.subscribe(topic, function(){
        self._events.push(topic);
      }));
    }
  };


  describe('connectivity events', function (){
    var inbox, monitor;

    beforeEach(function(){
      monitor = new BayeuxMonitor();
      monitor.start();

      inbox = new OrderedInbox();
      inbox.on('/realtime/connection/connected');
      inbox.on('/realtime/connection/reconnected');
      inbox.on('/realtime/connection/interrupted');
      inbox.on('/realtime/connection/reestablishing');
      inbox.on('/realtime/connection/failure');
    });

    afterEach(function(){
      inbox.assertEmpty();
      inbox.reset();
      monitor.stop();
    });

    function play(){
      _.each(arguments, function (message){
        monitor._onMessage(message);
      });
    }

    describe('connected and authorized', function(){
      it('isConnected returns true and it fires the connected event', function(){
        play(
            { channel: '/meta/connect', successful: true }
          , { channel: '/meta/connect', successful: true }
        );
        inbox.assertEvent('/realtime/connection/connected');
      });
    });

    describe('when a connection is interrupted', function(){
      it('fires the interrupted event', function(){
        play(
            { channel: '/meta/connect', successful: true  }
          , { channel: '/meta/connect', successful: false }
        );

        inbox.assertEvent('/realtime/connection/connected');
        inbox.assertEvent('/realtime/connection/interrupted');
      });
    });

    describe('when a connection has been reconnected', function(){
      it('fires the reconnected event', function(){
        play(
            { channel: '/meta/connect', successful: true  }
          , { channel: '/meta/connect', successful: false }
          , { channel: '/meta/connect', successful: true  }
        );

        inbox.assertEvent('/realtime/connection/connected');
        inbox.assertEvent('/realtime/connection/interrupted');
        inbox.assertEvent('/realtime/connection/reconnected');
      });
    });

    describe('when the connection is reestablishing', function(){
      it('fires the reestablishing event', function(){
        play(
            { channel: '/meta/connect', successful: true  }
          , { channel: '/meta/connect', successful: false }
          , { channel: '/meta/connect', successful: false }
          , { channel: '/meta/connect', successful: false }
          , { channel: '/meta/connect', successful: true  }
        );

        inbox.assertEvent('/realtime/connection/connected');
        inbox.assertEvent('/realtime/connection/interrupted');
        inbox.assertEvent('/realtime/connection/reestablishing');
        inbox.assertEvent('/realtime/connection/reestablishing');
        inbox.assertEvent('/realtime/connection/reconnected');
      });
    });

    describe('when the connection has never connected and fails n times', function (){
      it('fires the failure event', function (){
        var events = _.times(BayeuxMonitor.prototype.FAILURE_THRESHOLD, function() {
          return { channel: '/meta/handshake', successful: false };
        });

        play.apply(null, events);

        inbox.assertEvent('/realtime/connection/failure');
      });
    });

  });
});

})();

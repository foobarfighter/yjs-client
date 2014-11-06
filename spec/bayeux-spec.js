if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  "../lib/bayeux",
  "../lib/yam",
  "jasmine-ajax"
], function(bayeux, yam) {
  "use strict";

  // FIXME: Rewrite spec to run under nodejs
  if (typeof global !== 'undefined') {
    console.warn("Not running bayeux-spec.js under nodejs");
    return;
  }

  describe('yam.client.bayeux', function (){
    var subscribe;

    beforeEach(function () {
      jasmine.Ajax.install();
      jasmine.clock().install();
    });

    afterEach(function () {
      // Ensure bayeux is disconnected before each test
      bayeux.disconnect();
      mostRecentAjaxRequest().response({
        status: 200,
        responseText: JSON.stringify({
          successful: true,
          channel: '/meta/disconnect'
        })
      });
      expect(bayeux.getStatus()).toBe('disconnected');
      jasmine.clock().uninstall();
      jasmine.Ajax.uninstall();
    });

    describe('when the client is successfully connected', function () {
      beforeEach(function () {
        subscribe = jasmine.createSpyObj('subscribe', ['onSuccess', 'onData']);
        subscribe.url = '/cometd';
        subscribe.channels = ['/channel1', '/channel2'];
        bayeux.subscribe(subscribe);

        // Success response to /meta/handshake request
        mostRecentAjaxRequest().response({
          status: 200,
          responseText: JSON.stringify({
            supportedConnectionTypes: [ 'long-polling' ],
            successful: true,
            channel: "/meta/handshake"
          })
        });

        // Success response to /meta/subscribe request
        mostRecentAjaxRequest().response({
          status: 200,
          responseText: JSON.stringify([{
            subscription: "/channel1",
            successful: true,
            channel: "/meta/subscribe"
          }, {
            subscription: "/channel2",
            successful: true,
            channel: "/meta/subscribe"
          }])
        });
      });

      it('triggers the onSuccess callback with handles', function () {
        expect(subscribe.onSuccess).toHaveBeenCalled();
        expect(subscribe.onSuccess.calls.mostRecent().args[0])
          .toEqual([[ '/channel1', 0], [ '/channel2', 0]]);
      });

      describe('and the /meta/connect response contains multiple channels', function () {
        beforeEach(function () {
          // /meta/connect is deferred, so nudge the clock
          jasmine.clock().tick(0);

          // Respond to /meta/connect
          mostRecentAjaxRequest().response({
            status: 200,
            responseText: JSON.stringify([{
              channel: '/channel1',
              data: 'foo'
            }, {
              channel: '/channel2',
              data: 'foo'
            }])
          });
        });

        it('triggers the onData callback for each channel payload', function () {
          expect(subscribe.onData)
            .toHaveBeenCalledWith({ channel: '/channel1', data: 'foo' });
          expect(subscribe.onData)
            .toHaveBeenCalledWith({ channel: '/channel2', data: 'foo' });
        });
      });

      describe('and new channels are subscribed', function () {
        var subscribe2;

        beforeEach(function () {
          subscribe2 = jasmine.createSpyObj('subscribe2', ['onSuccess', 'onData']);
          subscribe2.url = '/cometd';
          subscribe2.channels = ['/channel3', '/channel4'];

          bayeux.subscribe(subscribe2);

          // Success response to /meta/subscribe request
          mostRecentAjaxRequest().response({
            status: 200,
            responseText: JSON.stringify([{
              subscription: "/channel3",
              successful: true,
              channel: "/meta/subscribe"
            }, {
              subscription: "/channel4",
              successful: true,
              channel: "/meta/subscribe"
            }])
          });
        });

        it('triggers the onSuccess callback with handles', function () {
          expect(subscribe2.onSuccess).toHaveBeenCalled();
          expect(subscribe2.onSuccess.calls.mostRecent().args[0])
            .toEqual([[ '/channel3', 0], [ '/channel4', 0]]);
        });

        describe('and the /meta/connect response contains multiple channels', function () {
          beforeEach(function () {
            // Call to /meta/connect is deferred, so nudge the clock
            jasmine.clock().tick(0);

            // Respond to /meta/connect
            mostRecentAjaxRequest().response({
              status: 200,
              responseText: JSON.stringify([{
                channel: '/channel3',
                data: 'foo'
              }, {
                channel: '/channel4',
                data: 'foo'
              }])
            });
          });

          it('triggers the onData callback for each channel payload', function () {
            expect(subscribe2.onData)
              .toHaveBeenCalledWith({ channel: '/channel3', data: 'foo' });
            expect(subscribe2.onData)
              .toHaveBeenCalledWith({ channel: '/channel4', data: 'foo' });
          });
        });
      });

      // FIXME: These currently don't pass because subscribing to an existing
      // channel always unsubscribes the original listener (bayeux.js:201).  It's
      // possible this passed previously because requests were being batched
      // together and therefore skipping the unsubscribe step.
      //
      // describe('and multiple clients subscribe to the same channel', function () {
      //   var subscribe2;

      //   beforeEach(function () {
      //     subscribe2 = jasmine.createSpyObj('subscribe2', ['onSuccess', 'onData']);
      //     subscribe2.url = subscribe.url;
      //     subscribe2.channels = ['/channel1'];

      //     yam.client.bayeux.subscribe(subscribe2);
      //   });

      //   it('notifies all subscribers when /meta/connect is received', function () {
      //     // /meta/connect is deferred, so nudge the clock
      //     jasmine.Clock.tick(0);

      //     // Respond to /meta/connect
      //     mostRecentAjaxRequest().response({
      //       status: 200,
      //       responseText: JSON.stringify([{
      //         channel: '/channel1',
      //         data: 'foo'
      //       }])
      //     });

      //     expect(subscribe.onData).toHaveBeenCalled();
      //     expect(subscribe2.onData).toHaveBeenCalled();
      //   });
      // });

      // describe('and existing channels are subscribed to', function () {
      //   beforeEach(function () {
      //     yam.client.bayeux.subscribe(subscribe);

      //     // Success response to /meta/subscribe request
      //     mostRecentAjaxRequest().response({
      //       status: 200,
      //       responseText: JSON.stringify([{
      //         subscription: "/channel1",
      //         successful: true,
      //         channel: "/meta/subscribe"
      //       },{
      //         subscription: "/channel2",
      //         successful: true,
      //         channel: "/meta/subscribe"
      //       }])
      //     });
      //   });

      //   it('fires onSuccess callback', function () {
      //     expect(subscribe.onSuccess).toHaveBeenCalled();
      //   });
      // });

      describe('and the client unsubscribes', function () {
        var unsubscribe;

        beforeEach(function () {
          unsubscribe = jasmine.createSpyObj('unsubscribe', ['onSuccess']);
          unsubscribe.channels = ['/channel1'];
          bayeux.unsubscribe(unsubscribe);

          // Response to /meta/unsubscribe
          mostRecentAjaxRequest().response({
            status: 200,
            responseText: JSON.stringify({
              successful: true,
              channel: '/meta/unsubscribe'
            })
          });
        });

        it('messages on the unsubscribed channel are ignored', function () {
          // /meta/connect is deferred, so nudge the clock
          jasmine.clock().tick(0);

          // Respond to /meta/connect
          mostRecentAjaxRequest().response({
            status: 200,
            responseText: JSON.stringify([{
              channel: '/channel1',
              data: 'foo'
            }, {
              channel: '/channel2',
              data: 'foo'
            }])
          });

          expect(subscribe.onData)
            .not.toHaveBeenCalledWith({ channel: '/channel1', data: 'foo' });
          expect(subscribe.onData)
            .toHaveBeenCalledWith({ channel: '/channel2', data: 'foo' });
        });
      });

      describe('and the client is successfully disconnected', function () {
        beforeEach(function () {
          bayeux.disconnect();
          mostRecentAjaxRequest().response({
            status: 200,
            responseText: JSON.stringify({
              successful: true,
              channel: '/meta/disconnect'
            })
          });
        });

        it('sets the status to disconnected', function () {
          expect(bayeux.getStatus()).toBe('disconnected');
        })

        // FIXME: This behaviour is triggered when /realtime/connection/close
        // is published by bayeux_monitor.  This probably means the test probably
        // ought to live in bayeux_monitor_spec.  The test itself also relies on
        // observing internals of bayeux, so ought to be rethought entirely, but
        // remains for consistency.
        it('clears all local subscriptions', function () {
          yam.publish('/realtime/connection/close');

          expect(_.all(bayeux.__subscriptions, function (holder) {
            return holder.isEmpty();
          })).toBe(true);
        });
      });
    });

  });
});

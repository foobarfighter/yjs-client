if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['./realtime-client'], function (RealtimeClient) {
    this.exports.RealtimeClient = RealtimeClient;
});

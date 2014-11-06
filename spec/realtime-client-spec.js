if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(["../lib/realtime-client"], function (RealtimeClient){

  describe("loading", function (){
    it("loads", function (){
      expect(new RealtimeClient().foo).toBe(true);
    });
  });

});

if (typeof define !== 'function') { var define = require('amdefine')(module) }

(function (){
// FIXME: Rewrite spec to run under nodejs
if (typeof global !== 'undefined') {
  console.warn("Not running realtime-client-spec.js under nodejs");
  return;
}

define(["../lib/realtime-client"], function (RealtimeClient){

  describe("loading", function (){
    it("loads", function (){
      expect(new RealtimeClient().foo).toBe(true);
    });
  });

});

})();

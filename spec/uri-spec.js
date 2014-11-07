define([
  "../lib/yam",
  "../lib/uri"
], function (yam, yuri){

  describe('uri', function (){
    describe('app', function (){
      it('returns an application URI', function (){
        expect(yuri.app()).toBe("/");
        expect(yuri.app('test')).toBe("/test");

        spyOn(yuri, "base").and.returnValue("https://www.staging.yammer.com");
        expect(yuri.app()).toBe("https://www.staging.yammer.com");
        expect(yuri.app('test')).toBe("https://www.staging.yammer.com/test");

        spyOn(yam, 'getCurrentNetwork').and.returnValue({ permalink: 'foo' });
        expect(yuri.app('bar')).toBe("https://www.staging.yammer.com/foo/bar");
        expect(yuri.app('#something')).toBe("https://www.staging.yammer.com/foo#something");
      });
    });

    describe('api', function (){
      it('returns an API URI', function (){
        expect(yuri.api()).toBe("/api/v1");
        spyOn(yuri, "base").and.returnValue("https://www.staging.yammer.com");
        expect(yuri.api()).toBe('https://www.staging.yammer.com/api/v1');
      });
    });

      var uri
        , control
        , parsedUri
        , uriData = [
          ["http:","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"http\",\"source\":\"http:\",\"queryKey\":{}}"]
          , ["https://","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"https\",\"source\":\"https://\",\"queryKey\":{}}"]
          , ["http://host","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host\",\"protocol\":\"http\",\"source\":\"http://host\",\"queryKey\":{}}"]
          , ["http://host/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"\",\"host\":\"host\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host\",\"protocol\":\"http\",\"source\":\"http://host/\",\"queryKey\":{}}"]
          , ["http://host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"http\",\"source\":\"http://host.com\",\"queryKey\":{}}"]
          , ["http://subdomain.host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"subdomain.host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"subdomain.host.com\",\"protocol\":\"http\",\"source\":\"http://subdomain.host.com\",\"queryKey\":{}}"]
          , ["http://host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com:81\",\"protocol\":\"http\",\"source\":\"http://host.com:81\",\"queryKey\":{}}"]
          , ["http://user@host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"http\",\"source\":\"http://user@host.com\",\"queryKey\":{}}"]
          , ["http://user@host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user@host.com:81\",\"queryKey\":{}}"]
          , ["http://user:@host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user:\",\"authority\":\"user:@host.com\",\"protocol\":\"http\",\"source\":\"http://user:@host.com\",\"queryKey\":{}}"]
          , ["http://user:@host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user:\",\"authority\":\"user:@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:@host.com:81\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"?query=\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["http://user:pass@host.com:81#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81#anchor\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/#anchor\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/\",\"path\":\"/file.ext\",\"relative\":\"/file.ext\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/file.ext\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory\",\"path\":\"/directory\",\"relative\":\"/directory\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"/directory\",\"path\":\"/directory\",\"relative\":\"/directory?query=\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["http://user:pass@host.com:81/directory#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory\",\"path\":\"/directory\",\"relative\":\"/directory#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory#anchor\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory/?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/?query=\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["http://user:pass@host.com:81/directory/#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/#anchor\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory/sub.directory/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory/sub.directory/\",\"path\":\"/directory/sub.directory/\",\"relative\":\"/directory/sub.directory/\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/sub.directory/\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory/sub.directory/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/directory/sub.directory/\",\"path\":\"/directory/sub.directory/file.ext\",\"relative\":\"/directory/sub.directory/file.ext\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/sub.directory/file.ext\",\"queryKey\":{}}"]
          , ["http://user:pass@host.com:81/directory/file.ext?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"file.ext\",\"directory\":\"/directory/\",\"path\":\"/directory/file.ext\",\"relative\":\"/directory/file.ext?query=\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/file.ext?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["http://user:pass@host.com:81/directory/file.ext?query=1&test=2","{\"anchor\":\"\",\"query\":\"query=1&test=2\",\"file\":\"file.ext\",\"directory\":\"/directory/\",\"path\":\"/directory/file.ext\",\"relative\":\"/directory/file.ext?query=1&test=2\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/file.ext?query=1&test=2\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , ["http://user:pass@host.com:81/directory/file.ext?query=1#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1\",\"file\":\"file.ext\",\"directory\":\"/directory/\",\"path\":\"/directory/file.ext\",\"relative\":\"/directory/file.ext?query=1#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"http\",\"source\":\"http://user:pass@host.com:81/directory/file.ext?query=1#anchor\",\"queryKey\":{\"query\":\"1\"}}"]
          , ["//host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"//host.com\",\"queryKey\":{}}"]
          , ["user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1&test=2\",\"file\":\"file.ext\",\"directory\":\"/direc.tory/\",\"path\":\"/direc.tory/file.ext\",\"relative\":\"/direc.tory/file.ext?query=1&test=2#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"\",\"source\":\"user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , ["/directory/sub.directory/file.ext?query=1&test=2#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1&test=2\",\"file\":\"file.ext\",\"directory\":\"/directory/sub.directory/\",\"path\":\"/directory/sub.directory/file.ext\",\"relative\":\"/directory/sub.directory/file.ext?query=1&test=2#anchor\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/directory/sub.directory/file.ext?query=1&test=2#anchor\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , ["/directory/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/directory/\",\"queryKey\":{}}"]
          , ["/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/\",\"path\":\"/file.ext\",\"relative\":\"/file.ext\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/file.ext\",\"queryKey\":{}}"]
          , ["/?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/?query=\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["/#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/#anchor\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/#anchor\",\"queryKey\":{}}"]
          , ["/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"/\",\"queryKey\":{}}"]
          , ["?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"?query=\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["?query=1&test=2#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1&test=2\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"?query=1&test=2#anchor\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"?query=1&test=2#anchor\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , ["#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"#anchor\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"#anchor\",\"queryKey\":{}}"]
          , ["path/to/file","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/to/file\",\"path\":\"/to/file\",\"relative\":\"/to/file\",\"port\":\"\",\"host\":\"path\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"path\",\"protocol\":\"\",\"source\":\"path/to/file\",\"queryKey\":{}}"]
          , ["foohost","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"foohost\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"foohost\",\"protocol\":\"\",\"source\":\"foohost\",\"queryKey\":{}}"]
          , ["192.168.1.1","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"192.168.1.1\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"192.168.1.1\",\"protocol\":\"\",\"source\":\"192.168.1.1\",\"queryKey\":{}}"]
          , ["host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com\",\"queryKey\":{}}"]
          , ["host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com:81\",\"protocol\":\"\",\"source\":\"host.com:81\",\"queryKey\":{}}"]
          , ["host.com:81/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com:81\",\"protocol\":\"\",\"source\":\"host.com:81/\",\"queryKey\":{}}"]
          , ["host.com?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"?query=\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["host.com#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"#anchor\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com#anchor\",\"queryKey\":{}}"]
          , ["host.com/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com/\",\"queryKey\":{}}"]
          , ["host.com/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/\",\"path\":\"/file.ext\",\"relative\":\"/file.ext\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com/file.ext\",\"queryKey\":{}}"]
          , ["host.com/directory/?query=","{\"anchor\":\"\",\"query\":\"query=\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/?query=\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com/directory/?query=\",\"queryKey\":{\"query\":\"\"}}"]
          , ["host.com/directory/#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"/directory/\",\"path\":\"/directory/\",\"relative\":\"/directory/#anchor\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com/directory/#anchor\",\"queryKey\":{}}"]
          , ["host.com/directory/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/directory/\",\"path\":\"/directory/file.ext\",\"relative\":\"/directory/file.ext\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"\",\"source\":\"host.com/directory/file.ext\",\"queryKey\":{}}"]
          , ["host.com:81/direc.tory/file.ext?query=1&test=2#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1&test=2\",\"file\":\"file.ext\",\"directory\":\"/direc.tory/\",\"path\":\"/direc.tory/file.ext\",\"relative\":\"/direc.tory/file.ext?query=1&test=2#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com:81\",\"protocol\":\"\",\"source\":\"host.com:81/direc.tory/file.ext?query=1&test=2#anchor\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , ["user@host.com","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"\",\"source\":\"user@host.com\",\"queryKey\":{}}"]
          , ["user@host.com:81","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com:81\",\"protocol\":\"\",\"source\":\"user@host.com:81\",\"queryKey\":{}}"]
          , ["user@host.com/","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"\",\"source\":\"user@host.com/\",\"queryKey\":{}}"]
          , ["user@host.com/file.ext","{\"anchor\":\"\",\"query\":\"\",\"file\":\"file.ext\",\"directory\":\"/\",\"path\":\"/file.ext\",\"relative\":\"/file.ext\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"\",\"source\":\"user@host.com/file.ext\",\"queryKey\":{}}"]
          , ["user@host.com?query","{\"anchor\":\"\",\"query\":\"query\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"?query\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"\",\"source\":\"user@host.com?query\",\"queryKey\":{\"query\":\"\"}}"]
          , ["user@host.com#anchor","{\"anchor\":\"anchor\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"#anchor\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"user\",\"userInfo\":\"user\",\"authority\":\"user@host.com\",\"protocol\":\"\",\"source\":\"user@host.com#anchor\",\"queryKey\":{}}"]
          , ["user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor","{\"anchor\":\"anchor\",\"query\":\"query=1&test=2\",\"file\":\"file.ext\",\"directory\":\"/direc.tory/\",\"path\":\"/direc.tory/file.ext\",\"relative\":\"/direc.tory/file.ext?query=1&test=2#anchor\",\"port\":\"81\",\"host\":\"host.com\",\"password\":\"pass\",\"user\":\"user\",\"userInfo\":\"user:pass\",\"authority\":\"user:pass@host.com:81\",\"protocol\":\"\",\"source\":\"user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor\",\"queryKey\":{\"query\":\"1\",\"test\":\"2\"}}"]
          , [true,"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"true\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"true\",\"protocol\":\"\",\"source\":\"true\",\"queryKey\":{}}"]
          , [false,"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"\",\"queryKey\":{}}"]
          , ["","{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"\",\"queryKey\":{}}"]
          , [null,"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"\",\"queryKey\":{}}"]
          , [[],"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"\",\"protocol\":\"\",\"source\":\"\",\"queryKey\":{}}"]
          , [["http://host.com/"],"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"/\",\"path\":\"/\",\"relative\":\"/\",\"port\":\"\",\"host\":\"host.com\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"host.com\",\"protocol\":\"http\",\"source\":\"http://host.com/\",\"queryKey\":{}}"]
          , [{},"{\"anchor\":\"\",\"query\":\"\",\"file\":\"\",\"directory\":\"\",\"path\":\"\",\"relative\":\"\",\"port\":\"\",\"host\":\"[object Object]\",\"password\":\"\",\"user\":\"\",\"userInfo\":\"\",\"authority\":\"[object Object]\",\"protocol\":\"\",\"source\":\"[object Object]\",\"queryKey\":{}}"]
        ];

      // These are special cases that work for parsing, but cannot be
      // re-stringified in an unambiguous way
      var skip = function() {
        switch(uri) {
          case 'http:':
          case 'http://user:@host.com':
          case 'http://user:@host.com:81':
          case '//host.com':
          case 'user@host.com?query':
            return true;
          default:
            return false;
        }
      };

    describe('parse', function() {
      it('parses all valid uris', function() {
        for(var i = 0, len = uriData.length; i < len; i++) {
          uri = uriData[i][0];
          control = JSON.parse(uriData[i][1]);
          parsedUri = yuri.parse(uri);
          expect( parsedUri ).toEqual(control);
        }
      });
    });

    describe('stringify', function() {
      it('stringifys valid parsed objects', function() {
        for(var i = 0, len = uriData.length; i < len; i++) {
          uri = uriData[i][0];

          if(skip(uri)) { continue; }

          parsedUri = yuri.parse(uri);
          if(uri) {
            expect( yuri.stringify(parsedUri) ).toBe(uri+'');
          } else {
            expect( yuri.stringify(parsedUri) ).toBe('');
          }
        }
      });
    });

    describe('replaceParam', function (){
      it('adds a param if it doesn\'t exist or it replaces a param if it exists', function (){
        var uri = "http://example.com?threaded=extended";
        expect(yuri.replaceParam(uri, 'foo', 'bar')).toBe('http://example.com?threaded=extended&foo=bar');
        expect(yuri.replaceParam(uri, 'threaded', false)).toBe('http://example.com?threaded=false');

  //        var parsed = yuri.parse("http://example.com?threaded=extended");
  //        expect(typeof yuri.replaceParam(parsed, 'foo', 'bar')).toBe('object');
  //        expect(yuri.stringify(yuri.replaceParam(parsed, 'foo', 'bar')))
  //          .toBe('http://example.com?threaded=extended&foo=bar');
      });
    });

    describe('.isIntranet', function (){
      it('returns true any URL without a dot', function (){
        expect(yuri.isIntranet('https://msw/')).toBe(true);
      });
      it('returns false for any other URL', function (){
        expect(yuri.isIntranet('http://www.cnn.com/')).toBe(false);
      });
    });

    describe('.isInternal', function (){
      it('returns true for a dev environment URL', function (){
        expect(yuri.isInternal('https://www.yammer.dev/yammer-inc.com/messages/34')).toBe(true);
      });
      it('returns true for a staging environment URL', function (){
        expect(yuri.isInternal('https://www.staging.yammer.com/yammer-inc.com/messages/34')).toBe(true);
      });
      it('returns true for a production environment URL', function (){
        expect(yuri.isInternal('https://www.yammer.com/yammer-inc.com/messages/34')).toBe(true);
      });
      it('returns false for any other URL', function (){
        expect(yuri.isInternal('http://www.cnn.com/2014/01/07/showbiz/honey-boo-boo-wreck/')).toBe(false);
      });
    });

    describe('.extractThreadId', function (){
      beforeEach(function () {
        yam.setCurrentNetwork({
          web_url: 'https://www.yammer.dev/yammer-inc.com'
        });
      });

      it('extracts the thread ID from a normal URL', function (){
        expect(yuri.extractThreadId('https://www.yammer.dev/yammer-inc.com/messages/34')).toBe('34');
      });
      it('extracts the thread ID from a fast-switch URL', function (){
        expect(yuri.extractThreadId('https://www.yammer.dev/yammer-inc.com/#/Threads/show?threadId=34')).toBe('34');
      });
    });
  });

});

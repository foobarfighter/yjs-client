define([
  "underscore",
  "yam-core/yam",
  "yam-core/uri",
  "../lib/request"
], function (_, yam, yuri, yrequest){

  describe('yrequest', function () {
    "use strict";

    var RETRY_TIMEOUT = 10; // the retry waits 10ms - necessary?

    beforeEach(function () {
      jasmine.clock().install();
      jasmine.Ajax.install();

      spyOn(yam, 'getCurrentNetwork').and.returnValue({ id: 'test_network_id' });
      spyOn(yam, 'getCurrentUser').and.returnValue({ id: 1, treatments: {} });
      spyOn(yuri, 'base')
        .and.returnValue(window.location.protocol + '//' + window.location.host);
      jasmine.Ajax.requests.reset();
    });

    afterEach(function () {
      jasmine.clock().uninstall();
      jasmine.Ajax.uninstall();
    });


    describe('behaves like jQuery.ajax,', function () {
      it('calls beforeSend function if supplied', function() {
        var req = jasmine.createSpyObj('req', ['beforeSend']);
        req.url = 'foo';

        yrequest(req);
        expect(req.beforeSend).toHaveBeenCalled();
      });

      it('cancels request if beforeSend returns false', function () {
        var req = jasmine.createSpyObj('req', ['beforeSend', 'success', 'error', 'complete']);
        req.beforeSend.and.returnValue(false);
        req.url = 'foo';

        yrequest(req);
        expect(req.beforeSend).toHaveBeenCalled();

        expect(jasmine.Ajax.requests.mostRecent()).toBe(undefined);

        expect(req.success).not.toHaveBeenCalled();
        expect(req.error).not.toHaveBeenCalled();
        expect(req.complete).not.toHaveBeenCalled();
      });

      it('calls callbacks in the context of request', function () {
        var req = jasmine.createSpyObj('req', ['success', 'error', 'complete']);
        req.url = 'foo';

        req.success.and.callFake(function () {
          expect(this.url).toBe(req.url);
        });
        req.complete.and.callFake(function () {
          expect(this.url).toBe(req.url);
        });

        yrequest(req);
        jasmine.Ajax.requests.mostRecent().response({ status: 200 });
        expect(req.success).toHaveBeenCalled();
        expect(req.complete).toHaveBeenCalled();
      });
    });

    // yrequest supports several custom options over and above those provided by jQuery
    describe('custom option', function() {
      var handle;

      describe('"method"', function() {
        it('works like "type" and overrides it', function() {
          var req = { url: 'foo', method: 'POST' };

          yrequest(req);
          expect(jasmine.Ajax.requests.mostRecent().method).toBe('POST');
        });
      });

      describe('"category"', function() {
        it('tracks the request handle', function() {
          var category = 'test_category',
              handle,
              allHandles;

          handle = yrequest({
            url: 'foo',
            category: category
          });
          expect(handle.category).toEqual(category);

          allHandles = yrequest._getRequestHandles();
          expect(allHandles && allHandles[category]).toBeTruthy();
          expect(allHandles[category][handle.id]).toEqual(handle);
        });
      });

      describe('"auth"', function() {
        it('allows overriding auth method per request', function() {
          var auth, req;

          // Custom authenticator
          auth = jasmine.createSpyObj('auth', ['getAuthenticationHeaders', 'beforeSend']);
          auth._networkId = 'NETWORK_ID';
          auth.getAuthenticationHeaders.and.returnValue({ test: 'header' });
          auth.beforeSend.and.callFake(function (xhr, settings) {
            yrequest.util.addAuthenticationParams(settings, xhr, this, this._networkId);
          });

          // Request object
          req = { url: 'foo', auth: auth };

          yrequest(req);
          expect(auth.beforeSend).toHaveBeenCalled();
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['test']).toBe('header');
        });

        it('allows bypassing authentication', function() {
          var req = { url: 'foo', auth: false };

          yrequest(req);
          expect(_.size(jasmine.Ajax.requests.mostRecent().requestHeaders)).toBe(2);
        });
      });

      describe('"networkId"', function() {
        it('allows overriding the `NETWORK_ID` header', function() {
          var req = { url: 'foo', networkId: 'custom_network_id' };

          yrequest(req);
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['NETWORK_ID'])
            .toBe(req.networkId);
        });
      });
    });

    describe('request handle', function() {
      it('is returned from each request', function() {
        var handle = yrequest({
          url: 'foo'
        });
        expect(handle).toBeTruthy();
        expect(handle.cancel).toEqual(jasmine.any(Function));
      });

      it('can cancel request', function() {
        var req = jasmine.createSpyObj('req', ['success', 'error', 'complete']);
        req.url = 'foo';

        var handle = yrequest(req);
        handle.cancel();
        expect(handle._isCancelled).toBe(true);

        jasmine.Ajax.requests.mostRecent().response({ status: 200 });

        expect(req.success).not.toHaveBeenCalled();
        expect(req.error).not.toHaveBeenCalled();
        expect(req.complete).not.toHaveBeenCalled();
      });

      it('monitors in flight requests (success)', function() {
        var handle,
            req = jasmine.createSpyObj('req', ['success', 'complete']);
        req.url = 'foo';

        req.success.and.callFake(function () {
          expect(handle.inFlight()).toBe(true);
        });
        req.complete.and.callFake(function () {
          expect(handle.inFlight()).toBe(false);
        });

        handle = yrequest(req);
        expect(handle.inFlight()).toBe(true);
        jasmine.Ajax.requests.mostRecent().response({ status: 200 });
        expect(req.success).toHaveBeenCalled();
        expect(req.complete).toHaveBeenCalled();
      });

      it('monitors in flight requests (error)', function() {
        var handle,
            req = jasmine.createSpyObj('req', ['error', 'complete']);
        req.url = 'foo';

        req.error.and.callFake(function () {
          expect(handle.inFlight()).toBe(true);
        });
        req.complete.and.callFake(function () {
          expect(handle.inFlight()).toBe(false);
        });

        handle = yrequest(req);
        expect(handle.inFlight()).toBe(true);
        jasmine.Ajax.requests.mostRecent().response({ status: 500 });
        expect(req.error).toHaveBeenCalled();
        expect(req.complete).toHaveBeenCalled();
      });
    });

    describe('basic authenticator', function() {

      beforeEach(function() {
        spyOn(yrequest.util, 'authenticityToken').and.returnValue('test_csrf_token');
      });

      it('adds CSRF token to header', function() {
        yrequest({ url: 'foo' });
        expect(jasmine.Ajax.requests.mostRecent().requestHeaders['X-CSRF-Token'])
          .toBe('test_csrf_token');
      });

      it('does not add CSRF token to GET query params', function() {
        yrequest({ url: 'foo' });
        expect(jasmine.Ajax.requests.mostRecent().url)
          .not.toMatch(/authenticity_token=test_csrf_token/);
      });

      it('adds CSRF token to POST data', function() {
        yrequest({ url: 'foo', method: 'POST', data: { key: 'val' }});
        expect(jasmine.Ajax.requests.mostRecent().requestHeaders['X-CSRF-Token'])
          .toBe('test_csrf_token');
        expect(jasmine.Ajax.requests.mostRecent().params)
          .toMatch(/authenticity_token=test_csrf_token/);
      });

      it('adds network id', function() {
        yrequest({ url: 'foo' });
        expect(jasmine.Ajax.requests.mostRecent().requestHeaders['NETWORK_ID'])
          .toBe('test_network_id');
      });

      describe('when no network is present', function() {
        it('does not include a NETWORK_ID header value', function() {
          yam.getCurrentNetwork.and.returnValue(null);

          yrequest({ url: 'foo' });
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['NETWORK_ID'])
            .toBe('');

          var opts = {
            url: 'foo'
            , beforeSend: function(xhr) {
              expect(xhr.headers['NETWORK_ID']).toBe('');
            }
          };
          spyOn(opts, 'beforeSend').and.callThrough();
        });
      });

      describe('when talking to the workfeed API', function () {
        it('includes a "external-messaging" yammer-capabilities header', function() {
          yrequest({ url: yuri.api() + '/foo/bar' });
          var capabilities = jasmine.Ajax.requests.mostRecent().requestHeaders['yammer-capabilities'] || '';
          expect(capabilities).toContain('external-messaging');
        });
      });

      describe('when not talking to the workfeed API', function () {
        it('does not include a "external-messaging" yammer-capabilities header', function() {
          yrequest({ url: 'foohost/bar/baz' });
          var capabilities = jasmine.Ajax.requests.mostRecent().requestHeaders['yammer-capabilities'] || '';
          expect(capabilities).not.toContain('external-messaging');
        });
      });
    });

    describe('OAuth2 authenticator', function() {
      var oauth
          , authenticator = yrequest.getAuthenticator({auth: 'oauth2'})
          , authToken = authenticator._authToken;

      beforeEach(function() {
        oauth = yrequest.setAuthenticator('oauth2');
        oauth.setAuthToken(null);
        yam.config({appId: '1234'});
      });

      afterEach(function() {
        oauth.setAuthToken(authToken);
        oauth = null;
        yam.config({appId: null});
        yrequest.setAuthenticator(null);
      });

      describe('when an auth token is present', function() {
        beforeEach(function() {
          oauth.setAuthToken('test_oauth_token');
        });

        it('adds OAuth2 token to request', function() {
          yrequest({ url: '/api' });
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['Authorization'])
            .toBe('Bearer test_oauth_token');
        });

        it('does not add OAuth2 token to GET query params', function() {
          yrequest({ url: '/api', method: 'GET' });
          expect(jasmine.Ajax.requests.mostRecent().url)
            .not.toMatch(/access_token=test_oauth_token/);
        });

        it('adds OAuth2 token to POST data', function() {
          yrequest({ url: '/api', method: 'POST', data: { key: 'val' }});
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['Authorization'])
            .toBe('Bearer test_oauth_token');
          expect(jasmine.Ajax.requests.mostRecent().params)
            .toMatch(/access_token=test_oauth_token/);

          // data could also be in string format
          yrequest({ url: '/api', method: 'POST', data: 'key=val' });
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['Authorization'])
            .toBe('Bearer test_oauth_token');
          expect(jasmine.Ajax.requests.mostRecent().params)
            .toMatch(/access_token=test_oauth_token/);
        });

        describe('and a service returns Unauthorized', function() {
          it('re-fetches the auth token once and resends the request', function() {
            var success = jasmine.createSpy('success');
            spyOn(oauth, '_getAuthToken').and.callThrough();

            yrequest({
              url: '/api',
              method: 'POST',
              data: { someKey: 'val', otherKey: 'val2' },
              success: success
            });

            // First request fails with 401
            jasmine.Ajax.requests.mostRecent().response({ status: 401, responseHeaders: { "WWW-Authenticate": "Basic realm=\"intranet\"" }});
            expect(success).not.toHaveBeenCalled();

            // Fetch an auth token
            jasmine.clock().tick(RETRY_TIMEOUT);
            expect(oauth._getAuthToken).toHaveBeenCalled();
            jasmine.Ajax.requests.mostRecent().response({ status: 200, responseText: '{"access_token":"token"}' });

            // Resend the request
            jasmine.Ajax.requests.mostRecent().response({ status: 200 });
            expect(success).toHaveBeenCalled();
          });

          describe('after re-fetching the token', function() {
            it('calls the original error callback', function() {
              var error = jasmine.createSpy('error');
              spyOn(oauth, '_getAuthToken').and.callThrough();

              // call will always fail with 401
              yrequest({
                url: '/fail',
                method: 'POST',
                data: { someKey: 'val', otherKey: 'val2' },
                error: error
              });

              jasmine.Ajax.requests.mostRecent().response({ status: 401, responseHeaders: { "WWW-Authenticate": "Basic realm=\"intranet\"" }});
              //jasmine.Ajax.requests.mostRecent().response({ status: 401 });
              jasmine.clock().tick(RETRY_TIMEOUT);
              expect(oauth._getAuthToken).toHaveBeenCalled();

              jasmine.Ajax.requests.mostRecent().response({ status: 401, responseHeaders: { "WWW-Authenticate": "Basic realm=\"intranet\"" }});
              expect(error).toHaveBeenCalled();
            });
          });
        });
      });

      describe('when an auth token is not present', function() {
        var success
          , error;

        beforeEach(function() {
          spyOn(oauth, '_getAuthToken').and.callThrough();
          success = jasmine.createSpy('success');
          error = jasmine.createSpy('error');

          yrequest({
            url: '/api',
            method: 'POST',
            data: { someKey: 'val', otherKey: 'val2' },
            success: success,
            error: error
          });

          jasmine.clock().tick(RETRY_TIMEOUT);
          expect(oauth._getAuthToken).toHaveBeenCalled();
        });

        describe('and a token can be fetched', function() {
          it('fetches the auth token once before sending request', function(){
            // Auth token request
            jasmine.Ajax.requests.mostRecent().response({ status: 200, responseText: '{"access_token":123}' });

            // Original request retry
            jasmine.Ajax.requests.mostRecent().response({ status: 200 });
            expect(success).toHaveBeenCalled();
          });
        });

        describe('and a token cannot be fetched', function() {
          it('fails the original request', function() {
            // Auth token request
            jasmine.Ajax.requests.mostRecent().response({ status: 401 });
            expect(error).toHaveBeenCalled();
          });
        });
      });
    });

    describe('yam.cancel', function() {
      it('can cancel requests by category', function() {
        var req1 = jasmine.createSpyObj('req', ['success', 'error', 'complete']);
        req1.url = 'foo';
        req1.category = 'test_category';

        var req2 = jasmine.createSpyObj('req2', ['success', 'error', 'complete']);
        req2.url = 'foo';
        req2.category = 'asdf';

        var handle1 = yrequest(req1);
        var xhr1 = jasmine.Ajax.requests.mostRecent();
        var handle2 = yrequest(req2);
        var xhr2 = jasmine.Ajax.requests.mostRecent();

        expect(handle1.category).toBe(req1.category);
        expect(handle2.category).toBe(req2.category);

        yrequest.cancel(req1.category);

        expect(handle1._isCancelled).toBe(true);
        expect(handle2._isCancelled).toBe(false);

        // ensure that callbacks aren't called
        xhr1.response({ status: 200 });
        xhr2.response({ status: 200 });
        expect(req1.complete).not.toHaveBeenCalled();
        expect(req2.complete).toHaveBeenCalled();
      });
    });

    describe('bugs', function() {

      it('can modify url in beforeSend', function() {
        var req = jasmine.createSpyObj('req', ['beforeSend']);
        req.url = 'foo';
        req.beforeSend.and.callFake(function () {
          this.url += '&bar=baz';
        });

        yrequest(req);
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/bar=baz/);
      });

      describe('when the request is a write', function() {
        it('adds default jQuery Content-Type', function() {
          yrequest({
              url: 'foo',
              method: 'POST',
              data: '{"foo":"bar"}'
            });
          expect(jasmine.Ajax.requests.mostRecent().requestHeaders['Content-Type'])
            .toBe($.ajaxSettings.contentType);
        });

        describe('when content type already given', function() {
          it('does not add data or override content type', function() {
            yrequest({
              url: 'foo',
              method: 'POST',
              contentType: 'application/json',
              data: '{"foo":"bar"}'
            });
            expect(jasmine.Ajax.requests.mostRecent().params).toBe('{"foo":"bar"}');
            expect(jasmine.Ajax.requests.mostRecent().requestHeaders['Content-Type'])
              .toBe('application/json');
          });
        });
      });
    });

    describe('Unauthorized API call handler', function() {
      var origUri, scope;

      beforeEach(function() {
        scope = { request: yrequest };

        // chromedriver on chrome 36 can hang when using a url on fast-fail
        spyOn(yam, 'config').and.returnValue({ baseURI: 'foo'} );
        spyOn(yam.window.location, 'href');
      });

      describe('when a request is made to a domain that is not yammer that returns unauthorized', function() {
        var success, error;

        beforeEach(function() {
          success = jasmine.createSpy('success');
          error = jasmine.createSpy('error');

          yrequest({
            url: 'http://www.another.domain.com/some-endpoint',
            success: success,
            error: error
          });
        });

        it('should not redirect the user to /logout for any reason', function() {
          var codes = [
            100, 101,
            200, 201, 202, 203, 204, 205, 206, 207,
            300, 301, 302, 303, 304, 305, 400,
            401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
              415, 416, 417,
            500, 501, 502, 503, 504, 505
          ];
          _.each(codes, function(code) {
            yrequest({ url: '/api' });
            jasmine.Ajax.requests.mostRecent().response({ status: 401 });
            jasmine.clock().tick(RETRY_TIMEOUT);
          });
          expect(yam.window.location.href).not.toHaveBeenCalledWith('/logout');
        });
      });

      describe('when a request is made to an absolute URI that is yammer and the server returns unauthorized', function() {

        var error, success;

        beforeEach(function() {
          success = jasmine.createSpy('success');
          error = jasmine.createSpy('error');

          scope.request({
            url: yam.config().baseURI + '/other-uri',
            success: success,
            error: error
          });

          jasmine.Ajax.requests.mostRecent().response({ status: 401 });
        });

        it('should call the request\'s error callback function on the request', function() {
          expect(error).toHaveBeenCalled();
        });

        it('should validate the session with the server', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/validate_session/);
        });

        it('should redirect the user to /logout if the session is invalid', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          jasmine.Ajax.requests.mostRecent().response({ status: 401 });
          expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/logout/);
        });

        it('should not redirect the user if their session is still valid', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          jasmine.Ajax.requests.mostRecent().response({ status: 200 });
          expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/validate_session/);
          if (yrequest.mostRecentCall) {
            expect(scope.request.calls.mostRecent().args[0].url).not.toMatch(/logout/);
          }
        });

        it('should not redirect the user for anything else but an invalid session', function() {
          var codes = [
            100, 101,
            200, 201, 202, 203, 204, 205, 206, 207,
            300, 301, 302, 303, 304, 305,
            400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412,
              413, 414, 415, 416, 417,
            500, 501, 502, 503, 504, 505
          ];

          _.each(codes, function(code) {
            yrequest({
              url: yam.config().baseURI + '/other-uri',
              error: function (){},
              success: function (){}
            });
            jasmine.Ajax.requests.mostRecent().response({ status: code });
            expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch(/logout/);
          });
        });

      });

      describe('when a request is made to a relative URI and the server returns unauthorized', function() {
        var success, error;

        beforeEach(function() {
          success = jasmine.createSpy('success');
          error = jasmine.createSpy('error');

          scope.request({
            url: '/dontcare',
            success: success,
            error: error
          });
          spyOn(scope, 'request').and.callThrough();
          jasmine.Ajax.requests.mostRecent().response({ status: 401 });
        });

        it('should call the request\'s error callback function on the request', function() {
          expect(error).toHaveBeenCalled();
        });

        it('should validate the session with the server', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/validate_session/);
        });

        it('should redirect the user to /logout if the session is invalid', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          jasmine.Ajax.requests.mostRecent().response({ status: 401 });
          expect(jasmine.Ajax.requests.mostRecent().url).toMatch(/logout/);
        });

        it('should not redirect the user if their session is still valid', function() {
          jasmine.clock().tick(RETRY_TIMEOUT);
          jasmine.Ajax.requests.mostRecent().response({ status: 200 });
          if (scope.request.mostRecentCall) {
            expect(scope.request.calls.mostRecent().args[0].url).not.toMatch(/logout/);
          }
        });

        it('should not redirect the user for anything else but an invalid session', function() {
          var codes = [
            100, 101,
            200, 201, 202, 203, 204, 205, 206, 207,
            300, 301, 302, 303, 304, 305,
            400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
            500, 501, 502, 503, 504, 505
          ];

          _.each(codes, function(code) {
            yrequest({
              url: '/dontcare',
              error: function (){},
              success: function (){}
            });
            jasmine.Ajax.requests.mostRecent().response({ status: code });
            expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch(/logout/);
          });
        });

      });

    });

  });

});

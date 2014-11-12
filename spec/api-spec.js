if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'lib/api'
], function(api){

  describe('api', function (){
    var requests = jasmine.Ajax.requests;

    describe('.newContext', function (){
      it('returns an api context', function (){
        expect(api.newContext() instanceof Object).toBe(true);
      });
    });

    describe('Context', function (){
      var context;

      beforeEach(function (){
        context = api.newContext();
      });

      describe('.resource', function (){
        it('returns a new resource instance at the specified path', function (){
          var resource = context.resource('/path');
          expect(resource instanceof Object).toBe(true);
          expect(resource.getPath()).toBe('/path');
        });
      });
    });

    describe('Resource', function (){
      var resource;

      beforeEach(function (){
        resource = api.newContext().resource('/path');
      });

      describe('.params', function (){
        it('mixes in params to be sent in the next request', function (){
          var ret = resource.params({ foo: 'bar' });

          expect(ret).toBe(resource);
          expect(resource.getParams()).toEqual({ foo: 'bar' });

          resource.params({ bar: 'bar'});
          expect(resource.getParams()).toEqual({ foo: 'bar', bar: 'bar' });
        });
      });

      describe('.get', function (){
        it('calls .request with a POST http method', function (){
          var callback = function (){};
          spyOn(resource, 'request');
          resource.get(callback);
          expect(resource.request).toHaveBeenCalledWith('get', callback);
        });
      });

      describe('.post', function (){
        it('calls .request with a POST http method', function (){
          var callback = function (){};
          spyOn(resource, 'request');
          resource.post(callback);
          expect(resource.request).toHaveBeenCalledWith('post', callback);
        });
      });

      describe('.put', function (){
        it('calls .request with a PUT http method', function (){
          var callback = function (){};
          spyOn(resource, 'request');
          resource.put(callback);
          expect(resource.request).toHaveBeenCalledWith('put', callback);
        });
      });

      describe('.delete', function (){
        it('calls .request with a DELETE http method', function (){
          var callback = function (){};
          spyOn(resource, 'request');
          resource.delete(callback);
          expect(resource.request).toHaveBeenCalledWith('delete', callback);
        });
      });

      describe('.request', function (){
        var ret, callback;

        beforeEach(function (){
          jasmine.Ajax.install();

          callback = jasmine.createSpy("completeSpy");
          ret = resource.request('get', function (){});
        });

        afterEach(function (){
          jasmine.Ajax.uninstall();
        });

        it('executes a request and returns a handle', function (){
          var ret = resource.request('get', function (){});
          expect(ret).not.toBeFalsy();

          var request = requests.mostRecent();
          expect(request.method).toBe('GET');
          expect(request.url).toMatch(/^\/path/);
          expect(request.params).toBeNull();
        });

        // FIXME: testing at the ajax layer but we need to test higher.  Need to mock out request.
        // it('mixes in default options', function (){
        //   resource.getContext().setOptions('get', { url: '/mixed/in' });
        //   resource.setPath(null);
        //   requests.mostRecent().response({ status: 200 });
        //   expect(requests.mostRecent().dataType).toBe('bob');
        // });

        describe('when the request is successful', function (){
          var responseText;

          beforeEach(function (){
            responseText = { foo: "bar" };
            resource.request('get', callback);
          });

          it('calls the callback without an error param and with a response', function (){
            requests.mostRecent().response({ status: 200, responseText: JSON.stringify(responseText) });
            expect(callback).toHaveBeenCalled();

            var args = callback.calls.mostRecent().args;
            expect(args[0]).toBeNull();
            expect(args[1]).toEqual(responseText);
          });
        });

        describe('when the response is unsuccessful', function (){
          beforeEach(function (){
            resource.request('get', callback);
          });

          it('calls the callback with an error as the first parameter', function (){
            requests.mostRecent().response({ status: 401 });
            expect(callback).toHaveBeenCalled();

            var args = callback.calls.mostRecent().args;
            expect(args[0] instanceof Error).toBe(true);
          });
        });

      });
    });

  })

});

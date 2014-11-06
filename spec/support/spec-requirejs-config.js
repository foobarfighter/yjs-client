(function() {
  'use strict';

  // Configure RequireJS to shim Jasmine
  require.config({
    baseUrl: '.',
    paths: {
      'jasmine':      'bower_components/jasmine/lib/jasmine-core/jasmine',
      'jasmine-html': 'bower_components/jasmine/lib/jasmine-core/jasmine-html',
      'boot':         'bower_components/jasmine/lib/jasmine-core/boot',
      'lib':          'lib',
      'spec':         'spec'
    },
    shim: {
      'jasmine': {
        exports: 'window.jasmineRequire'
      },
      'jasmine-html': {
        deps: ['jasmine'],
        exports: 'window.jasmineRequire'
      },
      'boot': {
        deps: ['jasmine', 'jasmine-html'],
        exports: 'window.jasmineRequire'
      }
    }
  });

})();

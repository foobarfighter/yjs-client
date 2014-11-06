(function() {
  'use strict';

  // Configure RequireJS to shim Jasmine
  require.config({
    baseUrl: '.',
    paths: {

      // Test dependencies
      'jasmine':        'bower_components/jasmine/lib/jasmine-core/jasmine',
      'jasmine-html':   'bower_components/jasmine/lib/jasmine-core/jasmine-html',
      'jasmine-ajax':   'bower_components/jasmine-ajax/lib/mock-ajax',
      'boot':           'bower_components/jasmine/lib/jasmine-core/boot',
      'spec':           'spec',

      // Core dependencies
      'underscore':     'bower_components/underscore/underscore',
      'jquery':         'bower_components/jquery/dist/jquery', 
      
      // Cometd dependencies
      'org/cometd':     'lib/cometd/cometd',
      'jquery.cometd':  'lib/cometd/jquery.cometd',
      
      // Library dependencies
      'lib':            'lib'
    },
    shim: {
      'jasmine': {
        exports: 'window.jasmineRequire'
      },
      'jasmine-html': {
        deps: ['jasmine'],
        exports: 'window.jasmineRequire'
      },
      'jasmine-ajax': {
        deps: ['jasmine']
      },
      'boot': {
        deps: ['jasmine', 'jasmine-html'],
        exports: 'window.jasmineRequire'
      },
      'underscore': {
        exports: '_'
      },

      // cometd
      'org/cometd': {
        deps: [],
        exports: 'org.cometd'
      }

    }
  });

})();

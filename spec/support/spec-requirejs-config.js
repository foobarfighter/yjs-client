(function() {
  'use strict';

  // Configure RequireJS to shim Jasmine
  require.config({
    baseUrl: '.',
    paths: {

      // Test dependencies
      'jasmine-ajax':   'bower_components/jasmine-ajax/lib/mock-ajax',
      'boot':           'bower_components/jasmine/lib/jasmine-core/boot',
      'spec':           'spec',

      // Core dependencies
      'underscore':     'bower_components/underscore/underscore',
      'jquery':         'bower_components/jquery/dist/jquery', 
      'yam-core':       'lib/yam-core',
      
      // Cometd dependencies
      'org/cometd':     'lib/cometd/cometd',
      'jquery.cometd':  'lib/cometd/cometd2',
      
      // Library dependencies
      'lib':            'lib',
    },
    shim: {
      'boot': {
        exports: 'window.jasmine'
      },
      'jasmine-ajax': {
        deps: ['boot'],
        exports: 'window.MockAjax'
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

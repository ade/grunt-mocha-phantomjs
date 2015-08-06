/*
 * grunt-mocha-phantomjs
 * https://github.com/jdcataldo/grunt-mocha-phantomjs
 *
 * Copyright (c) 2013 Justin Cataldo
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var _       = require('lodash'),
      async   = require('async'),
      path    = require('path'),
      fs      = require('fs'),
      phantomjsModule = require('phantomjs');

  var lookup = function(script, executable) {
    for (var i = 0; i < module.paths.length; i++) {
      var absPath = path.join(module.paths[i], script);
      if (executable && process.platform === 'win32') {
        absPath += '.cmd';
      }
      if (fs.existsSync(absPath)) {
        return absPath;
      }
    }
  };

  var findPhantom = function findPhantom() {
    var path = lookup('phantomjs/bin/phantomjs', true);
    if(!path) {
      path = phantomjsModule.path;
      if (!fs.existsSync(path)) {
        grunt.fail.warn('Unable to find phantomjs binary.');
      }
    }
    return path;
  };

  var findMochaPhantomCore = function findMochaPhantomCore() {
    var path = lookup('mocha-phantomjs-core/mocha-phantomjs-core.js');
    if(!path) {
      grunt.fail.warn('Unable to find mocha-phantomjs-core');
    }
    return path;
  };

  grunt.registerMultiTask('mocha_phantomjs', 'Run client-side mocha test with phantomjs.', function() {
    // Merge options
    var options          = this.options({
          reporter: 'spec',
          // Non file urls to test
          urls: []

        }),
        config           = _.extend({ useColors: true }, options.config),
        files            = this.filesSrc,
        args             = [],
        phantomPath      = findPhantom(),
        mochaPhantomPath = findMochaPhantomCore(),
        urls             = options.urls.concat(this.filesSrc),
        done             = this.async(),
        errors           = 0,
        results          = '',
        output           = options.output || false,
        silent           = options.silent || false;

    if(output) {
      grunt.file.mkdir(path.dirname(output));
      var writeStream = fs.createWriteStream(output);
    }

    if(grunt.option('color') === false) {
      options.config.useColors = false;
    }

    async.eachSeries(urls, function(f, next) {
      var phantomjs = grunt.util.spawn({
        cmd: phantomPath,
        args: _.flatten([mochaPhantomPath, f, options.reporter, JSON.stringify(config)])
      }, function(error, result, code) {
        next();
      });

      if(!silent) {
        phantomjs.stdout.pipe(process.stdout);
        phantomjs.stderr.pipe(process.stderr);
      }

      // Write output to file
      if(output) {
        phantomjs.stdout.pipe(writeStream, { end: false });
      }

      phantomjs.on('exit', function(code){
        if (code === 127) {
          grunt.fail.warn("Phantomjs isn't installed");
        }
        errors += code;
      });

    }, function(){
      // Fail if errors are reported and we aren't outputing to a file
      if(!output && errors > 0) {
        grunt.fail.warn(errors + " tests failed");
      }

      if(output) {
        writeStream.end();
      }

      done();
    });
  });

};

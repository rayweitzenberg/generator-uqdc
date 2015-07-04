'use strict';
var path = require('path');
var helpers = require('yeoman-generator').test;
var assert = require('yeoman-assert');

describe('jquery', function () {
  describe('on', function () {
    before(function (done) {
      helpers.run(path.join(__dirname, '../app'))
        .inDir(path.join(__dirname, '.tmp'))
        .withOptions({'skip-install': true})
        .withPrompts({
          features: [],
          includeJQuery: true
        })
        .on('end', done);
    });

    it('adds the bower dependency', function () {
      assert.fileContent('bower.json', '"jquery"');
    });
  });

  describe('off', function () {
    before(function (done) {
      helpers.run(path.join(__dirname, '../app'))
        .inDir(path.join(__dirname, 'temp'))
        .withOptions({'skip-install': true})
        .withPrompts({
          features: [],
          includeJQuery: false
        })
        .on('end', done);
    });

    it('doesn\'t add the bower dependency', function () {
      assert.noFileContent('bower.json', '"jquery"');
    });
  });
});
// Copyright 2016 Yahoo Inc.
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

var crypto = require('crypto');
var url = require('url');

module.exports = createStream;

function createStream(algorithm, encoding) {
  var hash = createHash(algorithm);

  hash.on('pipe', function (req) {
    updateHash(hash, req);
  });

  hash.setEncoding(encoding || 'hex');

  return hash;
}

createStream.sync = function (req, body, algorithm, encoding) {
  var hash = createHash(algorithm);

  updateHash(hash, req);

  hash.write(body);

  return hash.digest(encoding || 'hex');
};

function createHash(algorithm) {
  return crypto.createHash(algorithm || 'md5');
}

function updateHash(hash, req) {
  var parts = url.parse(req.url, true);
  var excludeHeaders = [];

  if (process.env.EXCLUDE_HEADERS) {
    excludeHeaders = process.env.EXCLUDE_HEADERS.split(',');
  }

  hash.update(req.httpVersion);
  hash.update(req.method);
  hash.update(parts.pathname);
  hash.update(JSON.stringify(sort(parts.query)));
  hash.update(JSON.stringify(reject(sort(req.headers), excludeHeaders)));
  hash.update(JSON.stringify(sort(req.trailers)));
}

function sort(obj) {
  var ret = {};

  Object.keys(obj).sort().forEach(function (key) {
    ret[key] = obj[key];
  });

  return ret;
}

function reject(obj, keys) {
  var ret = {};

  Object.keys(obj).forEach(function (key) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  });

  return ret;
}

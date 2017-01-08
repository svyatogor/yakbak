// Copyright 2016 Yahoo Inc.
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

var Promise = require('bluebird');
var https = require('https');
var http = require('http');
var url = require('url');
var debug = require('debug')('yakbak:proxy');
var jsonwebtoken = require('jsonwebtoken');
var formurlencoded = require('form-urlencoded');
var _ = require('lodash');

/**
 * Protocol to module map, natch.
 * @private
 */

var mods = { 'http:': http, 'https:': https };

/**
 * Proxy `req` to `host` and yield the response.
 * @param {http.IncomingMessage} req
 * @param {Array.<Buffer>} body
 * @param {String} host
 * @returns {Promise.<http.IncomingMessage>}
 */

module.exports = function proxy(req, body, host, opts) {
  let headers = _.omit(req.headers, ['host'])
  let key
  let signedAttribute
  let _body = _.clone(body)

  if (headers['x-signed'] === 'form') {
    key = headers['x-key']
    signedAttribute = headers['x-sign-attribute']
    headers = _.omit(headers, ['x-signed', 'x-key', 'x-sign-attribute'])
    const buf = _body[0]

    let data = jsonwebtoken.sign(buf.toString(), key)
    data = {[signedAttribute]: data}
    data = formurlencoded(data)

    _body[0] = new Buffer(data)
    headers['content-length'] = _body[0].length.toString()
  }
  headers['accept-encoding'] = 'gzip;q=0,deflate;q=0'

  return new Promise((resolve /* , reject */) => {
      const uri = url.parse(host)
      const mod = mods[uri.protocol] || http
      const options = {
        hostname: uri.hostname,
        port: uri.port,
        method: req.method,
        path: req.url,
        headers: headers,
        servername: uri.hostname,
        rejectUnauthorized: false,
      }
      if (uri.auth && !opts.isProxy) {
    options.auth = uri.auth
  }
  const preq = mod.request(options, (pres) => {
    resolve(pres)
  })

  preq.setHeader('Host', uri.host)
  if (uri.auth && opts.isProxy) {
    const auth = 'Basic ' + new Buffer(uri.auth).toString('base64');
    preq.setHeader('proxy-authorization', auth)
  }
  debug('req', req.url, 'host', uri.host)

  _body.forEach((buf) => preq.write(buf))

  preq.end()
})
}

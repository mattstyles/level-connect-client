'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

require('babel/polyfill');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _xdgBasedir = require('xdg-basedir');

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _co = require('co');

var _co2 = _interopRequireDefault(_co);

var _packageJson = require('../package.json');

var _packageJson2 = _interopRequireDefault(_packageJson);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _file = require('./file');

var _file2 = _interopRequireDefault(_file);

var Client = (function (_EventEmitter) {
    _inherits(Client, _EventEmitter);

    function Client() {
        var _this = this;

        _classCallCheck(this, Client);

        _EventEmitter.call(this);

        this.connect = _constants2['default'].CONNECT_URL;
        this.token = 'new';
        this.configPath = _path2['default'].join(_xdgBasedir.config, _packageJson2['default'].name);
        this.tokenFile = _path2['default'].join(this.configPath, 'token');

        if (!this.connect) {
            throw new Error('Connect URL invalid');
        }

        // Op queue
        this.queue = [];

        // Try to grab a stored token
        // @TODO add pluggable storage mechanism

        _co2['default'](this.init()).then(function () {
            _this.emit('ready');
            console.log(_this);
            return;
        })['catch'](function (err) {
            console.error('Initialisation error');
            console.error(err);
        });
    }

    Client.prototype.init = regeneratorRuntime.mark(function init() {
        var configPath, tokenFile, res;
        return regeneratorRuntime.wrap(function init$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                    configPath = _path2['default'].join(_xdgBasedir.config, _packageJson2['default'].name);
                    tokenFile = _path2['default'].join(configPath, 'token');
                    context$2$0.prev = 2;
                    context$2$0.next = 5;
                    return _file2['default'].mkdirp(configPath);

                case 5:
                    context$2$0.next = 11;
                    break;

                case 7:
                    context$2$0.prev = 7;
                    context$2$0.t0 = context$2$0['catch'](2);

                    console.error('make config directory error');
                    throw new Error(context$2$0.t0);

                case 11:
                    context$2$0.prev = 11;
                    context$2$0.next = 14;
                    return _file2['default'].readFile(tokenFile);

                case 14:
                    res = context$2$0.sent;

                    this.token = res.toString();
                    context$2$0.next = 27;
                    break;

                case 18:
                    context$2$0.prev = 18;
                    context$2$0.t1 = context$2$0['catch'](11);

                    if (!(context$2$0.t1.code === 'ENOENT')) {
                        context$2$0.next = 26;
                        break;
                    }

                    context$2$0.next = 23;
                    return this.requestToken();

                case 23:
                    res = context$2$0.sent;

                    this.token = res;
                    return context$2$0.abrupt('return');

                case 26:
                    throw new Error(context$2$0.t1);

                case 27:
                case 'end':
                    return context$2$0.stop();
            }
        }, init, this, [[2, 7], [11, 18]]);
    });

    Client.prototype.requestToken = function requestToken() {
        return this.request({
            method: 'POST',
            url: this.connect + _constants2['default'].TOKEN_REQUEST_URL
        });
    };

    Client.prototype.request = function request(opts) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
            _superagent2['default'](opts.method, opts.url).set(_constants2['default'].TOKEN_HEADER, _this2.token).end(function (err, res) {
                if (err) {
                    console.error('Token request error');
                    return reject(err);
                }
                console.log('Token request success');

                _file2['default'].writeFile(_this2.tokenFile, res.body.id).then(function () {
                    return resolve(res.body.id);
                })['catch'](reject);
            });
        });
    };

    return Client;
})(_eventemitter32['default']);

exports['default'] = new Client();
module.exports = exports['default'];

// Ensure config directory exists

// Try to grab the token, create if necessary

// If token file does not exist then request a fresh token
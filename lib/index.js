
// This will be needed for the browser version
// Check .babelrc for asyncToGenerator for browser
//import 'babel/polyfill'

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _xdgBasedir = require('xdg-basedir');

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

    function Client(options) {
        var _this = this;

        _classCallCheck(this, Client);

        _EventEmitter.call(this);

        var opts = options || {};

        this.connect = opts.connectURL || _constants2['default'].CONNECT_URL;
        this.token = 'new';
        this.configPath = _path2['default'].join(_xdgBasedir.config, _packageJson2['default'].name);
        this.tokenFile = _path2['default'].join(this.configPath, 'token');

        if (!this.connect) {
            throw new Error('Connect URL invalid');
        }

        // Op queue
        this.queue = [];

        // Perform init
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

    /**
     * Init generator
     * Sets up the persistence layer the client needs
     */

    Client.prototype.init = function* init() {
        // Ensure config directory exists
        try {
            yield _file2['default'].mkdirp(this.configPath);
        } catch (err) {
            console.error('make config directory error');
            throw new Error(err);
        }

        // Try to grab the token, create if necessary
        try {
            var res = yield _file2['default'].readFile(this.tokenFile);
            this.token = res.toString();
        } catch (err) {
            // If token file does not exist then request a fresh token
            if (err.code === 'ENOENT') {
                var res = yield this.requestToken();
                this.token = res;
                return;
            }

            throw new Error(err);
        }
    };

    /**
     * Request token generator
     * Grabs a fresh token from the server and persists it
     */

    Client.prototype.requestToken = function* requestToken() {
        var res = null;

        try {
            res = yield this.request({
                method: 'POST',
                url: this.connect + _constants2['default'].TOKEN_REQUEST_URL
            });

            console.log('Token request success');

            try {
                yield _file2['default'].writeFile(this.tokenFile, res.body.id);

                // Return the token and let the executor choose what to do with it
                return res.body.id;
            } catch (err) {
                console.error('Error persisting token');
                throw new Error(err);
            }
        } catch (err) {
            console.error('Error requesting token');
            throw new Error(err);
        }
    };

    /**
     * Simple promisified request
     * Resolves with the entire response
     * @param opts <Object>
     *   method <String> http method to use
     *   url <String> url to hit
     */

    Client.prototype.request = function request(opts) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
            _superagent2['default'](opts.method, opts.url).set(_constants2['default'].TOKEN_HEADER, _this2.token).end(function (err, res) {
                if (err) {
                    console.error('Request error');
                    reject(err);
                    return;
                }

                resolve(res);
            });
        });
    };

    return Client;
})(_eventemitter32['default']);

exports['default'] = Client;
module.exports = exports['default'];
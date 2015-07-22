
// This will be needed for the browser version
// Check .babelrc for asyncToGenerator for browser
// Babel-core will need whacking back into deps
//import 'babel/polyfill'

import path from 'path'
import { Writable } from 'stream'

import { config } from 'xdg-basedir'
import EventEmitter from 'eventemitter3'
import request from 'superagent'
import co from 'co'

import pkg from '../package.json'
import CONSTANTS from './constants'
import fileUtils from './file'


export default class Client extends EventEmitter {
    constructor( options ) {
        super()

        let opts = options || {}

        this._connected = false

        this.connect = opts.connectURL || CONSTANTS.CONNECT_URL
        this.token = null
        this.configPath = path.join( config, pkg.name )
        this.tokenFile = path.join( this.configPath, 'token' )

        if ( !this.connect ) {
            throw new Error( 'Connect URL invalid' )
        }

        // Perform init
        // @TODO add pluggable storage mechanism
        co( this._init() )
            .then( () => {
                this.emit( 'ready' )
                return
            })
            .catch( err => {
                console.error( 'Initialisation error' )
                console.error( err )
            })
    }

    _checkConnection() {
        if ( !this.token ) {
            throw new Error( 'Connection lost, was the connection ready?' )
        }
    }

    /**
     * Init generator
     * Sets up the persistence layer the client needs
     */
    *_init() {
        // Ensure config directory exists
        try {
            yield fileUtils.mkdirp( this.configPath )
        } catch( err ) {
            console.error( 'make config directory error' )
            throw new Error( err )
        }

        // Try to grab the token, create if necessary
        try {
            let res = yield fileUtils.readFile( this.tokenFile )
            this.token = res.toString()
        } catch( err ) {
            // If token file does not exist then request a fresh token
            if ( err.code === 'ENOENT' ) {
                yield this._requestToken()
                return
            }

            throw new Error( err )
        }
    }

    /**
     * Request token generator
     * Grabs a fresh token from the server and persists it
     */
    *_requestToken() {
        var res = null

        try {
            res = yield this._request({
                method: 'POST',
                url: CONSTANTS.TOKEN_REQUEST_URL
            })

            console.log( 'Token request success' )

            try {
                yield fileUtils.writeFile( this.tokenFile, res.body.id )
                this.token = res.body.id

                // Return the token and let the executor choose what to do with it
                return res.body.id
            } catch( err ) {
                console.error( 'Error persisting token' )
                throw new Error( err )
            }
        } catch( err ) {
            console.error( 'Error requesting token' )
            throw new Error( err )
        }

    }

    /**
     * Simple promisified request
     * Resolves with the entire response
     * @param opts <Object>
     *   method <String> http method to use
     *   url <String> url to hit
     *   headers <Array:Object> headers to append
     */
    _request( opts ) {
        return new Promise( ( resolve, reject ) => {
            let req = request( opts.method, CONSTANTS.CONNECT_PROTOCOL + path.join( this.connect, opts.url ) )

            // Add custom header
            req.set( CONSTANTS.TOKEN_HEADER, this.token || 'new' )

            // Add any other headers from the options map
            if ( opts.headers ) {
                Object.keys( opts.headers ).forEach( header => {
                    req.set( header, opts.headers[ header ] )
                })
            }

            if ( opts.data ) {
                req.send( opts.data )
            }

            // Push out the request
            req.end( ( err, res ) => {
                if ( err ) {
                    reject( err )
                    return
                }

                resolve( res )
            })
        })
    }

    /*-----------------------------------------------------------*
     *
     *  Server access methods
     *
     *-----------------------------------------------------------*/

    /**
     * Returns a single value from a group
     */
    get( group, key, noRefresh ) {
        this._checkConnection()

        if ( !group || !key ) {
            throw new Error( 'GET requires a group and key' )
        }

        return new Promise( ( resolve, reject ) => {
            this._request({
                method: 'GET',
                url: path.join( group, key )
            })
                .then( res => resolve( res.body ) )
                .catch( err => {
                    // If we get a forbidden then a token refresh will probably solve it
                    if ( err.status === 403 ) {
                        // Bail if refreshing the token still fails
                        if ( noRefresh ) {
                            reject({
                                status: 403,
                                body: 'Authentication can not be established'
                            })
                            return
                        }

                        // Attempt a token refresh
                        co( this._requestToken() )
                            .then( () => {
                                this.get( group, key, true )
                                    .then( resolve )
                                    .catch( reject )
                            })
                            .catch( err => reject({
                                status: 403,
                                body: 'Authentication can not be established',
                                err: err
                            }))

                        return
                    }

                    // Any other sort of error and just punt it out
                    reject( err )
                })
        })
    }

    /**
     * Deletes a single value from a group
     */
    delete( group, key, noRefresh ) {
        this._checkConnection()

        if ( !group || !key ) {
            throw new Error( 'DELETE requires a group and key' )
        }

        return new Promise( ( resolve, reject ) => {
            this._request({
                method: 'DELETE',
                url: path.join( group, key )
            })
                .then( res => resolve( res.body ) )
                .catch( err => {
                    // If we get a forbidden then a token refresh will probably solve it
                    if ( err.status === 403 ) {
                        // Bail if refreshing the token still fails
                        if ( noRefresh ) {
                            reject({
                                status: 403,
                                body: 'Authentication can not be established'
                            })
                            return
                        }

                        // Attempt a token refresh
                        co( this._requestToken() )
                            .then( () => {
                                this.delete( group, key, true )
                                    .then( resolve )
                                    .catch( reject )
                            })
                            .catch( err => reject({
                                status: 403,
                                body: 'Authentication can not be established',
                                err: err
                            }))

                        return
                    }

                    // Any other sort of error and just punt it out
                    reject( err )
                })
        })
    }

    /**
     * Puts a single value into a group
     */
    put( group, key, data, noRefresh ) {
        this._checkConnection()

        if ( !group || !key ) {
            throw new Error( 'PUT requires a group and key' )
        }

        if ( !data ) {
            console.warn( 'PUT no data, is this intentional?' )
        }

        return new Promise( ( resolve, reject ) => {
            this._request({
                method: 'POST',
                url: path.join( group, key ),
                headers: {
                    'Content-Type': 'application/json'
                },
                data: data
            })
                .then( res => resolve( res.body ) )
                .catch( err => {
                    // If we get a forbidden then a token refresh will probably solve it
                    if ( err.status === 403 ) {
                        // Bail if refreshing the token still fails
                        if ( noRefresh ) {
                            reject({
                                status: 403,
                                body: 'Authentication can not be established'
                            })
                            return
                        }

                        // Attempt a token refresh
                        co( this._requestToken() )
                            .then( () => {
                                this.put( group, key, data, true )
                                    .then( resolve )
                                    .catch( reject )
                            })
                            .catch( err => reject({
                                status: 403,
                                body: 'Authentication can not be established',
                                err: err
                            }))

                        return
                    }

                    // Any other sort of error and just punt it out
                    reject( err )
                })
        })
    }


    /**
     * Performs a batch into a group
     */
    batch( group, ops, noRefresh ) {
        this._checkConnection()

        if ( !group || !ops ) {
            throw new Error( 'BATCH requires a group and some data' )
        }

        if ( !ops || !ops.length ) {
            throw new Error( 'BATCH requires an array of data' )
        }

        ops.forEach( op => {
            if ( !op.type ) {
                throw new Error( 'BATCH invalid operations' )
            }
        })

        return new Promise( ( resolve, reject ) => {
            this._request({
                method: 'POST',
                url: path.join( group ),
                headers: {
                    'Content-Type': 'application/json'
                },
                data: ops
            })
                .then( res => resolve( res.body ) )
                .catch( err => {
                    // If we get a forbidden then a token refresh will probably solve it
                    if ( err.status === 403 ) {
                        // Bail if refreshing the token still fails
                        if ( noRefresh ) {
                            reject({
                                status: 403,
                                body: 'Authentication can not be established'
                            })
                            return
                        }

                        // Attempt a token refresh
                        co( this._requestToken() )
                            .then( () => {
                                this.put( group, ops, true )
                                    .then( resolve )
                                    .catch( reject )
                            })
                            .catch( err => reject({
                                status: 403,
                                body: 'Authentication can not be established',
                                err: err
                            }))

                        return
                    }

                    // Any other sort of error and just punt it out
                    reject( err )
                })
        })
    }

    /**
     * Returns a stream of values from a group
     * Returns an emitter with 'data' and 'error' events
     * Emits key,value data objects on 'data'
     */
    read( group, noRefresh ) {
        this._checkConnection()

        if ( !group ) {
            throw new Error( 'READ requires a group to stream from' )
        }

        var stream = null

        // Stream->emitter
        const emitter = new Writable({
            write: function( chunk, enc, next ) {
                if ( stream.res.statusCode !== 200 ) {
                    this.emit( 'error', stream.res.statusCode )
                    return
                }
                this.emit( 'data', JSON.parse( chunk.toString() ) )
                next()
            }
        }, {
            objectMode: true
        })

        stream = request
            .get( CONSTANTS.CONNECT_PROTOCOL + path.join( this.connect, group ) )
            .set( CONSTANTS.TOKEN_HEADER, this.token )
            .type( 'json' )
            .on( 'error', err => {
                console.error( 'Error creating read stream' )
                console.error( err )
            })

        stream.pipe( emitter )

        return emitter
    }

}

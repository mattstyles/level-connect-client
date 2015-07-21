
// This will be needed for the browser version
// Check .babelrc for asyncToGenerator for browser
//import 'babel/polyfill'

import path from 'path'

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


        this.connect = opts.connectURL || CONSTANTS.CONNECT_URL
        this.token = 'new'
        this.configPath = path.join( config, pkg.name )
        this.tokenFile = path.join( this.configPath, 'token' )

        if ( !this.connect ) {
            throw new Error( 'Connect URL invalid' )
        }

        // Op queue
        this.queue = []

        // Perform init
        // @TODO add pluggable storage mechanism
        co( this.init() )
            .then( () => {
                this.emit( 'ready' )
                console.log( this )
                return
            })
            .catch( err => {
                console.error( 'Initialisation error' )
                console.error( err )
            })
    }

    /**
     * Init generator
     * Sets up the persistence layer the client needs
     */
    *init() {
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
                let res = yield this.requestToken()
                this.token = res
                return
            }

            throw new Error( err )
        }
    }

    /**
     * Request token generator
     * Grabs a fresh token from the server and persists it
     */
    *requestToken() {
        var res = null

        try {
            res = yield this.request({
                method: 'POST',
                url: this.connect + CONSTANTS.TOKEN_REQUEST_URL
            })

            console.log( 'Token request success' )

            try {
                yield fileUtils.writeFile( this.tokenFile, res.body.id )

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
     */
    request( opts ) {
        return new Promise( ( resolve, reject ) => {
            request( opts.method, opts.url )
                .set( CONSTANTS.TOKEN_HEADER, this.token )
                .end( ( err, res ) => {
                    if ( err ) {
                        console.error( 'Request error' )
                        reject( err )
                        return
                    }

                    resolve( res )
                })
        })
    }

}

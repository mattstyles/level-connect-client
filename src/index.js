
import 'babel/polyfill'

import fs from 'fs'
import path from 'path'

import { config } from 'xdg-basedir'
import mkdirp from 'mkdirp'
import EventEmitter from 'eventemitter3'
import request from 'superagent'
import co from 'co'

import pkg from '../package.json'
import CONSTANTS from './constants'
import fileUtils from './file'


class Client extends EventEmitter {
    constructor() {
        super()

        this.connect = CONSTANTS.CONNECT_URL
        this.token = 'new'
        this.configPath = path.join( config, pkg.name )
        this.tokenFile = path.join( this.configPath, 'token' )

        if ( !this.connect ) {
            throw new Error( 'Connect URL invalid' )
        }

        // Op queue
        this.queue = []

        // Try to grab a stored token
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

    *init() {
        let configPath = path.join( config, pkg.name )
        let tokenFile = path.join( configPath, 'token' )

        // Ensure config directory exists
        try {
            yield fileUtils.mkdirp( configPath )
        } catch( err ) {
            console.error( 'make config directory error' )
            throw new Error( err )
        }

        // Try to grab the token, create if necessary
        try {
            let res = yield fileUtils.readFile( tokenFile )
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

    requestToken() {
        return this.request({
            method: 'POST',
            url: this.connect + CONSTANTS.TOKEN_REQUEST_URL
        })
    }

    request( opts ) {
        return new Promise( ( resolve, reject ) => {
            request( opts.method, opts.url )
                .set( CONSTANTS.TOKEN_HEADER, this.token )
                .end( ( err, res ) => {
                    if ( err ) {
                        console.error( 'Token request error' )
                        return reject( err )
                    }
                    console.log( 'Token request success' )

                    fileUtils.writeFile( this.tokenFile, res.body.id )
                        .then( () => resolve( res.body.id ) )
                        .catch( reject )
                })
        })
    }



}

export default new Client()

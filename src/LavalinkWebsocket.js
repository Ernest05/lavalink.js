'use strict';

const Websocket = require('ws');
const { EventEmitter } = require('eventemitter3');

/**
 * Lavalink websocket
 * @class LavalinkWebsocket
 * @extends {EventEmitter}
 */
module.exports = class LavalinkWebsocket extends EventEmitter {
    /**
     * Lavalink websocket connection options
     * @typedef {Object} LavalinkWebsocketOptions
     * @property {string} host The host of the Lavalink server
     * @property {number} [port = 2333] The port of the Lavalink server
     * @property {string} region The region of the Lavalink server
     * @property {string} [password = 'youshallnotpass'] The password to access to the Lavalink server
     * @property {number} [reconnectInterval = 5000] The interval reconnection in milliseconds of The Lavalink server
     */

    /**
     * Lavalink instance options
     * @constructor
     * @param {PlayerInstance} playerInstance The implemented player instance
     * @param {LavalinkWebsocketOptions} options Lavalink server options
     * @property {PlayerInstance} playerInstance the instance of the Lavalink player
     * @property {string} host Lavalink server host
     * @property {number} port Lavalink server port
     * @property {string} region Lavalink server region
     * @property {string} password Lavalink server password
     * @property {number} reconnectInterval The time in milliseconds to wait to try to reconnect to the websocket
     * @property {*} websocket Lavalink websocket instance if any
     * @property {string} address Address to open the websocket
     * @property {Object} messageData The data received to the websocket
     * @property {*} reconnect Interval instance to reconnect Lavalink websocket
     */
    constructor (playerInstance, options = {}) {
        super();

        this.playerInstance = playerInstance;
        this.host = options.host;
        this.port = options.port || 2333;
        this.region = options.region;
        this.password = options.password || 'youshallnotpass';
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.ws = undefined;
        this.address = `ws://${options.host}:${this.port}`;
        this.messageData = {};
        this.reconnect = undefined;

        this.launch();
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Launches the Lavalink websocket
     */
    launch () {
        this.ws = new Websocket(this.address, {
            headers: {
                'User-Id': this.playerInstance.clientID,
                'Num-Shards': this.playerInstance.shardCount,
                Authorization: this.password
            }
        });

        this.ws.on('open', () => {
            /**
             * Emmited when the Lavalink websocket is ready
             * @event LavalinkWebsocket#ready
             */
            this.emit('ready');
        });
        this.ws.on('close', (code, reason) => {
            /**
             * Emmited when the Lavalink player instance disconnects from the websocket
             * @event LavalinkWebsocket#disconnect
             * @param {number} code Websocket closed connection code
             * @param {string} reason The reason why the websocket has been closed
             */

             this.ws = undefined;
             this.emit('disconnect', code, reason);
        });
        this.ws.on('error', error => {
            /**
             * Emmited when an error occurred on the Lavalink websocket
             * @event LavalinkWebsocket#error
             * @param {Error} error The error
             */
            this.emit('error', error);
        });
        this.ws.on('message', message => {
            try {
                const messageData = JSON.parse(message);

                if (messageData.op === 'stats') {
                    this.messageData = messageData;
                }

                /**
                 * Emmited when a message is received and parsed
                 * @event LavalinkWebsocket#message
                 * @param {Object} messageData The message data object
                 */
                this.emit('message', messageData);
            } catch (error) {
                /**
                 * Emmited when a message is received and parsed
                 * @event LavalinkWebsocket#message
                 * @param {Object} messageData The message data object
                 */
                this.emit('error', error);
            }
        });
    }

    /**
     * Sends data to the Lavalink websocket
     * @param {Object} data The data object to send to the websocket
     * @returns {boolean} Sends the data only if there is a websocket opened
     */
    send (data) {
        if (!this.ws) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));

            return true;
        } catch (error) {
            this.emit('error', error);

            return false;
        }
    }

    /**
     * Destroys the Lavalink websocket
     * @returns {boolean} Destroys the websocket only there is a connection opened
     */
    destroy () {
        if (!this.ws) {
            return false;
        }

        this.ws.close(1000, 'destroy');
        this.ws = undefined;

        return true;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Reconnects the Lavalink websocket
     */
    reconnect () {
        this.reconnect = setInterval(() => {
            this.ws.removeAllListeners();

            /**
             * Emmited when the Lavalink player instance is trying to reconnect to the websocket
             * @event LavalinkWebsocket#reconnecting
             */
            this.emit('reconnecting');
            this.launch();
        }, this.reconnectInterval);
    }
};

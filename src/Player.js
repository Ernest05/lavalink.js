'use strict';

const { EventEmitter } = require('eventemitter3');
const PlayerInstance = require('./PlayerInstance');
const LavalinkWebsocket = require('./LavalinkWebsocket');

/**
 * Music player class
 * @class Player
 * @extends {EventEmitter}
 */
module.exports = class Player extends EventEmitter {
    /**
     * @typedef {Object} PlayerOptions
     * @property {Object} client The Discord client
     * @property {PlayerInstance} playerInstance The player instance
     * @property {LavalinkWebsocket} server The server where is connected the player instance
     * @property {string} guildID The ID of the Discord guild
     * @property {string} channelID The ID of the voice channel in the guild
     * @property {function} sendWS Sends packets to the concerned shard websocket
     */

    /**
     * Player options
     * @constructor
     * @param {PlayerOptions} options Lavalink player options
     * @property {Object} client The Discord client
     * @property {PlayerInstance} Lavalink player instance
     * @property {LavalinkWebsocket} lavalink websocket interface
     * @property {string} guildID The ID of the concerned guild
     * @property {string} channelID the ID of the concerned channel in the guild
     * @property {function} sendWS Sends packet to the concerned shard websocket
     * @property {Array<Object>} queue Music server queue
     * @property {string | undefined} track Lavalink base64 track which is playing
     * @property {boolean} isPlaying Checks if the player is playing or not
     * @property {boolean} isPaused Checks if the player is paused or not
     * @property {Object} state Player state
     * @property {number | undefined} startPlayingTimestamp Track start playing timestamp in milliseconds
     */
    constructor (options = {}) {
        super();

        this.client = options.client;
        this.playerInstance = options.playerInstance;
        this.server = options.server;
        this.guildID = options.guildID;
        this.channelID = options.channelID;
        this.sendWS = options.sendWS;
        this.queue = [];
        this.currentTrack = undefined;
        this.isPlaying = false;
        this.isPaused = false;
        this.state = {
            volume: 100,
            equalizer: []
        };
        this.startPlayingTimestamp = null;
    }

    /**
     * Sends data packet to the Lavalink music server to emit voiceUpdate event
     * @param {Object} packet The packet to send for voiceUpdate event
     * @returns {Player} The guild player instance
     */
    connect (packet) {
        this.server.send({
            op: 'voiceUpdate',
            guildId: this.guildID,
            sessionId: packet.session,
            event: packet.event
        });

        return this;
    }

    /**
     * Disconnects the guild player
     * @param {string} reason The reason od the disconnection
     * @returns {Player} The guild player instance
     */
    disconnect (reason) {
        this.stop();

        /**
         * Emitted when the player disconnects
         * @event Player#disconnect
         * @param {string} message The player disconnection reason
         */
        this.emit('disconnect', reason);
        this.isPlaying = false;

        return this;
    }

    /**
     * Gets the music queue of the guild
     * @returns {Array<Object>} the queue of the guild
     */
    getQueue () {
        return this.queue;
    }

    /**
     * Plays the track provided on a voice channel
     * @param {string} track The encoded track ID in Base64, sent by the got on the Lavalink server
     * @param {Object} options Play options
     * @param {number} options.startsAt The start time of the provided track, in milliseconds
     * @param {number} options.endsAt The end time of the provided track, in milliseconds
     * @returns {Player} The player instance of the Discord guild
     */
    play (track, options = {}) {
        if (!track) {
            throw new Error('Please provide a valid base64 track!');
        }

        this.currentTrack = track;

        this.server.send({
            op: 'play',
            guildId: this.guildID,
            track: track
        }, options);

        this.isPlaying = true;
        this.startPlayingTimestamp = Date.now();

        return this;
    }

    /**
     * Stops the current track is playing
     * @returns {Player} The guid player instance
     */
    stop () {
        this.server.send({
            op: 'stop',
            guildId: this.guildID
        });

        this.isPlaying = false;
        this.currentTrack = undefined;

        return this;
    }

    /**
     * Suspends current track playing
     * @param {boolean} [paused = true] If true, pauses the player, else resumes it
     * @returns {Player} The guild player instance
     */
    pause (paused = true) {
        this.server.send({
            op: 'pause',
            guildId: this.guildID,
            pause: paused
        });

        this.isPaused = paused;
        this.isPlaying = !!paused;

        return this;
    }

    /**
     * Resumes the track witch was suspended before is paused, else pauses it
     * @returns {Player} The guild player instance
     */
    resume () {
        this.pause(false);
    }

    /**
     * Skips a track by using stop method
     * @returns {Player} The guild player instance
     */
    skip () {
        this.stop();
    }

    /**
     * Moves the client to another voice channel
     * @param {string} channelID The ID of the new voice channel
     * @param {*} force 
     */

    /**
     * Sets de volume of the guild player
     * @param {number} volume The volume to set
     * @param {boolean} [force = false] If true, you can set the volume over 100%
     * @returns {Player} The guild player instance
     */
    setVolume (volume, force = false) {
        if (!volume) {
            throw new Error('Please provide a valid volume value!');
        }
        if (!Number(volume) || volume % parseInt(volume) !== 0) {
            throw new Error('The volume have to be an integer number!');
        }
        if (volume < 0 || volume > 1000) {
            throw new Error('The volume doesn\'t have to be inferior to 0, or superior to 1000!');
        }
        if (volume > 100 && !force) {
            throw new Error('To set the volume value over 100, you have to set force option to true.');
        }

        this.server.send({
            op: 'volume',
            guildId: this.guildID,
            volume: volume
        });

        this.state.volume = volume;

        return this;
    }

    /**
     * Destroys the player
     * @returns {Player} The destroyed player
     */
    destroy () {
        this.server.send({
            op: 'destroy',
            guildId: this.guildID
        });

        return this;
    }

    /**
     * Guild player instance events
     * @param {Object} message The message packet
     * @returns {void}
     */
    eventEmitter (message) {
        switch (message.type) {
            case 'TrackStartEvent': {
                /**
                 * Emitted when a track starts
                 * @event Player#trackStart
                 */
                return this.emit('trackStart');
            }

            case 'TrackEndEvent': {
                if (message.reason !== 'REPLACED') {
                    this.playing = false;
                    this.track = null;
                }

                /**
                 * Emitted when a track ends
                 * @event Player#trackEnd
                 * @param {string} message The track end reason
                 */
                return this.emit('trackEnd', message);
            }

            case 'TrackExceptionEvent': {
                /**
		         * Emmited when an error occured on the guild player instance
		         * @event Player#error
		         * @prop {Object} message The error 
		         */
                if (this.listenerCount('error')) {
                    return this.emit('error', message);
                }

                return;
            }

            case 'TrackStuckEvent': {
                this.stop();

                /**
                 * Emitted when a track ended
                 * @event Player#trackEnd
                 * @param {string} message The track end reason
                 */
                return this.emit('trackEnd', message);
            }
        }
    }
};

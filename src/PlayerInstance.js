'use strict';

const Collection = require('@discordjs/collection');
const LavalinkWebsocket = require('./LavalinkWebsocket');
const Player = require('./Player');

/**
 * Player instance
 * @class PlayerInstance
 * @extends Collection
 */
module.exports = class PlayerInstance extends Collection {
    /**
     * Player instance options
     * @typedef {Object} PlayerInstanceOptions
     * @property {string} clientID The ID of the Discord client
     * @property {number} [shardCount = 1] The number of shards on the Discord client (if the bot doesn't have a sharding manager, default 1)
     * @property {Player} player The player class
     */

    /**
     * Player implementation options
     * @constructor
     * @param {Object} client The Discord client
     * @param {Array<Object>} servers Array witch contains Lavalink server or servers if several
     * @param {PlayerInstanceOptions} options Player instance options
     */
    constructor (client, servers, options = {}) {
        super();

        if (!client || typeof client !== 'object') {
            throw new Error('Please provide a valid Discord.js client!');
        }

        this.client = client;
        this.servers = servers;
        this.serversStorage = new Collection();
        this.clientID = options.clientID;
        this.shardCount = options.shardCount;
        this.Player = options.player || Player;

        servers.forEach(server => {
            this.createServer(server);
        });

        client.on('raw', async packet => {
            if (packet.t === 'VOICE_SERVER_UPDATE') {
                await this.voiceServerUpdate(packet.d);
            }
        });
    }

    /**
     * Creates a connection with a Lavalink websocket
     * @param {Object} options The Lavalink server options
     * @returns {LavalinkWebsocket} The created connection with the Lavalink websocket
     */
    createServer (options) {
        const server = new LavalinkWebsocket(this, options);

        server.on('error', error => {
            this.client.emit('error', error);
        });
        server.on('message', message => {
            if (!message || !message.op) {
                return;
            }

            const player = this.get(message.guildId);

            if (!player) {
                return;
            }

            switch (message.op) {
                case 'event': {
                    return player.eventEmitter(message);
                }

                case 'playerUpdate': {
                    return player.state = Object.assign(player.state, message.state);
                }
            }
        });

        this.serversStorage.set(options.host, server);

        return server;
    }

    /**
     * Deletes a connection with a Lavalink websocket
     * @param {Object} options The Lavalink server options
     * @returns {boolean} The deleted connection
     */
    deleteServer (options) {
        const server = this.serversStorage.get(options.host);

        if (!server) {
            return false;
        }

        server.removeAllListeners();

        return this.serversStorage.delete(options.host);
    }

    /**
     * Joins a voice channel
     * @param {Object} options Join options
     * @param {string} options.host The host of the Lavalink server
     * @param {string} options.guildID The ID of the Discord guild
     * @param {string} options.channelID The ID of the voice channel in the guild
     * @param {boolean} [options.muted = false] Mutes the Discord client in the voice channel if true
     * @param {boolean} [options.deafen = false] Deafens the Discord client in the voice channel if true
     * @return {Player} The guild player
     */
    async join (options) {
        if (!options || typeof options !== 'object') {
            throw new Error('Please provide valid options to join a voice channel!');
        }

        const player = this.get(options.guildID);

        if (player) {
            return player;
        } else {
            const channel = this.client.guilds.cache.get(options.guildID).channels.cache.get(options.channelID);

            if (!channel || channel.type !== 'voice') {
                throw new Error('Channel not found. Please verify that the channel exists and is a voice channel.');
            }
            if (!channel.permissionsFor(this.client.user).has('CONNECT') || !channel.permissionsFor(this.client.user).has('SPEAK')) {
                throw new Error('I don\'t have the right permissions to connect and speak in this voice channel.');
            }

            this.sendWS({
                op: 4,
                d: {
                    guild_id: options.guildID,
                    channel_id: options.channelID,
                    self_mute: options.muted,
                    self_deaf: options.deafen
                }
            });

            return this.returnPlayer({
                host: options.host,
                guildID: options.guildID,
                channelID: options.channelID
            });
        }
    }

    /**
     * Leaves a voice channel
     * @param {string} guildID The ID of the Discord guild
     * @returns {boolean} The leaved voice channel
     */
    async leave (guildID) {
        if (!guildID) {
            throw new Error('Please provide a valid guild ID to leave a voice channel!');
        }
        
        this.sendWS({
            op: 4,
            d: {
                guild_id: guildID,
                channel_id: undefined,
                self_mute: false,
                self_deaf: false
            }
        });

        const player = this.get(guildID);

        if (!player) {
            return false;
        }

        player.removeAllListeners();
        await player.stop();
        await player.destroy();

        return this.delete(guildID);
    }

    /**
     * Returns a guild player
     * @param {Object} options Player options
     * @param {string} options.host The host of the Lavalink server
     * @param {string} options.guildID The ID of the Discord guild
     * @param {string} options.channelID The ID of the voice channel in the guild
     * @returns {Player} The returned guild player
     */
    returnPlayer (options) {
        let player = this.get(options.guildID);

        if (player) {
            return player;
        } else {
            const server = this.serversStorage.get(options.host);

            if (!server) {
                throw new Error(`No Lavalink server found at host ${options.host}. Please provide a valid host.`);
            }

            player = new this.Player({
                client: this.client,
                playerInstance: this,
                server,
                guildID: options.guildID,
                channelID: options.channelID
            });

            this.set(options.guildID, player);

            return player;
        }
    }

    /**
     * Called by the Discord client library when an update in a voice channel is received
     * @param {Object} packet The voice server update packet
     * @returns {void}
     */
    async voiceServerUpdate (packet) {
        const player = this.get(packet.guild_id);

        if (!player) {
            return;
        }
        
        const guild = this.client.guilds.cache.get(packet.guild_id);

        if (!guild) {
            return;
        }
        if (!guild.me) {
            await guild.members.fetch(this.client.user.id).catch(() => undefined);
        }

        player.connect({
            session: guild.me.voice.sessionID,
            event: packet
        });
    }

    /**
     * Sends WS packets to manage the voice connections
     * @param {Object} packet The packet of the player
     * @param {number} packet.op The OP for the websocket
     * @param {Object} packet.d The data to send to the websocket
     * @returns {void}
     */
    sendWS (packet) {
        return typeof this.client.ws.send === 'function' ? this.client.ws.send(packet) : this.client.guilds.cache.get(packet.d.guild_id).shard.send(packet);
    }
};

'use strict';

const LavalinkWebsocket = require('./LavalinkWebsocket');
const Player = require('./Player');

/**
 * Player instance
 * @class PlayerInstance
 */
module.exports = class PlayerInstance {
    /**
     * Player implementation options
     * @constructor
     * @param {Object} client The Discord client
     * @param {Array<Object>} servers Array witch contains Lavalink server or servers if several
     * @param {string} engine The library you use for the bot
     * @property {Object} client The Discord client
     * @property {string} engine The library you use for the bot
     * @property {Array<Object>} servers Array of nodes
     * @property {Object} servers Lavalink servers storage object
     * @property {Object} players Lavalink players object
     * @property {string} clientID The ID of the Discord client
     * @property {number} shardCount The number of shards
     * @property {Player} Player Lavalink player
     */
    constructor (client, servers, engine) {
        if (!client || typeof client !== 'object') {
            throw new Error('Please provide a valid Discord client!');
        }

        if (!['discordjs', 'eris'].some(e => e === engine)) {
            throw new Error('Please indicate a valid engine! discordjs for Discord.js or eris for Eris.');
        }

        this.client = client;
        this.engine = engine;
        this.servers = servers;
        this.serversStorage = {};
        this.players = {};
        this.clientID = this.client.user.id;
        this.shardCount = this.engine === 'discordjs' ? this.client.shard.count : this.client.shards.size;
        this.Player = Player;

        servers.forEach(server => {
            this.createServer(server);
        });

        this.client.on(this.engine === 'discordjs' ? 'raw' : 'rawWS', async packet => {
            if (packet.t === 'VOICE_SERVER_UPDATE') {
                await this.voiceServerUpdate(packet.d);
            }
        });
    }

    /**
     * @typedef {Object} LavalinkServerOptions
     * @param {string} options.host Lavalink server host
     * @param {number} options.port Lavalink server port
     * @param {string} options.password Lavalink server password
     */

    /**
     * Creates a connection with a Lavalink websocket
     * @param {LavalinkServerOptions} options The Lavalink server options
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

            const player = this.players[message.guildId];

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

        this.serversStorage[options.host] = server;

        return server;
    }

    /**
     * Deletes a connection with a Lavalink websocket
     * @param {LavalinkServerOptions} options The Lavalink server options
     * @returns {boolean} The deleted connection
     */
    deleteServer (options) {
        const server = this.serversStorage[options.host];

        if (!server) {
            return false;
        }

        server.removeAllListeners();

        return delete this.serversStorage[options.host];
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

        const player = this.players[options.guildID];

        if (player) {
            return player;
        } else {
            switch (this.engine) {
                case 'discordjs': {
                    const channel = this.client.guilds.cache.get(options.guildID).channels.cache.get(options.channelID);

                    if (!channel || channel.type !== 'voice') {
                        throw new Error('Channel not found. Please verify that the channel exists and is a voice channel.');
                    }
                    if (!channel.permissionsFor(this.client.user.id).has('CONNECT') || !channel.permissionsFor(this.client.user.id).has('SPEAK')) {
                        throw new Error('I don\'t have the right permissions to connect and speak in this voice channel.');
                    }
                }

                case 'eris': {
                    const channel = this.client.guilds.get(options.guildID).channels.get(options.channelID);

                    if (!channel || channel.type !== 2) {
                        throw new Error('Channel not found. Please verify that the channel exists and is a voice channel.');
                    }
                    if (!channel.permissionsOf(this.client.user.id).has('voiceConnect') || !channel.permissionsOf(this.client.user.id).has('voiceSpeak')) {
                        throw new Error('I don\'t have the right permissions to connect and speak in this voice channel.');
                    }
                }
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
                channel_id: null,
                self_mute: false,
                self_deaf: false
            }
        });

        const player = this.players[guildID];

        if (!player) {
            return false;
        }

        player.removeAllListeners();
        await player.stop();
        await player.destroy();

        return delete this.players[guildID];
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
        let player = this.players[options.guildID];

        if (player) {
            return player;
        } else {
            const server = this.serversStorage[options.host];

            if (!server) {
                throw new Error(`No Lavalink server found at host ${options.host}. Please provide a valid host.`);
            }

            player = new this.Player({
                client: this.client,
                playerInstance: this,
                server,
                guildID: options.guildID,
                channelID: options.channelID,
                sendWS: this.sendWS
            });

            this.players[options.guildID] = player;

            return player;
        }
    }

    /**
     * Called by the Discord client library when an update in a voice channel is received
     * @param {Object} packet The voice server update packet
     * @returns {void}
     */
    async voiceServerUpdate (packet) {
        const player = this.players[packet.guild_id];

        if (!player) {
            return;
        }
        
        const guild = this.engine === 'discordjs' ? this.client.guilds.cache.get(packet.guild_id) : this.client.guilds.get(packet.guild_id);

        if (!guild) {
            return;
        }

        player.connect({
            session: this.engine === 'discordjs' ? guild.me.voice.sessionID : guild.voiceStates.get(this.client.user.id).sessionID,
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
        switch (this.engine) {
            case 'discordjs': {
                return typeof this.client.ws.send === 'function' ? this.client.ws.send(packet) : this.client.guilds.cache.get(packet.d.guild_id).shard.send(packet);
            }

            case 'eris': {
                return this.client.guilds.get(packet.d.guild_id).shard.sendWS(packet.op, packet.d);
            }
        }
    }
};

'use strict';

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

/**
 * Get results on the Lavalink music server
 * @param {Object} server The Lavalink server parameters
 * @param {string} [server.host = 'localhost'] The Lavalink server host
 * @param {number} [server.port = 2333] The Lavalink server port
 * @param {string} [server.password = 'youshallnotpass'] The Lavalink server password
 * @param {string} query Key words, link, anything you want to search
 * @returns {Array<Object> | Error} Results data, or error if an error occured
 */
module.exports = function (server, query) {
    if (!server || typeof server !== 'object') {
        throw new Error('Please provide a valid Lavalink server object!');
    }
    if (!query || typeof query !== 'string') {
        throw new Error('Please provide a valid query to get results on Lavalink server!');
    }

    const queryIdentifier = new URLSearchParams();

    queryIdentifier.append('identifier', query);

    return fetch(`http://${server.host}:${server.port}/loadtracks?${queryIdentifier.toString()}`, {
        headers: {
            Authorization: server.password
        }
    })
        .then(res => res.json())
        .then(data => data.tracks)
        .catch(error => {
            throw error;
            return null;
        });
};

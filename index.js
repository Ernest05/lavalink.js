'use strict';

if (require('discord.js') && require('eris')) {
    throw new Error('You can\'t have Discord.js and Eris installed. Please choose one library only.');
}

module.exports = {
    LavalinkWebsocket: require('./src/LavalinkWebsocket'),
    PlayerInstance: require('./src/PlayerInstance'),
    Player: require('./src/Player'),
    request: require('./src/request'),
    version: require('./package').version
};

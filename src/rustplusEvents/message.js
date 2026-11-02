/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const CommandHandler = require('../handlers/inGameCommandHandler.js');
const Constants = require('../util/constants.js');
const DiscordMessages = require('../discordTools/discordMessages.js');
const InGameChatHandler = require('../handlers/inGameChatHandler.js');
const TeamChatHandler = require("../handlers/teamChatHandler.js");
const TeamHandler = require('../handlers/teamHandler.js');

module.exports = {
    name: 'message',
    async execute(rustplus, client, message) {
        if (!rustplus.isServerAvailable()) return rustplus.deleteThisRustplusInstance();

        if (!rustplus.isOperational) return;

        if (message.hasOwnProperty('response')) {
            messageResponse(rustplus, client, message);
        }
        else if (message.hasOwnProperty('broadcast')) {
            messageBroadcast(rustplus, client, message);
        }
    },
};

async function messageResponse(rustplus, client, message) {
    /* Not implemented */
}

async function messageBroadcast(rustplus, client, message) {
    if (message.broadcast.hasOwnProperty('teamChanged')) {
        messageBroadcastTeamChanged(rustplus, client, message);
    }
    else if (message.broadcast.hasOwnProperty('teamMessage')) {
        messageBroadcastTeamMessage(rustplus, client, message);
    }
    else if (message.broadcast.hasOwnProperty('cameraRays')) {
        messageBroadcastCameraRays(rustplus, client, message);
    }
}

async function messageBroadcastTeamChanged(rustplus, client, message) {
    TeamHandler.handler(rustplus, client, message.broadcast.teamChanged.teamInfo);
    const changed = rustplus.team.isLeaderSteamIdChanged(message.broadcast.teamChanged.teamInfo);
    rustplus.team.updateTeam(message.broadcast.teamChanged.teamInfo);
    if (changed) rustplus.updateLeaderRustPlusLiteInstance();
}

async function messageBroadcastTeamMessage(rustplus, client, message) {
    const instance = client.getInstance(rustplus.guildId);
    const steamId = message.broadcast.teamMessage.message.steamId.toString();

    if (steamId === rustplus.playerId) {
        /* Delay inGameChatHandler */
        clearTimeout(rustplus.inGameChatTimeout);
        const commandDelayMs = parseInt(rustplus.generalSettings.commandDelay) * 1000;
        rustplus.inGameChatTimeout = setTimeout(
            InGameChatHandler.inGameChatHandler, commandDelayMs, rustplus, client);
    }

    let tempName = message.broadcast.teamMessage.message.name;
    let tempMessage = message.broadcast.teamMessage.message.message;

    tempName = tempName.replace(/^<size=.*?><color=.*?>/, '');  /* Rustafied */
    tempName = tempName.replace(/<\/color><\/size>$/, '');      /* Rustafied */
    message.broadcast.teamMessage.message.name = tempName;

    tempMessage = tempMessage.replace(/^<size=.*?><color=.*?>/, '');  /* Rustafied */
    tempMessage = tempMessage.replace(/<\/color><\/size>$/, '');      /* Rustafied */
    tempMessage = tempMessage.replace(/^<color.+?<\/color>/g, '');      /* Unknown */
    message.broadcast.teamMessage.message.message = tempMessage;

    if (instance.blacklist['steamIds'].includes(`${steamId}`)) {
        rustplus.log(client.intlGet(null, 'infoCap'), client.intlGet(null, `userPartOfBlacklistInGame`, {
            user: `${message.broadcast.teamMessage.message.name} (${steamId})`,
            message: message.broadcast.teamMessage.message.message
        }));
        TeamChatHandler(rustplus, client, message.broadcast.teamMessage.message);
        return;
    }

    if (rustplus.messagesSentByBot.includes(message.broadcast.teamMessage.message.message)) {
        /* Remove message from messagesSendByBot */
        for (let i = rustplus.messagesSentByBot.length - 1; i >= 0; i--) {
            if (rustplus.messagesSentByBot[i] === message.broadcast.teamMessage.message.message) {
                rustplus.messagesSentByBot.splice(i, 1);
            }
        }
        return;
    }

    const isCommand = await CommandHandler.inGameCommandHandler(rustplus, client, message);
    if (isCommand) return;

    rustplus.log(client.intlGet(null, 'infoCap'), client.intlGet(null, `logInGameMessage`, {
        message: message.broadcast.teamMessage.message.message,
        user: `${message.broadcast.teamMessage.message.name} (${steamId})`
    }));

    TeamChatHandler(rustplus, client, message.broadcast.teamMessage.message);
}

async function messageBroadcastCameraRays(rustplus, client, message) {
    /* Not implemented */
}


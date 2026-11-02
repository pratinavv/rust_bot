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

const Fs = require('fs');

const InstanceUtils = require('../util/instanceUtils.js');
const dataPath = require('./dataPaths');

module.exports = (client, guild) => {
    let instance = null;
    if (!Fs.existsSync(dataPath('instances', `${guild.id}.json`))) {
        instance = {
            firstTime: true,
            role: null,
            generalSettings: client.readGeneralSettingsTemplate(),
            notificationSettings: client.readNotificationSettingsTemplate(),
            channelId: {
                category: null,
                information: null,
                events: null,
                teamchat: null
            },
            informationMessageId: {
                map: null,
                server: null,
                event: null,
                team: null
            },
            activeServer: null,
            serverList: {},
            serverListLite: {},
            marketSubscriptionList: {
                all: [],
                buy: [],
                sell: []
            },
            teamChatColors: {},
            blacklist: {
                discordIds: [],
                steamIds: []
            },
            aliases: []
        };
    }
    else {
        instance = InstanceUtils.readInstanceFile(guild.id);
    }

    /* Check every serverList for missing keys */
    for (const [serverId, content] of Object.entries(instance.serverList)) {
        if (!content.hasOwnProperty('customCameraGroups')) content.customCameraGroups = {};
    }

    /* In-game chat and language are the same for every team. */
    instance.generalSettings.language = 'en';
    instance.generalSettings.prefix = '!';
    instance.generalSettings.trademark = 'pratinavv';
    instance.generalSettings.commandDelay = 0;

    /* An alert is either on everywhere or off everywhere. */
    for (const setting of Object.values(instance.notificationSettings)) setting.inGame = setting.discord;

    client.setInstance(guild.id, instance);
};

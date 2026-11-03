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

const Discord = require('discord.js');

const Config = require('../../config');
const DiscordTools = require('../discordTools/discordTools.js');
const InstanceUtils = require('../util/instanceUtils.js');
const TeamManager = require('../util/teamManager.js');
const Teams = require('../util/teams.js');

const TEAM_TICK_INTERVAL_MS = 60 * 60 * 1000;

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        for (const guild of client.guilds.cache) {
            require('../util/CreateCredentialsFile')(client, guild[1]);
            TeamManager.migrateGuild(client, guild[1]);
        }

        for (const team of Teams.active()) {
            require('../util/CreateInstanceFile')(client, DiscordTools.getGuild(team.id));
        }

        client.loadGuildsIntl();
        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'loggedInAs', {
            name: client.user.tag
        }));

        if (process.env.RPP_DISCORD_USERNAME) {
            try {
                await client.user.setUsername(Config.discord.username);
            }
            catch (e) {
                client.log(client.intlGet(null, 'warningCap'), client.intlGet(null, 'ignoreSetUsername'));
            }
        }

        client.user.setPresence({
            activities: [{ name: '/help', type: Discord.ActivityType.Listening }],
            status: 'online'
        });

        client.uptimeBot = new Date();

        for (let guildArray of client.guilds.cache) {
            const guild = guildArray[1];

            if (process.env.RPP_DISCORD_USERNAME) {
                try {
                    await guild.members.me.setNickname(Config.discord.username);
                }
                catch (e) {
                    client.log(client.intlGet(null, 'warningCap'), client.intlGet(null, 'ignoreSetNickname'));
                }
            }
            await require('../discordTools/RegisterSlashCommands')(client, guild);
            await client.syncCredentialsWithUsers(guild);
        }

        for (const team of Teams.active()) {
            const trimmed = await TeamManager.trimTeamChannels(client, team);
            const guild = DiscordTools.getGuild(team.id);
            await client.setupGuild(guild);

            /* Settings now live in the information channel. */
            if (trimmed) await require('../discordTools/SetupSettingsMenu')(client, guild, true);
        }

        for (const guild of client.guilds.cache) {
            for (const steamId of Object.keys(InstanceUtils.readCredentialsFile(guild[0]))) {
                if (steamId !== 'hoster') require('../util/FcmListener').start(client, guild[0], steamId);
            }
        }

        client.createRustplusInstancesFromConfig();
        client.startupDone = true;

        TeamManager.tick(client);
        setInterval(TeamManager.tick, TEAM_TICK_INTERVAL_MS, client);

        require('../util/newsFeeds.js').start(client);
    },
};

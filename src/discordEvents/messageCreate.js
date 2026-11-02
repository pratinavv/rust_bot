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

const DiscordTools = require('../discordTools/discordTools');
const TeamManager = require('../util/teamManager.js');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        const team = TeamManager.teamFromChannel(client, message.channel);
        if (!team) return;

        message.teamId = team.id;
        const instance = client.getInstance(team.id);
        const rustplus = client.rustplusInstances[team.id];

        if (message.author.bot || !rustplus || (rustplus && !rustplus.isOperational)) return;

        if (instance.blacklist['discordIds'].includes(message.author.id) &&
            Object.values(instance.channelId).includes(message.channelId)) {
            const guild = DiscordTools.getGuild(team.id);
            const channel = DiscordTools.getTextChannelById(guild.id, message.channelId);
            client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, `userPartOfBlacklistDiscord`, {
                guild: `${guild.name} (${guild.id})`,
                channel: `${channel.name} (${channel.id})`,
                user: `${message.author.username} (${message.author.id})`,
                message: message.cleanContent
            }));
            return;
        }

        if (message.channelId === instance.channelId.teamchat) {
            const guild = DiscordTools.getGuild(team.id);
            const channel = DiscordTools.getTextChannelById(guild.id, message.channelId);
            client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, `logDiscordMessage`, {
                guild: `${guild.name} (${guild.id})`,
                channel: `${channel.name} (${channel.id})`,
                user: `${message.author.username} (${message.author.id})`,
                message: message.cleanContent
            }));
            await rustplus.sendInGameMessage(`${message.author.username}: ${message.cleanContent}`);
        }
    },
}
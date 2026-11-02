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

const DiscordEmbeds = require('./discordEmbeds.js');
const DiscordTools = require('./discordTools.js');
const SettingsPanels = require('./settingsPanels.js');

module.exports = async (client, guild, forced = false) => {
    const instance = client.getInstance(guild.id);
    const channel = DiscordTools.getTextChannelById(guild.id, instance.channelId.information);

    if (!channel) {
        client.log(client.intlGet(null, 'errorCap'), 'SetupSettingsMenu: ' +
            client.intlGet(null, 'invalidGuildOrChannel'), 'error');
        return;
    }

    if (instance.firstTime || forced || instance.settingsMenuVersion !== SettingsPanels.MENU_VERSION) {
        await DiscordTools.clearTextChannel(guild.id, instance.channelId.information, 100);

        /* Discord keeps messages in the order they were sent, so the information messages go first and get edited
           once the team is connected. */
        for (const name of ['server', 'event', 'team', 'map']) {
            const message = await client.messageSend(channel, {
                embeds: [DiscordEmbeds.getInformationPlaceholderEmbed(name)]
            });
            instance.informationMessageId[name] = message ? message.id : null;
        }

        for (const panel of SettingsPanels.getPanels(guild.id)) {
            await client.messageSend(channel, panel);
        }

        instance.firstTime = false;
        instance.settingsMenuVersion = SettingsPanels.MENU_VERSION;
        client.setInstance(guild.id, instance);
    }
};

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
const DiscordMessages = require('../discordTools/discordMessages.js');
const DiscordTools = require('../discordTools/discordTools.js');
const DiscordButtons = require('../discordTools/discordButtons.js');
const DiscordModals = require('../discordTools/discordModals.js');
const SettingsPanels = require('../discordTools/settingsPanels.js');

module.exports = async (client, interaction) => {
    const instance = client.getInstance(interaction.teamId);
    const guildId = interaction.teamId;
    const rustplus = client.rustplusInstances[guildId];

    const verifyId = Math.floor(100000 + Math.random() * 900000);
    client.logInteraction(interaction, verifyId, 'userButton');

    if (instance.blacklist['discordIds'].includes(interaction.user.id) &&
        !interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'userPartOfBlacklist', {
            id: `${verifyId}`,
            user: `${interaction.user.username} (${interaction.user.id})`
        }));
        return;
    }

    if (interaction.customId.startsWith('Notification')) {
        const ids = JSON.parse(interaction.customId.replace('Notification', ''));
        const setting = instance.notificationSettings[ids.setting];

        /* An alert is either on everywhere or off everywhere. */
        const active = !setting.discord;
        setting.discord = active;
        setting.inGame = active;
        client.setInstance(guildId, instance);

        if (rustplus) {
            rustplus.notificationSettings[ids.setting].discord = active;
            rustplus.notificationSettings[ids.setting].inGame = active;
        }

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${active}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'AllowInGameCommands') {
        instance.generalSettings.inGameCommandsEnabled = !instance.generalSettings.inGameCommandsEnabled;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.inGameCommandsEnabled = instance.generalSettings.inGameCommandsEnabled;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.inGameCommandsEnabled}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'BotMutedInGame') {
        instance.generalSettings.muteInGameBotMessages = !instance.generalSettings.muteInGameBotMessages;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.muteInGameBotMessages = instance.generalSettings.muteInGameBotMessages;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.muteInGameBotMessages}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'InGameTeammateConnection') {
        instance.generalSettings.connectionNotify = !instance.generalSettings.connectionNotify;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.connectionNotify = instance.generalSettings.connectionNotify;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.connectionNotify}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'InGameTeammateAfk') {
        instance.generalSettings.afkNotify = !instance.generalSettings.afkNotify;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.afkNotify = instance.generalSettings.afkNotify;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.afkNotify}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'InGameTeammateDeath') {
        instance.generalSettings.deathNotify = !instance.generalSettings.deathNotify;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.deathNotify = instance.generalSettings.deathNotify;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.deathNotify}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'LeaderCommandEnabled') {
        instance.generalSettings.leaderCommandEnabled = !instance.generalSettings.leaderCommandEnabled;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.leaderCommandEnabled = instance.generalSettings.leaderCommandEnabled;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.leaderCommandEnabled}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'LeaderCommandOnlyForPaired') {
        instance.generalSettings.leaderCommandOnlyForPaired = !instance.generalSettings.leaderCommandOnlyForPaired;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.leaderCommandOnlyForPaired =
            instance.generalSettings.leaderCommandOnlyForPaired;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.leaderCommandOnlyForPaired}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (interaction.customId === 'ItemAvailableNotifyInGame') {
        instance.generalSettings.itemAvailableInVendingMachineNotifyInGame =
            !instance.generalSettings.itemAvailableInVendingMachineNotifyInGame;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.itemAvailableInVendingMachineNotifyInGame =
            instance.generalSettings.itemAvailableInVendingMachineNotifyInGame;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.itemAvailableInVendingMachineNotifyInGame}`
        }));

        await client.interactionUpdate(interaction, {
            components: SettingsPanels.getComponents(guildId, interaction.customId)
        });
    }
    else if (Config.battlemetrics.token !== '' && interaction.customId === 'DisplayInformationBattlemetricsAllOnlinePlayers') {
        instance.generalSettings.displayInformationBattlemetricsAllOnlinePlayers =
            !instance.generalSettings.displayInformationBattlemetricsAllOnlinePlayers;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.displayInformationBattlemetricsAllOnlinePlayers =
            instance.generalSettings.displayInformationBattlemetricsAllOnlinePlayers;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.displayInformationBattlemetricsAllOnlinePlayers}`
        }));

        await client.interactionUpdate(interaction, {
            components: [DiscordButtons.getDisplayInformationBattlemetricsAllOnlinePlayersButton(guildId,
                instance.generalSettings.displayInformationBattlemetricsAllOnlinePlayers)]
        });
    }
    else if (Config.battlemetrics.token !== '' && interaction.customId === 'BattlemetricsServerNameChanges') {
        instance.generalSettings.battlemetricsServerNameChanges =
            !instance.generalSettings.battlemetricsServerNameChanges;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.battlemetricsServerNameChanges =
            instance.generalSettings.battlemetricsServerNameChanges;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.battlemetricsServerNameChanges}`
        }));

        await client.interactionUpdate(interaction, {
            components: DiscordButtons.getSubscribeToChangesBattlemetricsButtons(guildId)
        });
    }
    else if (Config.battlemetrics.token !== '' && interaction.customId === 'BattlemetricsGlobalNameChanges') {
        instance.generalSettings.battlemetricsGlobalNameChanges =
            !instance.generalSettings.battlemetricsGlobalNameChanges;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.battlemetricsGlobalNameChanges =
            instance.generalSettings.battlemetricsGlobalNameChanges;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.battlemetricsGlobalNameChanges}`
        }));

        await client.interactionUpdate(interaction, {
            components: DiscordButtons.getSubscribeToChangesBattlemetricsButtons(guildId)
        });
    }
    else if (Config.battlemetrics.token !== '' && interaction.customId === 'BattlemetricsGlobalLogin') {
        instance.generalSettings.battlemetricsGlobalLogin =
            !instance.generalSettings.battlemetricsGlobalLogin;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.battlemetricsGlobalLogin =
            instance.generalSettings.battlemetricsGlobalLogin;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.battlemetricsGlobalLogin}`
        }));

        await client.interactionUpdate(interaction, {
            components: DiscordButtons.getSubscribeToChangesBattlemetricsButtons(guildId)
        });
    }
    else if (Config.battlemetrics.token !== '' && interaction.customId === 'BattlemetricsGlobalLogout') {
        instance.generalSettings.battlemetricsGlobalLogout =
            !instance.generalSettings.battlemetricsGlobalLogout;
        client.setInstance(guildId, instance);

        if (rustplus) rustplus.generalSettings.battlemetricsGlobalLogout =
            instance.generalSettings.battlemetricsGlobalLogout;

        client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'buttonValueChange', {
            id: `${verifyId}`,
            value: `${instance.generalSettings.battlemetricsGlobalLogout}`
        }));

        await client.interactionUpdate(interaction, {
            components: DiscordButtons.getSubscribeToChangesBattlemetricsButtons(guildId)
        });
    }
    else if (interaction.customId === 'RecycleDelete') {
        if (Config.discord.needAdminPrivileges && !client.isAdministrator(interaction)) {
            interaction.deferUpdate();
            return;
        }

        await interaction.message.delete();
    }

    client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'userButtonInteractionSuccess', {
        id: `${verifyId}`
    }));
}

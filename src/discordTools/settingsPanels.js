/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

/*
    The settings menu: a few compact panels instead of one message per setting.

    Each panel is one message of up to 5 rows. Toggle buttons come first so their columns line up, followed by
    a disabled button that names the row. Bump MENU_VERSION when the layout changes, so that existing teams get
    their menu rebuilt on the next start.
*/

const Discord = require('discord.js');

const Client = require('../../index.ts');
const DiscordButtons = require('./discordButtons.js');
const DiscordEmbeds = require('./discordEmbeds.js');

const MENU_VERSION = 3;

const COLOR_GENERAL = '#5865f2';

const NOTIFICATION_PANELS = [
    {
        title: '🚢  Cargo Ship',
        color: '#3498db',
        rows: [
            { setting: 'cargoShipDetectedSetting', label: 'Spotted', emoji: '👀' },
            { setting: 'cargoShipEgressSetting', label: 'Heading out', emoji: '⏳' },
            { setting: 'cargoShipDockingAtHarborSetting', label: 'Docked at harbor', emoji: '⚓' },
            { setting: 'cargoShipLeftSetting', label: 'Left the map', emoji: '👋' }
        ]
    },
    {
        title: '🚁  Patrol Helicopter',
        color: '#e67e22',
        rows: [
            { setting: 'patrolHelicopterDetectedSetting', label: 'Spotted', emoji: '👀' },
            { setting: 'patrolHelicopterDestroyedSetting', label: 'Shot down', emoji: '💥' },
            { setting: 'patrolHelicopterLeftSetting', label: 'Left the map', emoji: '👋' }
        ]
    },
    {
        title: '🛢️  Oil Rig & Chinook',
        color: '#e74c3c',
        rows: [
            { setting: 'chinook47DetectedSetting', label: 'Chinook spotted', emoji: '🚁' },
            { setting: 'heavyScientistCalledSetting', label: 'Heavy scientists called', emoji: '☢️' },
            { setting: 'lockedCrateOilRigUnlockedSetting', label: 'Locked crate open', emoji: '🔓' }
        ]
    },
    {
        title: '🛒  Traders',
        color: '#2ecc71',
        rows: [
            { setting: 'travelingVendorDetectedSetting', label: 'Vendor spotted', emoji: '🚚' },
            { setting: 'travelingVendorHaltedSetting', label: 'Vendor stopped', emoji: '🛑' },
            { setting: 'travelingVendorLeftSetting', label: 'Vendor left', emoji: '👋' },
            { setting: 'vendingMachineDetectedSetting', label: 'New vending machine', emoji: '🏪' }
        ],
        toggles: [
            {
                customId: 'ItemAvailableNotifyInGame',
                setting: 'itemAvailableInVendingMachineNotifyInGame',
                label: 'Wanted item in stock: tell team in-game',
                emoji: '🔔'
            }
        ]
    }
];

const BOT_TOGGLES = [
    { customId: 'AllowInGameCommands', setting: 'inGameCommandsEnabled', label: 'In-game commands', emoji: '⌨️' },
    { customId: 'BotMutedInGame', setting: 'muteInGameBotMessages', label: 'Mute the bot in-game', emoji: '🔇' },
    { customId: 'LeaderCommandEnabled', setting: 'leaderCommandEnabled', label: '!leader command', emoji: '👑' },
    {
        customId: 'LeaderCommandOnlyForPaired',
        setting: 'leaderCommandOnlyForPaired',
        label: '!leader only for paired players',
        emoji: '🔗'
    }
];

const TEAMMATE_TOGGLES = [
    { customId: 'InGameTeammateConnection', setting: 'connectionNotify', label: 'Connections', emoji: '🔌' },
    { customId: 'InGameTeammateAfk', setting: 'afkNotify', label: 'AFK', emoji: '💤' },
    { customId: 'InGameTeammateDeath', setting: 'deathNotify', label: 'Deaths', emoji: '💀' }
];

const onOff = (active) => active ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Secondary;

function labelButton(id, label, emoji) {
    return DiscordButtons.getButton({
        customId: `SettingLabel${id}`,
        label: label,
        emoji: emoji,
        style: Discord.ButtonStyle.Secondary,
        disabled: true
    });
}

function notificationRow(instance, { setting, label, emoji }) {
    const active = instance.notificationSettings[setting].discord;

    return new Discord.ActionRowBuilder().addComponents(
        DiscordButtons.getButton({
            customId: `Notification${JSON.stringify({ setting: setting })}`,
            emoji: active ? '✅' : '⬛',
            style: onOff(active)
        }),
        labelButton(setting, label, emoji));
}

function toggleRow(instance, { customId, setting, label, emoji }) {
    const active = instance.generalSettings[setting];

    return new Discord.ActionRowBuilder().addComponents(
        DiscordButtons.getButton({
            customId: customId,
            emoji: active ? '✅' : '⬛',
            style: onOff(active)
        }),
        labelButton(customId, label, emoji));
}

function notificationComponents(instance, panel) {
    return [
        ...panel.rows.map(row => notificationRow(instance, row)),
        ...(panel.toggles || []).map(toggle => toggleRow(instance, toggle))
    ];
}

function botComponents(instance) {
    return [
        ...BOT_TOGGLES.map(toggle => toggleRow(instance, toggle)),
        new Discord.ActionRowBuilder().addComponents(TEAMMATE_TOGGLES.map(({ customId, setting, label, emoji }) =>
            DiscordButtons.getButton({
                customId: customId,
                label: label,
                emoji: emoji,
                style: onOff(instance.generalSettings[setting])
            })))
    ];
}

module.exports = {
    MENU_VERSION,

    /* All panels, in the order they are posted. */
    getPanels: function (guildId) {
        const instance = Client.client.getInstance(guildId);

        return [
            {
                embeds: [DiscordEmbeds.getEmbed({
                    color: COLOR_GENERAL,
                    title: '🤖  Bot behaviour',
                    description: 'Green means on. The bottom row picks which teammate updates are posted in-game.'
                })],
                components: botComponents(instance)
            },
            ...NOTIFICATION_PANELS.map(panel => ({
                embeds: [DiscordEmbeds.getEmbed({
                    color: panel.color,
                    title: panel.title,
                    description: 'Turn an alert on to get it in Discord and in team chat.'
                })],
                components: notificationComponents(instance, panel)
            }))
        ];
    },

    /* The up to date rows of the panel that holds this button or menu. */
    getComponents: function (guildId, customId) {
        const instance = Client.client.getInstance(guildId);

        const panel = NOTIFICATION_PANELS.find(({ rows, toggles = [] }) =>
            rows.some(row => customId.includes(`"${row.setting}"`)) ||
            toggles.some(toggle => toggle.customId === customId));

        return panel ? notificationComponents(instance, panel) : botComponents(instance);
    },
};

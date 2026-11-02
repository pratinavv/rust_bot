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

const FormatJS = require('@formatjs/intl');
const Discord = require('discord.js');
const Fs = require('fs');
const Path = require('path');

const Cctv = require('./Cctv');
const Config = require('../../config');
const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const DiscordTools = require('../discordTools/discordTools');
const InstanceUtils = require('../util/instanceUtils.js');
const Items = require('./Items');
const Logger = require('./Logger.js');
const PermissionHandler = require('../handlers/permissionHandler.js');
const RustLabs = require('../structures/RustLabs');
const RustPlus = require('../structures/RustPlus');
const Teams = require('../util/teams.js');
const dataPath = require('../util/dataPaths');

class DiscordBot extends Discord.Client {
    constructor(props) {
        super(props);

        this.logger = new Logger(dataPath('logs/discordBot.log'), 'default');

        this.commands = new Discord.Collection();
        this.fcmListeners = new Object();
        this.startupDone = false;
        this.instances = {};
        this.guildIntl = {};
        this.botIntl = null;
        this.enIntl = null;
        this.enMessages = JSON.parse(Fs.readFileSync(Path.join(__dirname, '..', 'languages', 'en.json')), 'utf8');

        this.rustplusInstances = new Object();
        this.activeRustplusInstances = new Object();
        this.rustplusReconnectTimers = new Object();
        this.rustplusLiteReconnectTimers = new Object();
        this.rustplusReconnecting = new Object();
        this.rustplusMaps = new Object();

        this.uptimeBot = null;

        this.items = new Items();
        this.rustlabs = new RustLabs();
        this.cctv = new Cctv();

        this.pollingIntervalMs = Config.general.pollingIntervalMs;

        this.loadDiscordCommands();
        this.loadDiscordEvents();
        this.loadEnIntl();
        this.loadBotIntl();
    }

    loadDiscordCommands() {
        const commandFiles = Fs.readdirSync(Path.join(__dirname, '..', 'commands'))
            .filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            this.commands.set(command.name, command);
        }
    }

    loadDiscordEvents() {
        const eventFiles = Fs.readdirSync(Path.join(__dirname, '..', 'discordEvents'))
            .filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`../discordEvents/${file}`);

            if (event.name === 'rateLimited') {
                this.rest.on(event.name, (...args) => event.execute(this, ...args));
            }
            else if (event.once) {
                this.once(event.name, (...args) => event.execute(this, ...args));
            }
            else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
    }

    loadEnIntl() {
        const language = 'en';
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.enIntl = FormatJS.createIntl({
            locale: language,
            defaultLocale: 'en',
            messages: messages
        }, cache);
    }

    loadBotIntl() {
        const language = Config.general.language;
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.botIntl = FormatJS.createIntl({
            locale: language,
            defaultLocale: 'en',
            messages: messages
        }, cache);
    }

    loadGuildIntl(guildId) {
        const instance = InstanceUtils.readInstanceFile(guildId);
        const language = instance.generalSettings.language;
        const path = Path.join(__dirname, '..', 'languages', `${language}.json`);
        const messages = JSON.parse(Fs.readFileSync(path, 'utf8'));
        const cache = FormatJS.createIntlCache();
        this.guildIntl[guildId] = FormatJS.createIntl({
            locale: language,
            defaultLocale: 'en',
            messages: messages
        }, cache);
    }

    loadGuildsIntl() {
        for (const team of Teams.active()) {
            this.loadGuildIntl(team.id);
        }
    }

    intlGet(guildId, id, variables = {}) {
        let intl = null;
        if (guildId && guildId !== 'en') {
            intl = this.guildIntl[guildId] || this.botIntl;
        }
        else {
            if (guildId === 'en') {
                intl = this.enIntl;
            }
            else {
                intl = this.botIntl;
            }
        }

        return intl.formatMessage({
            id: id,
            defaultMessage: this.enMessages[id]
        }, variables);
    }

    build() {
        this.login(Config.discord.token).catch(error => {
            switch (error.code) {
                case 502: {
                    this.log(this.intlGet(null, 'errorCap'),
                        this.intlGet(null, 'badGateway', { error: JSON.stringify(error) }), 'error')
                } break;

                case 503: {
                    this.log(this.intlGet(null, 'errorCap'),
                        this.intlGet(null, 'serviceUnavailable', { error: JSON.stringify(error) }), 'error')
                } break;

                default: {
                    this.log(this.intlGet(null, 'errorCap'), `${JSON.stringify(error)}`, 'error');
                } break;
            }
        });
    }

    log(title, text, level = 'info') {
        this.logger.log(title, text, level);
    }

    logInteraction(interaction, verifyId, type) {
        const channel = interaction.channel;
        const args = new Object();
        args['guild'] = `${interaction.member.guild.name} (${interaction.member.guild.id})`;
        args['channel'] = `${channel?.name} (${interaction.channelId})`;
        args['user'] = `${interaction.user.username} (${interaction.user.id})`;
        args[(type === 'slashCommand') ? 'command' : 'customid'] = (type === 'slashCommand') ?
            `${interaction.commandName}` : `${interaction.customId}`;
        args['id'] = `${verifyId}`;

        this.log(this.intlGet(null, 'infoCap'), this.intlGet(null, `${type}Interaction`, args));
    }

    async setupGuild(guild) {
        const instance = this.getInstance(guild.id);
        const firstTime = instance.firstTime;

        let category = await require('../discordTools/SetupGuildCategory')(this, guild);
        await require('../discordTools/SetupGuildChannels')(this, guild, category);
        if (firstTime) {
            const perms = PermissionHandler.getPermissionsRemoved(this, guild);
            try {
                await category.permissionOverwrites.set(perms);
            }
            catch (e) {
                /* Ignore */
            }
        }
        else {
            await PermissionHandler.resetPermissionsAllChannels(this, guild);
        }

        await require('../discordTools/SetupSettingsMenu')(this, guild);

        if (firstTime) await PermissionHandler.resetPermissionsAllChannels(this, guild);

        this.resetRustplusVariables(guild.id);
    }

    async syncCredentialsWithUsers(guild) {
        const credentials = InstanceUtils.readCredentialsFile(guild.id);
        const members = await guild.members.fetch();

        for (const [steamId, content] of Object.entries(credentials)) {
            if (steamId === 'hoster' || members.has(content.discord_user_id)) continue;

            await require('../util/teamManager.js').handleMemberGone(this, guild.id, content.discord_user_id);
        }
    }

    getInstance(guildId) {
        return this.instances[guildId];
    }

    setInstance(guildId, instance) {
        this.instances[guildId] = instance;
        InstanceUtils.writeInstanceFile(guildId, instance);
    }

    readNotificationSettingsTemplate() {
        return JSON.parse(Fs.readFileSync(
            Path.join(__dirname, '..', 'templates/notificationSettingsTemplate.json'), 'utf8'));
    }

    readGeneralSettingsTemplate() {
        return JSON.parse(Fs.readFileSync(
            Path.join(__dirname, '..', 'templates/generalSettingsTemplate.json'), 'utf8'));
    }

    createRustplusInstance(guildId, serverIp, appPort, steamId, playerToken) {
        let rustplus = new RustPlus(guildId, serverIp, appPort, steamId, playerToken);

        /* Add rustplus instance to Object */
        this.rustplusInstances[guildId] = rustplus;
        this.activeRustplusInstances[guildId] = true;

        rustplus.build();

        return rustplus;
    }

    createRustplusInstancesFromConfig() {
        const files = Fs.readdirSync(dataPath('instances'));

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const guildId = file.replace('.json', '');
            const instance = this.getInstance(guildId);
            if (!instance || Teams.get(guildId)?.status !== 'active') return;

            if (instance.activeServer !== null && instance.serverList.hasOwnProperty(instance.activeServer)) {
                this.createRustplusInstance(
                    guildId,
                    instance.serverList[instance.activeServer].serverIp,
                    instance.serverList[instance.activeServer].appPort,
                    instance.serverList[instance.activeServer].steamId,
                    instance.serverList[instance.activeServer].playerToken);
            }
        });
    }

    resetRustplusVariables(guildId) {
        this.activeRustplusInstances[guildId] = false;
        this.rustplusReconnecting[guildId] = false;
        delete this.rustplusMaps[guildId];

        if (this.rustplusReconnectTimers[guildId]) {
            clearTimeout(this.rustplusReconnectTimers[guildId]);
            this.rustplusReconnectTimers[guildId] = null;
        }
        if (this.rustplusLiteReconnectTimers[guildId]) {
            clearTimeout(this.rustplusLiteReconnectTimers[guildId]);
            this.rustplusLiteReconnectTimers[guildId] = null;
        }
    }

    isJpgImageChanged(guildId, map) {
        return ((JSON.stringify(this.rustplusMaps[guildId])) !== (JSON.stringify(map.jpgImage)));
    }

    async interactionReply(interaction, content) {
        try {
            return await interaction.reply(content);
        }
        catch (e) {
            this.log(this.intlGet(null, 'errorCap'),
                this.intlGet(null, 'interactionReplyFailed', { error: e }), 'error');
        }

        return undefined;
    }

    async interactionEditReply(interaction, content) {
        try {
            return await interaction.editReply(content);
        }
        catch (e) {
            this.log(this.intlGet(null, 'errorCap'),
                this.intlGet(null, 'interactionEditReplyFailed', { error: e }), 'error');
        }

        return undefined;
    }

    async interactionUpdate(interaction, content) {
        try {
            return await interaction.update(content);
        }
        catch (e) {
            this.log(this.intlGet(null, 'errorCap'),
                this.intlGet(null, 'interactionUpdateFailed', { error: e }), 'error');
        }

        return undefined;
    }

    async messageEdit(message, content) {
        try {
            return await message.edit(content);
        }
        catch (e) {
            this.log(this.intlGet(null, 'errorCap'),
                this.intlGet(null, 'messageEditFailed', { error: e }), 'error');
        }

        return undefined;
    }

    async messageSend(channel, content) {
        try {
            return await channel.send(content);
        }
        catch (e) {
            this.log(this.intlGet(null, 'errorCap'),
                this.intlGet(null, 'messageSendFailed', { error: e }), 'error');
        }

        return undefined;
    }

    async validatePermissions(interaction) {
        /* Commands that work without a team, like /help. */
        if (!interaction.teamId) return true;

        const instance = this.getInstance(interaction.teamId);

        if (instance.blacklist['discordIds'].includes(interaction.user.id) &&
            !interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
            return false;
        }

        /* If role isn't setup yet, validate as true */
        if (instance.role === null) return true;

        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator) &&
            !interaction.member.roles.cache.has(instance.role)) {
            let role = DiscordTools.getRole(interaction.teamId, instance.role);
            const str = this.intlGet(interaction.teamId, 'notPartOfRole', { role: role.name });
            await this.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, str));
            this.log(this.intlGet(null, 'warningCap'), str);
            return false;
        }
        return true;
    }

    isAdministrator(interaction) {
        return interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator);
    }
}

module.exports = DiscordBot;

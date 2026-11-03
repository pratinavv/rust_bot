/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

/*
    Team lifecycle: creating, joining, leaving, passing leadership and closing teams.

    Each team has one Rust+ connection, normally the leader's, so an event only produces one alert.
    Functions that can be refused return { ok: false, error: <language key>, vars } for the caller to show.
*/

const Fs = require('fs');

const Discord = require('discord.js');

const Config = require('../../config');
const DiscordTools = require('../discordTools/discordTools.js');
const InstanceUtils = require('./instanceUtils.js');
const Teams = require('./teams.js');
const dataPath = require('./dataPaths');

const TEAM_NAME_REGEX = /^[\p{L}\p{N} _-]{2,32}$/u;
const EXPIRY_WARNING_MS = 2 * 24 * 60 * 60 * 1000;
const TEAM_CHANNELS = ['category', 'information', 'events', 'teamchat'];

const refuse = (error, vars = {}) => ({ ok: false, error: error, vars: vars });
const success = (vars = {}) => ({ ok: true, vars: vars });

function realGuild(client, guildId) {
    return client.guilds.cache.get(guildId);
}

function expiryMs(credential) {
    const value = Number(credential.expire_date);
    if (Number.isNaN(value)) return Date.parse(credential.expire_date);
    return value < 1e12 ? value * 1000 : value;
}

function isExpired(credential) {
    return expiryMs(credential) <= Date.now();
}

function findCredential(guildId, discordId) {
    const credentials = InstanceUtils.readCredentialsFile(guildId);
    const steamId = Object.keys(credentials).find(key => key !== 'hoster' &&
        credentials[key].discord_user_id === discordId);
    return steamId ? { steamId: steamId, credential: credentials[steamId], credentials: credentials } : null;
}

async function sendDm(client, discordId, text) {
    try {
        const user = await client.users.fetch(discordId);
        await user.send(text);
    }
    catch (e) {
        client.log(client.intlGet(null, 'warningCap'), `Could not send a direct message to ${discordId}.`);
    }
}

function stopConnection(client, teamId) {
    const rustplus = client.rustplusInstances[teamId];
    client.resetRustplusVariables(teamId);
    if (!rustplus) return;

    if (rustplus.leaderRustPlusInstance) {
        rustplus.leaderRustPlusInstance.isActive = false;
        rustplus.leaderRustPlusInstance.disconnect();
        rustplus.leaderRustPlusInstance = null;
    }
    rustplus.isDeleted = true;
    rustplus.disconnect();
    delete client.rustplusInstances[teamId];
}

function startConnection(client, team) {
    const instance = client.getInstance(team.id);
    const server = instance.serverList[team.serverId];
    if (!server) return;

    client.resetRustplusVariables(team.id);
    instance.activeServer = team.serverId;
    client.setInstance(team.id, instance);

    const rustplus = client.createRustplusInstance(
        team.id, server.serverIp, server.appPort, server.steamId, server.playerToken);
    rustplus.isNewConnection = true;
}

/* Move the team's single Rust+ connection to another member. */
function switchHost(client, team, steamId) {
    const instance = client.getInstance(team.id);
    const token = instance.serverListLite[team.serverId]?.[steamId];
    if (!token) return false;

    if (team.hostSteamId === steamId) return true;

    stopConnection(client, team.id);

    team.hostSteamId = steamId;
    Teams.save();

    instance.serverList[team.serverId].steamId = steamId;
    instance.serverList[team.serverId].playerToken = token.playerToken;
    client.setInstance(team.id, instance);

    /* During startup, createRustplusInstancesFromConfig connects afterwards. */
    if (client.startupDone) startConnection(client, team);
    return true;
}

async function removeMember(client, team, discordId) {
    const steamId = team.members[discordId].steamId;

    if (team.hostSteamId === steamId) {
        const leaderSteamId = team.members[team.leaderDiscordId]?.steamId;
        if (leaderSteamId && leaderSteamId !== steamId) switchHost(client, team, leaderSteamId);
    }

    delete team.members[discordId];
    Teams.save();

    const instance = client.getInstance(team.id);
    if (instance && instance.serverListLite[team.serverId]) {
        delete instance.serverListLite[team.serverId][steamId];
        client.setInstance(team.id, instance);
    }

    const rustplus = client.rustplusInstances[team.id];
    if (rustplus && rustplus.isOperational) rustplus.updateLeaderRustPlusLiteInstance();

    try {
        const member = await realGuild(client, team.guildId).members.fetch(discordId);
        await member.roles.remove(team.roleId);
    }
    catch (e) {
        /* They already left the Discord server. */
    }
}

module.exports = {
    expiryMs,
    isExpired,
    findCredential,

    teamFromChannel: function (client, channel) {
        if (!channel) return undefined;
        return Teams.active(channel.guildId).find(team => {
            const instance = client.getInstance(team.id);
            const category = instance?.channelId.category;
            return category && (category === channel.parentId || category === channel.id);
        });
    },

    /* A team's own channels decide the team, anywhere else it is the team the member belongs to. */
    noTeamKey: function (guildId, discordId) {
        return Teams.teamsOf(guildId, discordId).length > 1 ? 'teamUseTeamChannel' : 'teamJoinFirst';
    },

    /* Commands run in one channel, so the team comes from what the player picked with /team use. */
    teamForInteraction: function (client, interaction) {
        const team = module.exports.teamFromChannel(client, interaction.channel);
        if (team) return team;

        const selected = Teams.getSelected(interaction.user.id);
        const isAdmin = interaction.member?.permissions?.has(Discord.PermissionFlagsBits.Administrator);
        if (selected?.status === 'active' && selected.guildId === interaction.guildId &&
            (selected.members[interaction.user.id] || isAdmin)) {
            return selected;
        }

        const teams = Teams.teamsOf(interaction.guildId, interaction.user.id);
        return teams.length === 1 ? teams[0] : undefined;
    },

    /* The channel commands belong in, if this command was run anywhere else. Servers without it have no limit. */
    wrongCommandChannel: function (interaction) {
        const channel = interaction.guild?.channels.cache.find(c => c.name === Config.discord.commandsChannel);
        return channel && channel.id !== interaction.channelId ? channel : null;
    },

    onServerPaired: async function (client, guildId, steamId, title, body, notify = true) {
        const credentials = InstanceUtils.readCredentialsFile(guildId);
        const credential = credentials[steamId];
        if (!credential) return;

        const serverId = `${body.ip}-${body.port}`;
        credential.pendingServer = { serverId: serverId, title: title, body: body };
        InstanceUtils.writeCredentialsFile(guildId, credentials);

        if (notify) {
            await sendDm(client, credential.discord_user_id, client.intlGet(null, 'teamPairedCreate', { server: title }));
        }
    },

    createTeam: async function (client, member, name) {
        const guildId = member.guild.id;
        name = name.trim();

        if (!TEAM_NAME_REGEX.test(name)) return refuse('teamNameInvalid');
        if (Teams.active(guildId).length >= Teams.MAX_ACTIVE_TEAMS) {
            return refuse('teamLimitReached', { limit: Teams.MAX_ACTIVE_TEAMS });
        }
        if (Teams.findByName(guildId, name)) return refuse('teamNameTaken', { name: name });

        const found = findCredential(guildId, member.id);
        if (!found) return refuse('teamNeedCredentials');
        if (!found.credential.pendingServer) return refuse('teamNeedPairing');

        const { steamId, credentials } = found;
        const pending = found.credential.pendingServer;

        const role = await realGuild(client, guildId).roles.create({ name: name, reason: 'pratinavv team created' });

        const team = Teams.create({
            guildId: guildId,
            name: name,
            roleId: role.id,
            leaderDiscordId: member.id,
            leaderSteamId: steamId,
            serverId: pending.serverId
        });

        try {
            await member.roles.add(role);

            const guild = DiscordTools.getGuild(team.id);
            require('./CreateInstanceFile')(client, guild);
            client.loadGuildIntl(team.id);

            const instance = client.getInstance(team.id);
            instance.role = role.id;
            client.setInstance(team.id, instance);

            await client.setupGuild(guild);

            await require('./FcmListener').pairingServer(client, guild, pending.title, null, pending.body);

            delete credentials[steamId].pendingServer;
            InstanceUtils.writeCredentialsFile(guildId, credentials);

            startConnection(client, team);
        }
        catch (e) {
            client.log(client.intlGet(null, 'errorCap'), `Could not create team ${name}: ${e}`, 'error');
            await module.exports.closeTeam(client, team, null);
            return refuse('teamCreateFailed');
        }

        return success({ team: name, channel: `<#${client.getInstance(team.id).channelId.information}>` });
    },

    /* Anyone with credentials can join any team. Only a paired member can later lead the team or host its alerts. */
    joinTeam: async function (client, member, teamId) {
        const guildId = member.guild.id;

        const found = findCredential(guildId, member.id);
        if (!found) return refuse('teamNeedCredentials');

        const team = Teams.get(teamId);
        if (!team || team.status !== 'active') return refuse('teamChannelClosed');
        if (team.members[member.id]) return refuse('teamAlreadyInThisTeam', { team: team.name });

        const { steamId, credentials } = found;

        team.members[member.id] = { steamId: steamId, joinedAt: Date.now() };
        Teams.save();

        await member.roles.add(team.roleId);

        const instance = client.getInstance(team.id);
        const pending = found.credential.pendingServer;
        const paired = pending?.serverId === team.serverId;

        if (paired) {
            if (!instance.serverListLite[team.serverId]) instance.serverListLite[team.serverId] = new Object();
            instance.serverListLite[team.serverId][steamId] = {
                serverIp: pending.body.ip,
                appPort: pending.body.port,
                steamId: steamId,
                playerToken: pending.body.playerToken
            };
            client.setInstance(team.id, instance);

            delete credentials[steamId].pendingServer;
            InstanceUtils.writeCredentialsFile(guildId, credentials);

            const rustplus = client.rustplusInstances[team.id];
            if (rustplus && rustplus.team?.leaderSteamId === steamId) rustplus.updateLeaderRustPlusLiteInstance();
        }

        return success({ team: team.name, channel: `<#${instance.channelId.information}>`, paired: paired });
    },

    leaveTeam: async function (client, team, discordId) {
        if (!team || !team.members[discordId]) return refuse('teamNotInTeam');
        if (team.leaderDiscordId === discordId) return refuse('teamLeaderCannotLeave');

        await removeMember(client, team, discordId);
        return success({ team: team.name });
    },

    kickMember: async function (client, team, discordId) {
        if (!team.members[discordId]) return refuse('teamTargetNotInTeam');
        if (team.leaderDiscordId === discordId) return refuse('teamCannotKickLeader');

        await removeMember(client, team, discordId);
        await sendDm(client, discordId, client.intlGet(null, 'teamKickedDm', { team: team.name }));
        return success({ team: team.name });
    },

    passLeader: async function (client, team, discordId) {
        if (!team.members[discordId]) return refuse('teamTargetNotInTeam');
        if (team.leaderDiscordId === discordId) return refuse('teamAlreadyLeader');

        const steamId = team.members[discordId].steamId;
        const instance = client.getInstance(team.id);
        if (!instance.serverListLite[team.serverId]?.[steamId]) return refuse('teamTargetNotPaired');

        team.leaderDiscordId = discordId;
        Teams.save();
        switchHost(client, team, steamId);

        await sendDm(client, discordId, client.intlGet(null, 'teamYouAreLeaderDm', { team: team.name }));
        return success({ team: team.name });
    },

    renameTeam: async function (client, team, name) {
        name = name.trim();
        if (!TEAM_NAME_REGEX.test(name)) return refuse('teamNameInvalid');

        const other = Teams.findByName(team.guildId, name);
        if (other && other.id !== team.id) return refuse('teamNameTaken', { name: name });

        const guild = realGuild(client, team.guildId);
        const role = guild.roles.cache.get(team.roleId);
        if (role) await role.setName(name);

        const category = DiscordTools.getCategoryById(team.id, client.getInstance(team.id).channelId.category);
        if (category) await category.setName(name);

        team.name = name;
        Teams.save();
        return success({ team: name });
    },

    /* Stops the team's alerts and hides its channels. The channels are deleted after the retention period. */
    closeTeam: async function (client, team, reasonKey) {
        stopConnection(client, team.id);

        const instance = client.getInstance(team.id);
        if (instance) {
            instance.activeServer = null;
            client.setInstance(team.id, instance);
        }

        const memberIds = Object.keys(team.members);

        team.status = 'closed';
        team.closedAt = Date.now();
        team.members = {};
        Teams.save();

        /* Channels only allow the team role, so deleting it hides them from everyone but admins. */
        try {
            await realGuild(client, team.guildId).roles.delete(team.roleId, 'pratinavv team closed');
        }
        catch (e) {
            client.log(client.intlGet(null, 'warningCap'), `Could not delete the role of team ${team.name}.`);
        }

        if (reasonKey) {
            const text = client.intlGet(null, reasonKey, { team: team.name });
            for (const discordId of memberIds) await sendDm(client, discordId, text);
        }
    },

    /* A changed wipe time means the team's single wipe is over. Returns true if the team was closed. */
    checkWipe: async function (client, teamId, wipeTime) {
        const team = Teams.get(teamId);
        if (!team || team.status !== 'active' || !wipeTime) return false;

        if (team.wipeTime === null) {
            team.wipeTime = wipeTime;
            Teams.save();
            return false;
        }
        if (team.wipeTime === wipeTime) return false;

        await module.exports.closeTeam(client, team, 'teamClosedByWipeDm');
        return true;
    },

    /* The player left the Discord server or removed their credentials. */
    handleMemberGone: async function (client, guildId, discordId) {
        for (const team of Teams.teamsOf(guildId, discordId)) {
            if (team.leaderDiscordId !== discordId) {
                await removeMember(client, team, discordId);
                continue;
            }

            const instance = client.getInstance(team.id);
            const nextLeader = Teams.membersByJoinOrder(team, discordId).find(id =>
                instance.serverListLite[team.serverId]?.[team.members[id].steamId]);

            if (!nextLeader) {
                await module.exports.closeTeam(client, team, null);
                continue;
            }

            team.leaderDiscordId = nextLeader;
            Teams.save();
            switchHost(client, team, team.members[nextLeader].steamId);
            await removeMember(client, team, discordId);
            await sendDm(client, nextLeader, client.intlGet(null, 'teamYouAreLeaderDm', { team: team.name }));
        }

        const found = findCredential(guildId, discordId);
        if (!found) return;

        require('./FcmListener').stop(client, found.steamId);
        delete found.credentials[found.steamId];
        InstanceUtils.writeCredentialsFile(guildId, found.credentials);
    },

    /* Renewed credentials bring the team's connection back to its leader. */
    onCredentialsRenewed: function (client, guildId, discordId, steamId) {
        for (const team of Teams.teamsOf(guildId, discordId)) {
            if (team.leaderDiscordId === discordId) switchHost(client, team, steamId);
        }
    },

    /* Hourly housekeeping: warn before credentials expire, keep alerts running, delete old closed teams. */
    tick: async function (client) {
        for (const guildId of client.guilds.cache.keys()) {
            const credentials = InstanceUtils.readCredentialsFile(guildId);
            let changed = false;

            for (const [steamId, credential] of Object.entries(credentials)) {
                if (steamId === 'hoster') continue;
                const expiry = expiryMs(credential);
                if (expiry - Date.now() > EXPIRY_WARNING_MS || credential.expiryWarnedFor === credential.expire_date) {
                    continue;
                }
                credential.expiryWarnedFor = credential.expire_date;
                changed = true;
                await sendDm(client, credential.discord_user_id, client.intlGet(null, 'teamCredentialsExpiringDm', {
                    date: new Date(expiry).toUTCString()
                }));
            }
            if (changed) InstanceUtils.writeCredentialsFile(guildId, credentials);

            for (const team of Teams.active(guildId)) {
                const host = credentials[team.hostSteamId];
                if (host && !isExpired(host)) continue;

                const instance = client.getInstance(team.id);
                const replacement = Teams.membersByJoinOrder(team).map(id => team.members[id].steamId).find(id =>
                    credentials[id] && !isExpired(credentials[id]) && instance.serverListLite[team.serverId]?.[id]);
                if (!replacement) continue;

                switchHost(client, team, replacement);
                await sendDm(client, team.leaderDiscordId,
                    client.intlGet(null, 'teamHostFallbackDm', { team: team.name }));
            }
        }

        for (const team of Teams.closed()) {
            if (Date.now() - team.closedAt < Teams.CLOSED_TEAM_RETENTION_MS) continue;

            if (!client.getInstance(team.id) && Fs.existsSync(dataPath('instances', `${team.id}.json`))) {
                client.instances[team.id] = InstanceUtils.readInstanceFile(team.id);
            }
            if (client.getInstance(team.id)) {
                await require('../discordTools/RemoveGuildChannels')(client, DiscordTools.getGuild(team.id));
            }

            delete client.instances[team.id];
            Fs.rmSync(dataPath('instances', `${team.id}.json`), { force: true });
            Teams.remove(team.id);
        }
    },

    /* Removes the channels of an existing team that teams no longer have. Returns true if any were removed. */
    trimTeamChannels: async function (client, team) {
        const instance = client.getInstance(team.id);
        const removed = Object.keys(instance.channelId).filter(name => !TEAM_CHANNELS.includes(name));
        for (const name of removed) {
            await DiscordTools.removeTextChannel(team.id, instance.channelId[name]);
            delete instance.channelId[name];
        }
        if (removed.length > 0) client.setInstance(team.id, instance);
        return removed.length > 0;
    },

    /* Turns the old one-team-per-server data into the first team. Keeps a backup of the old instance. */
    migrateGuild: function (client, guild) {
        const oldPath = dataPath('instances', `${guild.id}.json`);
        if (!Fs.existsSync(oldPath)) return;

        const instance = JSON.parse(Fs.readFileSync(oldPath, 'utf8'));
        const credentials = InstanceUtils.readCredentialsFile(guild.id);
        const hoster = credentials[credentials.hoster];
        const serverId = instance.activeServer || Object.keys(instance.serverList)[0];

        if (hoster && serverId && instance.role) {
            const category = guild.channels.cache.get(instance.channelId.category);
            const team = Teams.create({
                guildId: guild.id,
                name: category ? category.name : 'Team',
                roleId: instance.role,
                leaderDiscordId: hoster.discord_user_id,
                leaderSteamId: credentials.hoster,
                serverId: serverId
            });
            InstanceUtils.writeInstanceFile(team.id, instance);
        }

        Fs.renameSync(oldPath, `${oldPath}.pre-teams.bak`);
    },
};

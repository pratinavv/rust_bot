/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

/*
    Registry of the Rust teams the bot runs.

    The rest of the code passes a team id wherever it says guildId: instances, intl, Rust+ connections and
    FCM listeners are all kept per team. DiscordTools.getGuild turns a team id back into its Discord server.
*/

const Crypto = require('crypto');
const Fs = require('fs');

const dataPath = require('./dataPaths');

const MAX_ACTIVE_TEAMS = 20;
const CLOSED_TEAM_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let data = null;

function load() {
    if (data === null) {
        const path = dataPath('teams.json');
        data = Fs.existsSync(path) ? JSON.parse(Fs.readFileSync(path, 'utf8')) : { teams: {} };
        if (!data.selected) data.selected = {};
    }
    return data;
}

module.exports = {
    MAX_ACTIVE_TEAMS,
    CLOSED_TEAM_RETENTION_MS,

    save: function () {
        Fs.writeFileSync(dataPath('teams.json'), JSON.stringify(load(), null, 2));
    },

    get: function (teamId) {
        return load().teams[teamId];
    },

    guildIdOf: function (teamId) {
        const team = load().teams[teamId];
        return team ? team.guildId : null;
    },

    all: function () {
        return Object.values(load().teams);
    },

    active: function (guildId = null) {
        return module.exports.all().filter(team => team.status === 'active' &&
            (guildId === null || team.guildId === guildId));
    },

    closed: function () {
        return module.exports.all().filter(team => team.status === 'closed');
    },

    create: function ({ guildId, name, roleId, leaderDiscordId, leaderSteamId, serverId }) {
        const id = `team-${Crypto.randomBytes(4).toString('hex')}`;
        load().teams[id] = {
            id: id,
            guildId: guildId,
            name: name,
            roleId: roleId,
            status: 'active',
            leaderDiscordId: leaderDiscordId,
            hostSteamId: leaderSteamId,
            serverId: serverId,
            wipeTime: null,
            members: { [leaderDiscordId]: { steamId: leaderSteamId, joinedAt: Date.now() } },
            createdAt: Date.now(),
            closedAt: null
        };
        module.exports.save();
        return load().teams[id];
    },

    remove: function (teamId) {
        delete load().teams[teamId];
        module.exports.save();
    },

    /* The team someone picked with /team use. */
    getSelected: function (discordId) {
        return load().teams[load().selected[discordId]];
    },

    setSelected: function (discordId, teamId) {
        load().selected[discordId] = teamId;
        module.exports.save();
    },

    teamsOf: function (guildId, discordId) {
        return module.exports.active(guildId).filter(team => team.members.hasOwnProperty(discordId));
    },

    teamsOfSteamIdOnServer: function (guildId, steamId, serverId) {
        return module.exports.active(guildId).filter(team => team.serverId === serverId &&
            module.exports.steamIdsOf(team).includes(steamId));
    },

    findByName: function (guildId, name) {
        return module.exports.active(guildId).find(team => team.name.toLowerCase() === name.toLowerCase());
    },

    steamIdsOf: function (team) {
        return Object.values(team.members).map(member => member.steamId);
    },

    /* Members ordered by who joined first, without the given member. */
    membersByJoinOrder: function (team, excludeDiscordId = null) {
        return Object.keys(team.members)
            .filter(discordId => discordId !== excludeDiscordId)
            .sort((a, b) => team.members[a].joinedAt - team.members[b].joinedAt);
    },
};

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

const Teams = require('./teams.js');
const dataPath = require('./dataPaths');

module.exports = {

    readInstanceFile: function (guildId) {
        const path = dataPath('instances', `${guildId}.json`);
        return JSON.parse(Fs.readFileSync(path, 'utf8'));
    },

    writeInstanceFile: function (guildId, instance) {
        const path = dataPath('instances', `${guildId}.json`);
        Fs.writeFileSync(path, JSON.stringify(instance, null, 2));
    },

    /* Credentials are stored per Discord server. For a team id this returns only that team's members. */
    readCredentialsFile: function (guildId) {
        const team = Teams.get(guildId);
        const path = dataPath('credentials', `${team ? team.guildId : guildId}.json`);
        const credentials = JSON.parse(Fs.readFileSync(path, 'utf8'));
        if (!team) return credentials;

        const view = { hoster: team.hostSteamId };
        for (const steamId of Teams.steamIdsOf(team)) {
            if (credentials[steamId]) view[steamId] = credentials[steamId];
        }
        return view;
    },

    writeCredentialsFile: function (guildId, credentials) {
        const path = dataPath('credentials', `${guildId}.json`);
        Fs.writeFileSync(path, JSON.stringify(credentials, null, 2));
    },
}

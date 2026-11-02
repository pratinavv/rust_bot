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

const Fs = require("fs");
const Path = require('path');
const Rest = require('@discordjs/rest');
const Types = require('discord-api-types/v9');

const Config = require('../../config');
const Teams = require('../util/teams.js');

module.exports = async (client, guild) => {
    const guildId = Teams.guildIdOf(guild.id) ?? guild.id;
    const commands = [];
    const commandFiles = Fs.readdirSync(Path.join(__dirname, '..', 'commands')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        commands.push(command.getData(client, guildId).toJSON());
    }

    const rest = new Rest.REST({ version: '9' }).setToken(Config.discord.token);

    try {
        await rest.put(Types.Routes.applicationGuildCommands(Config.discord.clientId, guildId), { body: commands });
    }
    catch (e) {
        client.log(
            client.intlGet(null, 'errorCap'),
            client.intlGet(null, 'couldNotRegisterSlashCommands', { guildId: guildId }) +
            client.intlGet(null, 'makeSureApplicationsCommandsEnabled'),
            'error'
        );
        process.exit(1);
    }
    client.log(client.intlGet(null, 'infoCap'),
        client.intlGet(null, 'slashCommandsSuccessRegister', { guildId: guildId }));
};

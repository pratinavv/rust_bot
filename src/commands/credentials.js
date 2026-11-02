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

const Builder = require('@discordjs/builders');

const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const InstanceUtils = require('../util/instanceUtils.js');
const TeamManager = require('../util/teamManager.js');
const Teams = require('../util/teams.js');

module.exports = {
    name: 'credentials',

    getData(client, guildId) {
        return new Builder.SlashCommandBuilder()
            .setName('credentials')
            .setDescription(client.intlGet(guildId, 'commandsCredentialsDesc'))
            .addSubcommand(subcommand => subcommand
                .setName('add')
                .setDescription(client.intlGet(guildId, 'commandsCredentialsAddDesc'))
                .addStringOption(option => option
                    .setName('gcm_android_id')
                    .setDescription('GCM Android ID.')
                    .setRequired(true))
                .addStringOption(option => option
                    .setName('gcm_security_token')
                    .setDescription('GCM Security Token.')
                    .setRequired(true))
                .addStringOption(option => option
                    .setName('steam_id')
                    .setDescription('Steam ID.')
                    .setRequired(true))
                .addStringOption(option => option
                    .setName('issued_date')
                    .setDescription('Issued date of the credentials.')
                    .setRequired(true))
                .addStringOption(option => option
                    .setName('expire_date')
                    .setDescription('Expire date of the credentials.')
                    .setRequired(true)))
            .addSubcommand(subcommand => subcommand
                .setName('remove')
                .setDescription(client.intlGet(guildId, 'commandsCredentialsRemoveDesc')))
            .addSubcommand(subcommand => subcommand
                .setName('show')
                .setDescription(client.intlGet(guildId, 'commandsCredentialsShowDesc')));
    },

    async execute(client, interaction) {
        const verifyId = Math.floor(100000 + Math.random() * 900000);
        client.logInteraction(interaction, verifyId, 'slashCommand');

        await interaction.deferReply({ ephemeral: true });

        switch (interaction.options.getSubcommand()) {
            case 'add': {
                await addCredentials(client, interaction);
            } break;

            case 'remove': {
                await removeCredentials(client, interaction);
            } break;

            case 'show': {
                await showCredentials(client, interaction);
            } break;

            default: {
            } break;
        }
    },
};

async function reply(client, interaction, color, key, vars = {}) {
    await client.interactionEditReply(interaction,
        DiscordEmbeds.getActionInfoEmbed(color, client.intlGet(null, key, vars)));
}

async function addCredentials(client, interaction) {
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;
    const credentials = InstanceUtils.readCredentialsFile(guildId);
    const steamId = interaction.options.getString('steam_id').trim();

    if (!/^d{17}$/.test(steamId)) return reply(client, interaction, 1, 'credentialsInvalidSteamId');

    if (credentials[steamId] && credentials[steamId].discord_user_id !== discordId) {
        return reply(client, interaction, 1, 'credentialsUsedByOther');
    }

    const existing = TeamManager.findCredential(guildId, discordId);
    if (existing && existing.steamId !== steamId) return reply(client, interaction, 1, 'credentialsOneAccountOnly');

    const renewed = existing !== null;
    credentials[steamId] = {
        ...(renewed ? existing.credential : {}),
        gcm: {
            android_id: interaction.options.getString('gcm_android_id'),
            security_token: interaction.options.getString('gcm_security_token')
        },
        issued_date: interaction.options.getString('issued_date'),
        expire_date: interaction.options.getString('expire_date'),
        discord_user_id: discordId
    };
    InstanceUtils.writeCredentialsFile(guildId, credentials);

    require('../util/FcmListener').start(client, guildId, steamId);
    TeamManager.onCredentialsRenewed(client, guildId, discordId, steamId);

    client.log(client.intlGet(null, 'infoCap'), `Credentials saved for steamId ${steamId}.`);
    await reply(client, interaction, 0, renewed ? 'credentialsRenewed' : 'credentialsAddedNextStep');
}

async function removeCredentials(client, interaction) {
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    if (!TeamManager.findCredential(guildId, discordId)) return reply(client, interaction, 1, 'credentialsNotFound');

    const led = Teams.teamsOf(guildId, discordId).find(team => team.leaderDiscordId === discordId);
    if (led) return reply(client, interaction, 1, 'credentialsLeaderMustPass', { team: led.name });

    await TeamManager.handleMemberGone(client, guildId, discordId);
    await reply(client, interaction, 0, 'credentialsRemoved');
}

async function showCredentials(client, interaction) {
    const guildId = interaction.guildId;
    const found = TeamManager.findCredential(guildId, interaction.user.id);

    if (!found) return reply(client, interaction, 1, 'credentialsNotFound');

    const teams = Teams.teamsOf(guildId, interaction.user.id);
    await reply(client, interaction, 0, 'credentialsShow', {
        steamId: found.steamId,
        date: new Date(TeamManager.expiryMs(found.credential)).toUTCString(),
        team: teams.length > 0 ? teams.map(team => team.name).join(', ') : client.intlGet(null, 'teamNone')
    });
}

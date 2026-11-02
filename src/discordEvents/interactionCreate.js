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

const DiscordEmbeds = require('../discordTools/discordEmbeds');
const TeamManager = require('../util/teamManager.js');

/* These work before a player has a team. */
const COMMANDS_WITHOUT_TEAM = ['credentials', 'team', 'help'];

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        /* Handled by the collector in the team command. */
        if (interaction.isMessageComponent() && interaction.customId.startsWith('TeamConfirm')) return;

        const team = TeamManager.teamForInteraction(client, interaction);
        interaction.teamId = team ? team.id : null;

        if (!team && !COMMANDS_WITHOUT_TEAM.includes(interaction.commandName)) {
            const key = interaction.isChatInputCommand() ?
                TeamManager.noTeamKey(interaction.guildId, interaction.user.id) : 'teamChannelClosed';
            await client.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, client.intlGet(null, key)));
            return;
        }

        const instance = team ? client.getInstance(team.id) : null;

        /* Check so that the interaction comes from valid channels */
        if (instance && !Object.values(instance.channelId).includes(interaction.channelId) && !interaction.isCommand) {
            client.log(client.intlGet(null, 'warningCap'), client.intlGet(null, 'interactionInvalidChannel'))
            if (interaction.isButton()) {
                try {
                    interaction.deferUpdate();
                }
                catch (e) {
                    client.log(client.intlGet(null, 'errorCap'),
                        client.intlGet(null, 'couldNotDeferInteraction'), 'error');
                }
            }
        }

        if (interaction.isButton()) {
            require('../handlers/buttonHandler')(client, interaction);
        }
        else if (interaction.type === Discord.InteractionType.ApplicationCommand) {
            const command = interaction.client.commands.get(interaction.commandName);

            /* If the command doesn't exist, return */
            if (!command) return;

            try {
                await command.execute(client, interaction);
            }
            catch (e) {
                client.log(client.intlGet(null, 'errorCap'), e, 'error');

                const str = client.intlGet(interaction.teamId, 'errorExecutingCommand');
                await client.interactionEditReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, str));
                client.log(client.intlGet(null, 'errorCap'), str, 'error');
            }
        }
        else if (interaction.type === Discord.InteractionType.ModalSubmit) {
            require('../handlers/modalHandler')(client, interaction);
        }
        else {
            client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'unknownInteraction'), 'error');

            if (interaction.isButton()) {
                try {
                    interaction.deferUpdate();
                }
                catch (e) {
                    client.log(client.intlGet(null, 'errorCap'),
                        client.intlGet(null, 'couldNotDeferInteraction'), 'error');
                }
            }
        }
    },
};
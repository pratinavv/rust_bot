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

const Config = require('../../config');
const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const DiscordMessages = require('../discordTools/discordMessages.js');
const DiscordTools = require('../discordTools/discordTools.js');
const PermissionHandler = require('../handlers/permissionHandler.js');

module.exports = {
	name: 'reset',

	getData(client, guildId) {
		return new Builder.SlashCommandBuilder()
			.setName('reset')
			.setDescription(client.intlGet(guildId, 'commandsResetDesc'))
			.addSubcommand(subcommand => subcommand
				.setName('discord')
				.setDescription(client.intlGet(guildId, 'commandsResetDesc')))
			.addSubcommand(subcommand => subcommand
				.setName('information')
				.setDescription(client.intlGet(guildId, 'commandsResetInformationDesc')));
	},

	async execute(client, interaction) {
		const instance = client.getInstance(interaction.teamId);

		const verifyId = Math.floor(100000 + Math.random() * 900000);
		client.logInteraction(interaction, verifyId, 'slashCommand');

		if (!await client.validatePermissions(interaction)) return;

		if (Config.discord.needAdminPrivileges && !client.isAdministrator(interaction)) {
			const str = client.intlGet(interaction.teamId, 'missingPermission');
			client.interactionReply(interaction, DiscordEmbeds.getActionInfoEmbed(1, str));
			client.log(client.intlGet(null, 'warningCap'), str);
			return;
		}
		await interaction.deferReply({ ephemeral: true });

		const guild = DiscordTools.getGuild(interaction.teamId);

		if (interaction.options.getSubcommand() === 'discord') {
			await require('../discordTools/RemoveGuildChannels')(client, guild);

			const category = await require('../discordTools/SetupGuildCategory')(client, guild);
			await require('../discordTools/SetupGuildChannels')(client, guild, category);
		}

		/* Settings and the live information share a channel, so they are always rebuilt together. */
		await require('../discordTools/SetupSettingsMenu')(client, guild, true);

		const rustplus = client.rustplusInstances[guild.id];
		if (rustplus && rustplus.isOperational) {
			await rustplus.map.writeMap(false, true);
			await DiscordMessages.sendUpdateMapInformationMessage(rustplus);
		}

		await PermissionHandler.resetPermissionsAllChannels(client, guild);

		client.log(client.intlGet(null, 'infoCap'), client.intlGet(null, 'slashCommandValueChange', {
			id: `${verifyId}`,
			value: interaction.options.getSubcommand()
		}));

		const str = client.intlGet(interaction.teamId, 'resetSuccess');
		await client.interactionEditReply(interaction, DiscordEmbeds.getActionInfoEmbed(0, str));
		client.log(client.intlGet(null, 'infoCap'), str);
	},
};

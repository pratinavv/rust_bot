/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

const Builder = require('@discordjs/builders');
const Discord = require('discord.js');

const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const TeamManager = require('../util/teamManager.js');
const Teams = require('../util/teams.js');

const CONFIRM_TIMEOUT_MS = 30000;

module.exports = {
	name: 'team',

	getData(client, guildId) {
		return new Builder.SlashCommandBuilder()
			.setName('team')
			.setDescription(client.intlGet(guildId, 'commandsTeamDesc'))
			.addSubcommand(subcommand => subcommand
				.setName('create')
				.setDescription(client.intlGet(guildId, 'commandsTeamCreateDesc'))
				.addStringOption(option => option
					.setName('name')
					.setDescription(client.intlGet(guildId, 'commandsTeamNameDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('join')
				.setDescription(client.intlGet(guildId, 'commandsTeamJoinDesc')))
			.addSubcommand(subcommand => subcommand
				.setName('leave')
				.setDescription(client.intlGet(guildId, 'commandsTeamLeaveDesc')))
			.addSubcommand(subcommand => subcommand
				.setName('info')
				.setDescription(client.intlGet(guildId, 'commandsTeamInfoDesc')))
			.addSubcommand(subcommand => subcommand
				.setName('rename')
				.setDescription(client.intlGet(guildId, 'commandsTeamRenameDesc'))
				.addStringOption(option => option
					.setName('name')
					.setDescription(client.intlGet(guildId, 'commandsTeamNameDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('pass-leader')
				.setDescription(client.intlGet(guildId, 'commandsTeamPassLeaderDesc'))
				.addUserOption(option => option
					.setName('member')
					.setDescription(client.intlGet(guildId, 'commandsTeamMemberDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('kick')
				.setDescription(client.intlGet(guildId, 'commandsTeamKickDesc'))
				.addUserOption(option => option
					.setName('member')
					.setDescription(client.intlGet(guildId, 'commandsTeamMemberDesc'))
					.setRequired(true)))
			.addSubcommand(subcommand => subcommand
				.setName('end-wipe')
				.setDescription(client.intlGet(guildId, 'commandsTeamEndWipeDesc')));
	},

	async execute(client, interaction) {
		const verifyId = Math.floor(100000 + Math.random() * 900000);
		client.logInteraction(interaction, verifyId, 'slashCommand');

		await interaction.deferReply({ ephemeral: true });

		const subcommand = interaction.options.getSubcommand();
		const team = interaction.teamId ? Teams.get(interaction.teamId) : undefined;
		let result = null;

		if (!team && !['create', 'join'].includes(subcommand)) {
			return reply(client, interaction, 1, TeamManager.noTeamKey(interaction.guildId, interaction.user.id));
		}

		switch (subcommand) {
			case 'create': {
				result = await TeamManager.createTeam(client, interaction.member, interaction.options.getString('name'));
				if (result.ok) return reply(client, interaction, 0, 'teamCreated', result.vars);
			} break;

			case 'join': {
				return joinWithPicker(client, interaction);
			}

			case 'leave': {
				result = await TeamManager.leaveTeam(client, team, interaction.user.id);
				if (result.ok) return reply(client, interaction, 0, 'teamLeft', result.vars);
			} break;

			case 'info': {
				return showInfo(client, interaction, team);
			}

			case 'rename': {
				if (!canManage(client, interaction, team)) return reply(client, interaction, 1, 'teamLeaderOnly');
				result = await TeamManager.renameTeam(client, team, interaction.options.getString('name'));
				if (result.ok) return reply(client, interaction, 0, 'teamRenamed', result.vars);
			} break;

			case 'pass-leader': {
				if (!canManage(client, interaction, team)) return reply(client, interaction, 1, 'teamLeaderOnly');
				const target = interaction.options.getUser('member');
				result = await TeamManager.passLeader(client, team, target.id);
				if (result.ok) {
					return reply(client, interaction, 0, 'teamLeaderPassed', { name: target.username, team: team.name });
				}
			} break;

			case 'kick': {
				if (!canManage(client, interaction, team)) return reply(client, interaction, 1, 'teamLeaderOnly');
				const target = interaction.options.getUser('member');
				result = await TeamManager.kickMember(client, team, target.id);
				if (result.ok) {
					return reply(client, interaction, 0, 'teamKicked', { name: target.username, team: team.name });
				}
			} break;

			case 'end-wipe': {
				if (!canManage(client, interaction, team)) return reply(client, interaction, 1, 'teamLeaderOnly');
				return endWipe(client, interaction, team);
			}

			default: {
			} break;
		}

		await reply(client, interaction, 1, result.error, result.vars);
	},
};

function canManage(client, interaction, team) {
	return team && (team.leaderDiscordId === interaction.user.id || client.isAdministrator(interaction));
}

async function reply(client, interaction, color, key, vars = {}) {
	await client.interactionEditReply(interaction, DiscordEmbeds.getActionInfoEmbed(color, client.intlGet(null, key, vars)));
}

async function joinWithPicker(client, interaction) {
	if (!TeamManager.findCredential(interaction.guildId, interaction.user.id)) {
		return reply(client, interaction, 1, 'teamNeedCredentials');
	}

	const teams = Teams.active(interaction.guildId).filter(team => !team.members[interaction.user.id]);
	if (teams.length === 0) return reply(client, interaction, 1, 'teamNoTeamsToJoin');

	const menu = new Discord.StringSelectMenuBuilder()
		.setCustomId('TeamConfirmJoin')
		.setPlaceholder(client.intlGet(null, 'teamJoinPlaceholder'))
		.setOptions(teams.slice(0, 25).map(team => ({
			label: team.name,
			description: `${client.getInstance(team.id).serverList[team.serverId]?.title ?? team.serverId}`.slice(0, 100),
			value: team.id
		})));

	const message = await client.interactionEditReply(interaction, {
		...DiscordEmbeds.getActionInfoEmbed(0, client.intlGet(null, 'teamJoinPick')),
		components: [new Discord.ActionRowBuilder().addComponents(menu)]
	});
	if (!message) return;

	const pick = await message.awaitMessageComponent({
		filter: i => i.user.id === interaction.user.id && i.customId === 'TeamConfirmJoin',
		time: CONFIRM_TIMEOUT_MS
	}).catch(() => null);

	if (!pick) {
		await client.interactionEditReply(interaction, {
			...DiscordEmbeds.getActionInfoEmbed(1, client.intlGet(null, 'teamEndWipeCancelled')),
			components: []
		});
		return;
	}

	await pick.deferUpdate();
	const result = await TeamManager.joinTeam(client, interaction.member, pick.values[0]);
	const text = !result.ok ? client.intlGet(null, result.error, result.vars) :
		client.intlGet(null, result.vars.paired ? 'teamJoined' : 'teamJoinedNotPaired', result.vars);

	await client.interactionEditReply(interaction, {
		...DiscordEmbeds.getActionInfoEmbed(result.ok ? 0 : 1, text),
		components: []
	});
}

async function showInfo(client, interaction, team) {
	const instance = client.getInstance(team.id);
	const members = Teams.membersByJoinOrder(team).map(id => `<@${id}>`).join(', ');

	await reply(client, interaction, 0, 'teamInfo', {
		team: team.name,
		leader: `<@${team.leaderDiscordId}>`,
		server: instance.serverList[team.serverId]?.title ?? team.serverId,
		members: members
	});
}

async function endWipe(client, interaction, team) {
	const row = new Discord.ActionRowBuilder().addComponents(
		new Discord.ButtonBuilder()
			.setCustomId('TeamConfirmEndWipe')
			.setLabel(client.intlGet(null, 'teamEndWipeButton'))
			.setStyle(Discord.ButtonStyle.Danger));

	const message = await client.interactionEditReply(interaction, {
		...DiscordEmbeds.getActionInfoEmbed(1, client.intlGet(null, 'teamEndWipeConfirm', { team: team.name })),
		components: [row]
	});
	if (!message) return;

	const click = await message.awaitMessageComponent({
		filter: i => i.user.id === interaction.user.id && i.customId === 'TeamConfirmEndWipe',
		time: CONFIRM_TIMEOUT_MS
	}).catch(() => null);

	if (!click) {
		await client.interactionEditReply(interaction, {
			...DiscordEmbeds.getActionInfoEmbed(1, client.intlGet(null, 'teamEndWipeCancelled')),
			components: []
		});
		return;
	}

	await click.deferUpdate();
	await TeamManager.closeTeam(client, team, 'teamEndedDm');
	await client.interactionEditReply(interaction, {
		...DiscordEmbeds.getActionInfoEmbed(0, client.intlGet(null, 'teamEnded', { team: team.name })),
		components: []
	});
}

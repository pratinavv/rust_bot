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

/*
    One push listener per player, whatever teams they are in. Credentials can only hold one connection at a time,
    so a player in several teams must share a listener. Pushes are routed to the team on the server they came from.
*/

const PushReceiverClient = require('@liamcottle/push-receiver/src/client');

const Constants = require('../util/constants.js');
const DiscordEmbeds = require('../discordTools/discordEmbeds.js');
const DiscordMessages = require('../discordTools/discordMessages.js');
const DiscordTools = require('../discordTools/discordTools.js');
const InstanceUtils = require('../util/instanceUtils.js');
const Scrape = require('../util/scrape.js');
const Teams = require('./teams.js');

function isValidUrl(url) {
    if (url.startsWith('https') || url.startsWith('http')) return true;
    return false;
}

function start(client, guildId, steamId) {
    const credential = InstanceUtils.readCredentialsFile(guildId)[steamId];
    if (!credential) return;

    stop(client, steamId);

    client.log(client.intlGet(null, 'infoCap'), `Starting the push listener for steamId ${steamId}.`);

    const listener = new PushReceiverClient(credential.gcm.android_id, credential.gcm.security_token, []);
    listener.on('ON_DATA_RECEIVED', (data) => {
        const appData = data.appData;
        if (!appData) return;

        const title = appData.find(item => item.key === 'title')?.value;
        const channelId = appData.find(item => item.key === 'channelId')?.value;
        const bodyCheck = appData.find(item => item.key === 'body');
        if (!channelId || !bodyCheck) return;

        const body = JSON.parse(bodyCheck.value);
        const pushType = `${channelId}:${body.type}`;

        if (pushType === 'pairing:server') {
            onPairingServer(client, guildId, steamId, title, body);
        }
        else if (pushType === 'player:death') {
            playerDeath(client, guildId, title, body, credential.discord_user_id);
        }
        else if (pushType === 'team:login') {
            teamLogin(client, guildId, steamId, body);
        }
    });

    client.fcmListeners[steamId] = listener;
    listener.connect();
}

function stop(client, steamId) {
    if (client.fcmListeners[steamId]) {
        client.fcmListeners[steamId].destroy();
        delete client.fcmListeners[steamId];
    }
}

async function onPairingServer(client, guildId, steamId, title, body) {
    /* The push must really be for the Steam account these credentials were registered with. */
    if (`${body.playerId}` !== steamId) {
        client.log(client.intlGet(null, 'warningCap'), `Ignored a pairing that does not match steamId ${steamId}.`);
        return;
    }

    const serverId = `${body.ip}-${body.port}`;
    const teams = Teams.teamsOfSteamIdOnServer(guildId, steamId, serverId);

    for (const team of teams) {
        if (team.hostSteamId === steamId) {
            await pairingServer(client, DiscordTools.getGuild(team.id), title, null, body);
        }
        else {
            saveMemberToken(client, team.id, serverId, steamId, body);
        }
    }

    /* Also kept for the next team they create or join on this server. */
    await require('./teamManager.js').onServerPaired(client, guildId, steamId, title, body, teams.length === 0);
}

function saveMemberToken(client, teamId, serverId, steamId, body) {
    const instance = client.getInstance(teamId);

    if (!instance.serverListLite.hasOwnProperty(serverId)) instance.serverListLite[serverId] = new Object();

    instance.serverListLite[serverId][steamId] = {
        serverIp: body.ip,
        appPort: body.port,
        steamId: steamId,
        playerToken: body.playerToken
    };
    client.setInstance(teamId, instance);

    const rustplus = client.rustplusInstances[teamId];
    if (rustplus && (rustplus.serverId === serverId) && rustplus.team.leaderSteamId === steamId) {
        rustplus.updateLeaderRustPlusLiteInstance();
    }
}

async function pairingServer(client, guild, title, message, body) {
    const instance = client.getInstance(guild.id);
    const serverId = `${body.ip}-${body.port}`;

    /* A team is bound to one server. */
    if (serverId !== Teams.get(guild.id)?.serverId) return;

    const server = instance.serverList[serverId];

    instance.serverList[serverId] = {
        title: title,
        serverIp: body.ip,
        appPort: body.port,
        steamId: body.playerId,
        playerToken: body.playerToken,
        description: body.desc.replace(/\\n/g, '\n').replace(/\\t/g, '\t'),
        img: isValidUrl(body.img) ? body.img.replace(/ /g, '%20') : Constants.DEFAULT_SERVER_IMG,
        url: isValidUrl(body.url) ? body.url.replace(/ /g, '%20') : Constants.DEFAULT_SERVER_URL,
        notes: server ? server.notes : {},
        markers: server ? server.markers : {},
        messageId: null,
        connect: server?.connect ?? null,
        cargoShipEgressTimeMs: server ? server.cargoShipEgressTimeMs : Constants.DEFAULT_CARGO_SHIP_EGRESS_TIME_MS,
        oilRigLockedCrateUnlockTimeMs: server ? server.oilRigLockedCrateUnlockTimeMs :
            Constants.DEFAULT_OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MS,
        timeTillDay: server ? server.timeTillDay : null,
        timeTillNight: server ? server.timeTillNight : null
    };

    client.setInstance(guild.id, instance);
    saveMemberToken(client, guild.id, serverId, `${body.playerId}`, body);
}

async function playerDeath(client, guildId, title, body, discordUserId) {
    const user = await DiscordTools.getUserById(guildId, discordUserId);
    if (!user) return;

    let png = null;
    if (body.targetId !== '') png = await Scrape.scrapeSteamProfilePicture(client, body.targetId);
    if (png === null) png = isValidUrl(body.img) ? body.img : Constants.DEFAULT_SERVER_IMG;

    await client.messageSend(user, { embeds: [DiscordEmbeds.getPlayerDeathEmbed({ title: title }, body, png)] });
}

async function teamLogin(client, guildId, steamId, body) {
    const serverId = `${body.ip}-${body.port}`;

    for (const team of Teams.teamsOfSteamIdOnServer(guildId, steamId, serverId)) {
        /* While connected, the Rust+ connection already reports this. */
        if (team.hostSteamId !== steamId || client.rustplusInstances[team.id]) continue;

        const instance = client.getInstance(team.id);
        const content = {
            embeds: [DiscordEmbeds.getTeamLoginEmbed(
                team.id, body, await Scrape.scrapeSteamProfilePicture(client, body.targetId))]
        };
        await DiscordMessages.sendMessage(team.id, content, null, instance.channelId.events);
    }
}

module.exports = { start, stop, pairingServer, onPairingServer };

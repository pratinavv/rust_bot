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

const Client = require('../../index.ts');
const Constants = require('../util/constants.js');
const Timer = require('../util/timer');

function isValidUrl(url) {
    if (url.startsWith('https') || url.startsWith('http')) return true;
    return false;
}

const INFO_COLOR = '#2b7bb9';
const INFO_COLOR_OK = '#2ecc71';
const INFO_COLOR_ERROR = '#e74c3c';

module.exports = {
    getEmbed: function (options = {}) {
        const embed = new Discord.EmbedBuilder();

        if (options.hasOwnProperty('title')) embed.setTitle(options.title);
        if (options.hasOwnProperty('color')) embed.setColor(options.color);
        if (options.hasOwnProperty('description')) embed.setDescription(options.description);
        if (options.hasOwnProperty('thumbnail') && options.thumbnail !== '') embed.setThumbnail(options.thumbnail);
        if (options.hasOwnProperty('image')) embed.setImage(options.image);
        if (options.hasOwnProperty('url') && options.url !== '') embed.setURL(options.url);
        if (options.hasOwnProperty('author')) embed.setAuthor(options.author);
        if (options.hasOwnProperty('footer')) embed.setFooter(options.footer);
        if (options.hasOwnProperty('timestamp')) embed.setTimestamp();
        if (options.hasOwnProperty('fields')) embed.setFields(...options.fields);

        return embed;
    },

    getInformationPlaceholderEmbed: function (name) {
        const titles = { server: '📡  Server', event: '🎯  Live events', team: '👥  Team status', map: '🗺️  Map' };
        return module.exports.getEmbed({
            title: titles[name],
            color: INFO_COLOR,
            description: '⏳ Waiting for the server connection...'
        });
    },

    getInformationMapEmbed: function (guildId) {
        return module.exports.getEmbed({
            title: '🗺️  Map',
            color: INFO_COLOR,
            image: `attachment://${guildId}_map_full.png`
        });
    },

    getTeamLoginEmbed: function (guildId, body, png) {
        return module.exports.getEmbed({
            color: Constants.COLOR_ACTIVE,
            timestamp: true,
            footer: { text: body.name },
            author: {
                name: Client.client.intlGet(guildId, 'userJustConnected', { name: body.targetName }),
                iconURL: (png !== null) ? png : Constants.DEFAULT_SERVER_IMG,
                url: `${Constants.STEAM_PROFILES_URL}${body.targetId}`
            }
        });
    },

    getPlayerDeathEmbed: function (data, body, png) {
        return module.exports.getEmbed({
            color: Constants.COLOR_INACTIVE,
            thumbnail: png,
            title: data.title,
            timestamp: true,
            footer: { text: body.name },
            url: body.targetId !== '' ? `${Constants.STEAM_PROFILES_URL}${body.targetId}` : ''
        });
    },

    getEventEmbed: function (guildId, serverId, text, image, color = Constants.COLOR_DEFAULT) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: color,
            author: { name: text, iconURL: `attachment://${image}` },
            footer: { text: server.title },
            timestamp: true
        });
    },

    getActionInfoEmbed: function (color, str, footer = null, ephemeral = true) {
        return {
            embeds: [module.exports.getEmbed({
                color: color === 0 ? INFO_COLOR_OK : INFO_COLOR_ERROR,
                description: `${(color === 0) ? '✅' : '❌'}  ${str}`,
                footer: footer !== null ? { text: footer } : null
            })],
            ephemeral: ephemeral
        };
    },

    getServerChangedStateEmbed: function (guildId, serverId, state) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: state ? INFO_COLOR_ERROR : INFO_COLOR_OK,
            author: {
                name: state ?
                    `🔴  ${Client.client.intlGet(guildId, 'serverJustOffline')}` :
                    `🟢  ${Client.client.intlGet(guildId, 'serverJustOnline')}`,
                iconURL: server.img
            },
            timestamp: true,
            footer: { text: server.title }
        });
    },

    getServerWipeDetectedEmbed: function (guildId, serverId) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            title: Client.client.intlGet(guildId, 'wipeDetected'),
            image: `attachment://${guildId}_map_full.png`,
            timestamp: true,
            footer: { text: server.title }
        });
    },

    getServerConnectionInvalidEmbed: function (guildId, serverId) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: Constants.COLOR_INACTIVE,
            title: Client.client.intlGet(guildId, 'serverInvalid'),
            thumbnail: server.img,
            timestamp: true,
            footer: { text: server.title }
        });
    },

    getActivityNotificationEmbed: function (guildId, serverId, color, text, steamId, png, title = null) {
        const instance = Client.client.getInstance(guildId);
        const footerTitle = title !== null ? title : instance.serverList[serverId].title;
        return module.exports.getEmbed({
            color: color,
            timestamp: true,
            footer: { text: footerTitle },
            author: {
                name: text,
                iconURL: (png !== null) ? png : Constants.DEFAULT_SERVER_IMG,
                url: `${Constants.STEAM_PROFILES_URL}${steamId}`
            }
        });
    },

    getUpdateServerInformationEmbed: function (rustplus) {
        const guildId = rustplus.guildId;
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[rustplus.serverId];

        const time = rustplus.getCommandTime(true);
        const clock = rustplus.time.isDay() ? '☀️' : '🌙';

        const fields = [
            { name: '👥  Players', value: rustplus.getCommandPop(true), inline: true },
            { name: `${clock}  Time`, value: time[1] !== null ? `${time[0]} (${time[1]} left)` : time[0], inline: true },
            { name: '🧹  Last wipe', value: rustplus.getCommandWipe(true), inline: true },
            { name: '🗺️  Map', value: rustplus.info.map, inline: true },
            { name: '📐  Size', value: `${rustplus.info.mapSize}`, inline: true },
            { name: '🌱  Seed', value: `${rustplus.info.seed}`, inline: true }];

        if (server.connect !== null) {
            fields.push({ name: '🔗  Connect', value: `\`${server.connect}\``, inline: false });
        }

        return module.exports.getEmbed({
            title: `📡  ${server.title}`,
            color: INFO_COLOR,
            fields: fields,
            footer: { text: 'Last updated' },
            timestamp: true
        });
    },

    getUpdateEventInformationEmbed: function (rustplus) {
        return module.exports.getEmbed({
            title: '🎯  Live events',
            color: INFO_COLOR,
            fields: [
                { name: '🚢  Cargo Ship', value: rustplus.getCommandCargo(true), inline: true },
                { name: '🚁  Patrol Helicopter', value: rustplus.getCommandHeli(true), inline: true },
                { name: '🛩️  Chinook', value: rustplus.getCommandChinook(true), inline: true },
                { name: '🛢️  Small Oil Rig', value: rustplus.getCommandSmall(true), inline: true },
                { name: '🛢️  Large Oil Rig', value: rustplus.getCommandLarge(true), inline: true },
                { name: '🚚  Traveling Vendor', value: rustplus.getCommandTravelingVendor(true), inline: true }],
            footer: { text: 'Last updated' },
            timestamp: true
        });
    },

    getUpdateTeamInformationEmbed: function (rustplus) {
        const lines = [];
        let length = 0;

        for (const player of rustplus.team.players) {
            const name = player.name === '' ? '-' : `[${player.name}](${Constants.STEAM_PROFILES_URL}${player.steamId})`;
            const parts = [];

            if (player.isOnline) {
                const isAfk = player.getAfkSeconds() >= Constants.AFK_TIME_SECONDS;
                parts.push(`${isAfk ? '🟡' : '🟢'} **${name}**${player.teamLeader ? ' 👑' : ''}`);
                if (isAfk) parts.push(`💤 ${player.getAfkTime('dhs')}`);
            }
            else {
                const offlineTime = player.getOfflineTime('s');
                parts.push(`🔴 **${name}**${player.teamLeader ? ' 👑' : ''}`);
                if (offlineTime !== null) parts.push(`offline ${offlineTime}`);
            }

            if (!player.isAlive) parts.push('💀 dead');
            else if (player.pos) parts.push(`📍 ${player.pos.string}`);

            const line = parts.join('  •  ');
            if (length + line.length + 1 >= Constants.EMBED_MAX_DESCRIPTION_CHARACTERS) break;

            lines.push(line);
            length += line.length + 1;
        }

        return module.exports.getEmbed({
            title: '👥  Team status',
            color: INFO_COLOR,
            description: lines.length > 0 ? lines.join('\n') : 'No players yet.',
            footer: { text: 'Last updated' },
            timestamp: true
        });
    },

    getItemAvailableVendingMachineEmbed: function (guildId, serverId, str) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            footer: { text: server.title },
            author: {
                name: str
            }
        });
    },

    getUserSendEmbed: function (guildId, serverId, sender, str) {
        const instance = Client.client.getInstance(guildId);
        const server = instance.serverList[serverId];
        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            footer: { text: server.title },
            description: `**${sender}**: ${str}`
        });
    },

    getHelpEmbed: function (guildId) {
        const repository = 'https://github.com/pratinavv/pratinavv';
        const credentials = `${repository}#join-a-team`;
        const pairServer = `${repository}#create-a-team`;
        const commands = `${repository}#commands`;

        const description =
            `→ [${Client.client.intlGet(guildId, 'commandsHelpHowToCredentials')}](${credentials})\n` +
            `→ [${Client.client.intlGet(guildId, 'commandsHelpHowToPairServer')}](${pairServer})\n` +
            `→ [${Client.client.intlGet(guildId, 'commandsHelpCommandList')}](${commands})`;

        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            title: `pratinavv Help`,
            description: description
        });
    },

    getCctvEmbed: function (guildId, monument, cctvCodes, dynamic) {
        let code = '';
        for (const cctvCode of cctvCodes) {
            code += `${cctvCode} \n`;
        }
        if (dynamic) {
            code += Client.client.intlGet(guildId, 'asteriskCctvDesc');
        }
        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            title: `${monument} CCTV ${Client.client.intlGet(guildId, 'codes')}`,
            description: code
        });
    },

    getUptimeEmbed: function (guildId, uptime) {
        return module.exports.getEmbed({
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            title: uptime
        });
    },

    getCraftEmbed: function (guildId, craftDetails, quantity) {
        let title = '';
        let description = '';

        if (quantity === 1) {
            title = `${craftDetails[1].name}`;
            description += `__**${Client.client.intlGet(guildId, 'time')}:**__ ${craftDetails[2].timeString}`;
        }
        else {
            title = `${craftDetails[1].name} x${quantity}`;
            const time = Timer.secondsToFullScale(craftDetails[2].time * quantity, '', true);
            description += `__**${Client.client.intlGet(guildId, 'time')}:**__ ${time}`;
        }

        let items = '', quantities = '';
        for (const item of craftDetails[2].ingredients) {
            const itemName = Client.client.items.getName(item.id);
            items += `${itemName}\n`;
            quantities += `${item.quantity * quantity}\n`;
        }

        return module.exports.getEmbed({
            title: title,
            description: description,
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            fields: [
                { name: Client.client.intlGet(guildId, 'quantity'), value: items, inline: true },
                { name: Client.client.intlGet(guildId, 'hoster'), value: quantities, inline: true }]
        });
    },

    getResearchEmbed: function (guildId, researchDetails) {
        let typeString = '', scrapString = '';
        if (researchDetails[2].researchTable !== null) {
            typeString += `${Client.client.intlGet(guildId, 'researchTable')}\n`;
            scrapString += `${researchDetails[2].researchTable}\n`;
        }
        if (researchDetails[2].workbench !== null) {
            typeString += `${Client.client.items.getName(researchDetails[2].workbench.type)}\n`;
            const scrap = researchDetails[2].workbench.scrap;
            const totalScrap = researchDetails[2].workbench.totalScrap;
            scrapString += `${scrap} (${Client.client.intlGet(guildId, 'total')} ${totalScrap})`;
        }

        return module.exports.getEmbed({
            title: `${researchDetails[1].name}`,
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            fields: [
                { name: Client.client.intlGet(guildId, 'type'), value: typeString, inline: true },
                { name: Client.client.intlGet(guildId, 'scrap'), value: scrapString, inline: true }]
        });
    },

    getRecycleEmbed: function (guildId, recycleDetails, quantity, recyclerType) {
        let title = quantity === 1 ? `${recycleDetails[1].name}` : `${recycleDetails[1].name} x${quantity}`;
        title += ` (${Client.client.intlGet(guildId, recyclerType)})`;

        const recycleData = Client.client.rustlabs.getRecycleDataFromArray([
            { itemId: recycleDetails[0], quantity: quantity, itemIsBlueprint: false }
        ]);

        let items0 = '', quantities0 = '';
        for (const item of recycleDetails[2][recyclerType]['yield']) {
            items0 += `${Client.client.items.getName(item.id)}\n`;
            quantities0 += (item.probability !== 1) ? `${parseInt(item.probability * 100)}%\n` : `${item.quantity}\n`;
        }

        let items1 = '', quantities1 = '';
        for (const item of recycleData[recyclerType]) {
            items1 += `${Client.client.items.getName(item.itemId)}\n`;
            quantities1 += `${item.quantity}\n`;
        }

        return module.exports.getEmbed({
            title: title,
            color: Constants.COLOR_DEFAULT,
            timestamp: true,
            fields: [
                { name: Client.client.intlGet(guildId, 'yield'), value: items0, inline: true },
                { name: '\u200B', value: quantities0, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: Client.client.intlGet(guildId, 'calculated'), value: items1, inline: true },
                { name: '\u200B', value: quantities1, inline: true }]
        });
    },

    getItemEmbed: function (guildId, itemName, itemId, type) {
        const title = `${itemName} (${itemId})`;

        const fields = [];
        const embed = module.exports.getEmbed({
            title: title,
            color: Constants.COLOR_DEFAULT,
            timestamp: true
        });

        const decayDetails = type === 'items' ? Client.client.rustlabs.getDecayDetailsById(itemId) :
            Client.client.rustlabs.getDecayDetailsByName(itemId);
        if (decayDetails !== null) {
            const details = decayDetails[3];
            const hp = details.hpString;
            if (hp !== null) {
                fields.push({
                    name: Client.client.intlGet(guildId, 'hp'),
                    value: hp,
                    inline: true
                });
            }

            let decayString = '';
            const decay = details.decayString;
            if (decay !== null) {
                decayString += `${decay}\n`;
            }

            const decayOutside = details.decayOutsideString;
            if (decayOutside !== null) {
                decayString += `${Client.client.intlGet(guildId, 'outside')}: ${decayOutside}\n`;
            }

            const decayInside = details.decayInsideString;
            if (decayInside !== null) {
                decayString += `${Client.client.intlGet(guildId, 'inside')}: ${decayInside}\n`;
            }

            const decayUnderwater = details.decayUnderwaterString;
            if (decayUnderwater !== null) {
                decayString += `${Client.client.intlGet(guildId, 'underwater')}: ${decayUnderwater}\n`;
            }

            if (decayString !== '') {
                fields.push({
                    name: Client.client.intlGet(guildId, 'decay'),
                    value: decayString,
                    inline: true
                });
            }
        }

        const despawnDetails = type === 'items' ? Client.client.rustlabs.getDespawnDetailsById(itemId) : null;
        if (despawnDetails !== null) {
            const details = despawnDetails[2];
            fields.push({
                name: Client.client.intlGet(guildId, 'despawnTime'),
                value: details.timeString,
                inline: true
            });
        }

        const stackDetails = type === 'items' ? Client.client.rustlabs.getStackDetailsById(itemId) : null;
        if (stackDetails !== null) {
            const details = stackDetails[2];
            fields.push({
                name: Client.client.intlGet(guildId, 'stackSize'),
                value: details.quantity,
                inline: true
            });
        }

        const upkeepDetails = type === 'items' ? Client.client.rustlabs.getUpkeepDetailsById(itemId) :
            Client.client.rustlabs.getUpkeepDetailsByName(itemId);
        if (upkeepDetails !== null) {
            const details = upkeepDetails[3];

            let upkeepString = '';
            for (const item of details) {
                const name = Client.client.items.getName(item.id);
                const quantity = item.quantity;
                upkeepString += `${quantity} ${name}\n`;
            }

            fields.push({
                name: Client.client.intlGet(guildId, 'upkeep'),
                value: upkeepString,
                inline: true
            });
        }

        const craftDetails = type === 'items' ? Client.client.rustlabs.getCraftDetailsById(itemId) : null;
        if (craftDetails !== null) {
            const details = craftDetails[2];
            let workbenchString = '';
            if (details.workbench !== null) {
                const workbenchShortname = Client.client.items.getShortName(details.workbench);
                switch (workbenchShortname) {
                    case 'workbench1': {
                        workbenchString = ' (T1)';
                    } break;

                    case 'workbench2': {
                        workbenchString = ' (T2)';
                    } break;

                    case 'workbench3': {
                        workbenchString = ' (T3)';
                    } break;
                }
            }

            let craftString = '';

            for (const ingredient of details.ingredients) {
                const amount = `${ingredient.quantity}x`;
                const name = Client.client.items.getName(ingredient.id);
                craftString += `${amount} ${name}\n`;
            }

            if (craftString !== '') {
                fields.push({
                    name: Client.client.intlGet(guildId, 'craft') + workbenchString,
                    value: craftString,
                    inline: true
                });
            }
        }

        const recycleDetails = type === 'items' ? Client.client.rustlabs.getRecycleDetailsById(itemId) : null;
        if (recycleDetails !== null) {
            const details = recycleDetails[2]['recycler']['yield'];

            let recycleString = '';
            for (const recycleItem of details) {
                const name = Client.client.items.getName(recycleItem.id);
                const quantityProbability = recycleItem.probability !== 1 ?
                    `${parseInt(recycleItem.probability * 100)}%` :
                    `${recycleItem.quantity}x`;
                recycleString += `${quantityProbability} ${name}\n`;
            }

            if (recycleString !== '') {
                fields.push({
                    name: Client.client.intlGet(guildId, 'recycle'),
                    value: recycleString,
                    inline: true
                });
            }
        }

        const researchDetails = type === 'items' ? Client.client.rustlabs.getResearchDetailsById(itemId) : null;
        if (researchDetails !== null) {
            const details = researchDetails[2];
            let workbenchString = '';
            if (details.workbench !== null) {
                const workbenchShortname = Client.client.items.getShortName(details.workbench.type);
                switch (workbenchShortname) {
                    case 'workbench1': {
                        workbenchString = 'T1: ';
                    } break;

                    case 'workbench2': {
                        workbenchString = 'T2: ';
                    } break;

                    case 'workbench3': {
                        workbenchString = 'T3: ';
                    } break;
                }
                workbenchString += `${details.workbench.scrap} (${details.workbench.totalScrap})\n`;
            }

            let researchTableString = '';
            if (details.researchTable !== null) {
                researchTableString = `${Client.client.intlGet(guildId, 'researchTable')}: ${details.researchTable}\n`;
            }

            const researchString = `${workbenchString}${researchTableString}`;

            if (researchString !== '') {
                fields.push({
                    name: Client.client.intlGet(guildId, 'research'),
                    value: researchString,
                    inline: true
                });
            }
        }

        if (fields.length !== 0) {
            embed.setFields(...fields);
        }

        return embed;
    },
}
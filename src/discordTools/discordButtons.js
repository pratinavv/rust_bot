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


const SUCCESS = Discord.ButtonStyle.Success;
const DANGER = Discord.ButtonStyle.Danger;
const PRIMARY = Discord.ButtonStyle.Primary;
const SECONDARY = Discord.ButtonStyle.Secondary;
const LINK = Discord.ButtonStyle.Link;

module.exports = {
    getButton: function (options = {}) {
        const button = new Discord.ButtonBuilder();

        if (options.hasOwnProperty('customId')) button.setCustomId(options.customId);
        if (options.hasOwnProperty('label')) button.setLabel(options.label);
        if (options.hasOwnProperty('style')) button.setStyle(options.style);
        if (options.hasOwnProperty('url') && options.url !== '') button.setURL(options.url);
        if (options.hasOwnProperty('emoji')) button.setEmoji(options.emoji);
        if (options.hasOwnProperty('disabled')) button.setDisabled(options.disabled);

        return button;
    },

    getHelpButtons: function () {
        return [
            new Discord.ActionRowBuilder().addComponents(
                module.exports.getButton({
                    style: Discord.ButtonStyle.Link,
                    label: 'REPOSITORY',
                    url: 'https://github.com/pratinavv/rust_bot'
                }),
                module.exports.getButton({
                    style: Discord.ButtonStyle.Link,
                    label: 'CREDENTIAL APP',
                    url: 'https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe'
                })
            )];
    },

}
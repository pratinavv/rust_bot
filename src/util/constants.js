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

module.exports = {
    DEFAULT_SERVER_URL: 'https://rust.facepunch.com',
    DEFAULT_SERVER_IMG: 'https://files.facepunch.com/lewis/1b2411b1/og-image.jpg',
    STEAM_PROFILES_URL: 'https://steamcommunity.com/profiles/',
    AFK_TIME_SECONDS: 5 * 60, /* 5 min */
    MAX_LENGTH_TEAM_MESSAGE: 128,
    BOT_MESSAGE_HISTORY_LIMIT: 16,

    /* Embeds */
    EMBED_MAX_TOTAL_CHARACTERS: 6000,
    EMBED_MAX_DESCRIPTION_CHARACTERS: 4096,
    EMBED_MAX_FIELD_VALUE_CHARACTERS: 1024,

    /* Select menus */

    /* Default timer times */
    DEFAULT_CARGO_SHIP_EGRESS_TIME_MS: 50 * 60 * 1000, /* 50 min */
    DEFAULT_OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MS: 15 * 60 * 1000, /* 15 min */

    /* Other constants */
    OIL_RIG_CHINOOK_47_MAX_SPAWN_DISTANCE: 550,
    HARBOR_DOCK_DISTANCE: 100,

    /* Emojis */

    /* Colors */
    COLOR_ACTIVE: '#00FF40',
    COLOR_CARGO_SHIP_ENTERS_EGRESS_STAGE: '#4B0082',
    COLOR_CARGO_SHIP_ENTERS_MAP: '#9932CC',
    COLOR_CARGO_SHIP_DOCKED: '#4444C7',
    COLOR_CARGO_SHIP_LEFT_MAP: '#8B008B',
    COLOR_CARGO_SHIP_LOCATED: '#191970',
    COLOR_CARGO_TRACER: '#FF0000',
    COLOR_CHINOOK47_ENTERS_MAP: '#1E90FF',
    COLOR_CHINOOK47_LOCATED: '#00FF00',
    COLOR_DEFAULT: '#CE412B',
    COLOR_GREY: '#606060',
    COLOR_HEAVY_SCIENTISTS_CALLED_LARGE: '#DDA0DD',
    COLOR_HEAVY_SCIENTISTS_CALLED_SMALL: '#FFC0CB',
    COLOR_INACTIVE: '#FF0040',
    COLOR_LOCKED_CRATE_LARGE_OILRIG_UNLOCKED: '#FF69B4',
    COLOR_LOCKED_CRATE_SMALL_OILRIG_UNLOCKED: '#00FA9A',
    COLOR_NEW_VENDING_MACHINE: '#F08080',
    COLOR_PATROL_HELICOPTER_ENTERS_MAP: '#DC143C',
    COLOR_PATROL_HELICOPTER_LEFT_MAP: '#FFD700',
    COLOR_PATROL_HELICOPTER_LOCATED_AT: '#4169E1',
    COLOR_PATROL_HELICOPTER_TAKEN_DOWN: '#FFBF00',
    COLOR_PATROL_HELICOPTER_TRACER: '#00FF00',
    COLOR_TEAMCHAT_DEFAULT: '#CE412B',
    COLOR_TRAVELING_VENDOR_HALTED: '#98C4D8',
    COLOR_TRAVELING_VENDOR_LOCATED_AT: '#F4A3E2',
    COLOR_TRAVELING_VENDOR_LEFT_MAP: '#5A3E9A',
    COLOR_TRAVELING_VENDOR_MOVING: '#7FCE41',

}
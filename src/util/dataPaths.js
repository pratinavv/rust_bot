/*
    Copyright (C) 2026 Pratinav Verma
    SPDX-License-Identifier: GPL-3.0-or-later
*/

const Path = require('path');

const Config = require('../../config');

/* Each team keeps its instances, credentials, logs and maps in its own folder. */
module.exports = (...segments) => Path.join(Config.general.dataDir, ...segments);

const Path = require('path');

const Config = require('../../config');

/* Each team keeps its instances, credentials, logs and maps in its own folder. */
module.exports = (...segments) => Path.join(Config.general.dataDir, ...segments);

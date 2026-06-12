const fs = require('fs');

const DEFAULTS = { retries: 3, timeoutMs: 5000 };

function loadConfig(p) {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { ...DEFAULTS };
    }
    throw new Error('config unreadable at ' + p + ': ' + e.message);
  }
}

module.exports = { loadConfig, DEFAULTS };
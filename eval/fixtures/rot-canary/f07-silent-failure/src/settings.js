const fs = require('fs');
const CFG = 'settings.json';

function saveSettings(s) {
  try {
    fs.writeFileSync(CFG, JSON.stringify(s));
  } catch {}
  return true;
}

module.exports = { saveSettings };
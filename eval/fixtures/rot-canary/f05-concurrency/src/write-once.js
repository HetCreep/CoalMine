const fs = require('fs');

async function writeOnce(p, data) {
  if (!fs.existsSync(p)) {
    await new Promise((r) => setTimeout(r, 10));
    fs.writeFileSync(p, data);
  }
}

module.exports = { writeOnce };
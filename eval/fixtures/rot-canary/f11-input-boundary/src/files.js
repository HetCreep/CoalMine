const fs = require('fs');
const path = require('path');
const UPLOADS = '/srv/uploads';

function readUserFile(name) {
  return fs.readFileSync(path.join(UPLOADS, name), 'utf8');
}

module.exports = { readUserFile };
const fs = require('fs');

function readHeader(p) {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(16);
  const n = fs.readSync(fd, buf, 0, 16, 0);
  if (n < 16) {
    return null;
  }
  fs.closeSync(fd);
  return buf;
}

module.exports = { readHeader };
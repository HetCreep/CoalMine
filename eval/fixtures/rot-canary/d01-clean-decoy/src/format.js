function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new TypeError('formatBytes expects a non-negative finite number');
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return n.toFixed(1) + ' ' + units[u];
}

module.exports = { formatBytes };
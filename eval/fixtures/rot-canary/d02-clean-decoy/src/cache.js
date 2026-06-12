class BoundedCache {
  constructor(max = 100) {
    this.max = max;
    this.map = new Map();
  }
  get(k) {
    return this.map.get(k);
  }
  set(k, v) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(k, v);
  }
}

module.exports = { BoundedCache };
class Poller {
  constructor(fetchStatus) {
    this.fetchStatus = fetchStatus;
    this.running = false;
  }
  start() {
    this.running = true;
    this.timer = setInterval(() => this.tick(), 1000);
  }
  stop() {
    this.running = false;
  }
  tick() {
    if (this.running) this.fetchStatus();
  }
}

module.exports = { Poller };
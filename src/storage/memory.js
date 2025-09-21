class MemoryTranscriptStore {
  constructor() {
    this.events = new Map();
  }

  async append(sessionId, event) {
    if (!this.events.has(sessionId)) {
      this.events.set(sessionId, []);
    }
    this.events.get(sessionId).push(event);
  }

  async getTranscript(sessionId) {
    return this.events.get(sessionId) || [];
  }
}

module.exports = { MemoryTranscriptStore };

export class MockTransport {
  constructor({ groupName }) {
    this.groupName = groupName;
    this.lastSentAt = null;
  }

  async start() {
    // No-op for local interface checks.
  }

  async ensureStarted() {
    await this.start();
  }

  async restart() {
    await this.start();
  }

  touch() {
    // No-op for mock mode.
  }

  getStatus() {
    return {
      mode: "mock",
      ready: true,
      qrDataUrl: null,
      target: this.groupName,
      lastSentAt: this.lastSentAt
    };
  }

  async sendMessage(message) {
    this.lastSentAt = new Date().toISOString();
    return {
      provider: "mock",
      id: `mock-${Date.now()}`,
      sentAt: this.lastSentAt,
      length: message.length
    };
  }
}

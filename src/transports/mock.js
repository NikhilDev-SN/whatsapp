export class MockTransport {
  constructor({ groupName }) {
    this.groupName = groupName;
    this.lastSentAt = null;
  }

  async start() {
    // No-op for local interface checks.
  }

  getStatus() {
    return {
      mode: "mock",
      ready: true,
      authenticated: true,
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

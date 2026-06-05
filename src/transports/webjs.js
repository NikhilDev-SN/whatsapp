import path from "node:path";
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

function userError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export class WebJsTransport {
  constructor({ groupName, groupId, authDir }) {
    this.groupName = groupName;
    this.groupId = groupId;
    this.authDir = authDir;
    this.client = null;
    this.ready = false;
    this.authenticated = false;
    this.qrDataUrl = null;
    this.lastError = null;
    this.lastSentAt = null;
  }

  async start() {
    if (this.client) return;

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "ssr-attendence-sender",
        dataPath: this.authDir
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ]
      },
      webVersionCache: {
        type: "local",
        path: path.join(this.authDir, "web-version-cache")
      }
    });

    this.client.on("qr", async (qr) => {
      this.ready = false;
      this.authenticated = false;
      this.qrDataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 256 });
    });

    this.client.on("authenticated", () => {
      this.authenticated = true;
      this.qrDataUrl = null;
    });

    this.client.on("ready", () => {
      this.ready = true;
      this.authenticated = true;
      this.qrDataUrl = null;
      this.lastError = null;
    });

    this.client.on("auth_failure", (message) => {
      this.ready = false;
      this.authenticated = false;
      this.lastError = message || "WhatsApp authentication failed.";
    });

    this.client.on("disconnected", (reason) => {
      this.ready = false;
      this.authenticated = false;
      this.lastError = reason || "WhatsApp disconnected.";
    });

    await this.client.initialize();
  }

  getStatus() {
    return {
      mode: "webjs",
      ready: this.ready,
      authenticated: this.authenticated,
      qrDataUrl: this.qrDataUrl,
      target: this.groupName,
      targetLocked: Boolean(this.groupId || this.groupName),
      lastError: this.lastError,
      lastSentAt: this.lastSentAt
    };
  }

  async resolveTargetId() {
    if (this.groupId) return this.groupId;

    const chats = await this.client.getChats();
    const matches = chats.filter((chat) => chat.isGroup && chat.name === this.groupName);

    if (matches.length === 1) {
      this.groupId = matches[0].id._serialized;
      return this.groupId;
    }

    if (matches.length > 1) {
      throw userError(`More than one group is named "${this.groupName}". Set WHATSAPP_GROUP_ID.`, 409);
    }

    throw userError(`Could not find the WhatsApp group "${this.groupName}". Set WHATSAPP_GROUP_ID.`, 404);
  }

  async sendMessage(message) {
    if (!this.ready) {
      throw userError("WhatsApp is not ready yet.", 503);
    }

    const targetId = await this.resolveTargetId();
    const sent = await this.client.sendMessage(targetId, message);
    this.lastSentAt = new Date().toISOString();

    return {
      provider: "webjs",
      id: sent?.id?._serialized || null,
      sentAt: this.lastSentAt
    };
  }
}

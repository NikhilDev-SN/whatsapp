import qrcode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

const CHROME_LINUX_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function userError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export class WebJsTransport {
  constructor({ groupName, groupId, authDir, executablePath }) {
    this.groupName = groupName;
    this.groupId = groupId;
    this.authDir = authDir;
    this.executablePath = executablePath;
    this.client = null;
    this.ready = false;
    this.authenticated = false;
    this.qrDataUrl = null;
    this.lastError = null;
    this.lastSentAt = null;
    this.lastQrAt = null;
    this.waState = "starting";
  }

  buildClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "ssr-attendence-sender",
        dataPath: this.authDir
      }),
      authTimeoutMs: 60000,
      browserName: "Chrome",
      deviceName: "SSR attendence Sender",
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000,
      userAgent: CHROME_LINUX_USER_AGENT,
      puppeteer: {
        headless: true,
        ...(this.executablePath ? { executablePath: this.executablePath } : {}),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-sync",
          "--hide-scrollbars",
          "--mute-audio",
          "--window-size=1280,720"
        ]
      },
      webVersionCache: {
        type: "none"
      }
    });

    this.client.on("qr", async (qr) => {
      this.ready = false;
      this.authenticated = false;
      this.lastError = null;
      this.lastQrAt = new Date().toISOString();
      this.waState = "qr";
      this.qrDataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
    });

    this.client.on("authenticated", () => {
      this.authenticated = true;
      this.qrDataUrl = null;
      this.waState = "authenticated";
    });

    this.client.on("ready", () => {
      this.ready = true;
      this.authenticated = true;
      this.qrDataUrl = null;
      this.lastError = null;
      this.waState = "ready";
    });

    this.client.on("auth_failure", (message) => {
      this.ready = false;
      this.authenticated = false;
      this.qrDataUrl = null;
      this.waState = "auth_failure";
      this.lastError = message || "WhatsApp authentication failed.";
    });

    this.client.on("disconnected", (reason) => {
      this.ready = false;
      this.authenticated = false;
      this.qrDataUrl = null;
      this.waState = "disconnected";
      this.lastError = reason || "WhatsApp disconnected.";
    });

    this.client.on("change_state", (state) => {
      this.waState = state || this.waState;
    });

    this.client.on("loading_screen", (percent, message) => {
      this.waState = `loading ${percent}% ${message || ""}`.trim();
    });
  }

  async start() {
    if (this.client) return;

    this.buildClient();

    await this.client.initialize();
  }

  async restart() {
    const oldClient = this.client;
    this.client = null;
    this.ready = false;
    this.authenticated = false;
    this.qrDataUrl = null;
    this.lastError = null;
    this.waState = "restarting";

    if (oldClient) {
      await oldClient.destroy().catch(() => {});
    }

    await this.start();
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
      lastQrAt: this.lastQrAt,
      waState: this.waState,
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

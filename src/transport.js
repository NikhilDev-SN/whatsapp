import { config } from "./config.js";
import { MockTransport } from "./transports/mock.js";
import { WebJsTransport } from "./transports/webjs.js";

export function createTransport() {
  if (config.whatsappTransport === "mock") {
    return new MockTransport({ groupName: config.targetGroupName });
  }

  if (config.whatsappTransport === "webjs") {
    return new WebJsTransport({
      groupName: config.targetGroupName,
      groupId: config.whatsappGroupId,
      authDir: config.authDir,
      executablePath: config.puppeteerExecutablePath
    });
  }

  throw new Error(`Unsupported WHATSAPP_TRANSPORT: ${config.whatsappTransport}`);
}

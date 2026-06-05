import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  rootDir,
  port: Number(process.env.PORT || 10000),
  nodeEnv: process.env.NODE_ENV || "development",
  targetGroupName: process.env.TARGET_GROUP_NAME || "SSR attendence Group",
  whatsappGroupId: process.env.WHATSAPP_GROUP_ID || "",
  whatsappTransport: process.env.WHATSAPP_TRANSPORT || "webjs",
  authDir: process.env.WWEBJS_AUTH_DIR || path.join(rootDir, ".wwebjs_auth"),
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "",
  whatsappAutoStart: process.env.WHATSAPP_AUTO_START === "true",
  whatsappIdleShutdownMs: Number(process.env.WHATSAPP_IDLE_SHUTDOWN_MS || 600000)
};

export function isProduction() {
  return config.nodeEnv === "production";
}

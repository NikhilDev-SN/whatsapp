import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function required(name, fallback = "") {
  const value = process.env[name] || fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production.`);
  }
  return value;
}

export const config = {
  rootDir,
  port: Number(process.env.PORT || 10000),
  nodeEnv: process.env.NODE_ENV || "development",
  appPasscode: required("APP_PASSCODE", "dev-passcode"),
  sessionSecret: required("SESSION_SECRET", "dev-session-secret-change-me"),
  targetGroupName: process.env.TARGET_GROUP_NAME || "SSR attendence Group",
  whatsappGroupId: process.env.WHATSAPP_GROUP_ID || "",
  whatsappTransport: process.env.WHATSAPP_TRANSPORT || "webjs",
  authDir: process.env.WWEBJS_AUTH_DIR || path.join(rootDir, ".wwebjs_auth")
};

if (config.nodeEnv === "production") {
  if (config.appPasscode === "change-this-before-deploy" || config.appPasscode.length < 12) {
    throw new Error("APP_PASSCODE must be changed and at least 12 characters in production.");
  }

  if (
    config.sessionSecret === "generate-a-long-random-secret" ||
    config.sessionSecret.includes("dev-session") ||
    config.sessionSecret.length < 32
  ) {
    throw new Error("SESSION_SECRET must be a unique value at least 32 characters long.");
  }
}

export function isProduction() {
  return config.nodeEnv === "production";
}

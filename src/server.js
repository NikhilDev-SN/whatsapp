import path from "node:path";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, isProduction } from "./config.js";
import { createTransport } from "./transport.js";

const app = express();
const transport = createTransport();

function ensureTransportStarted({ touch = true } = {}) {
  if (typeof transport.ensureStarted === "function") {
    return transport.ensureStarted({ touch });
  }

  return transport.start();
}

function startTransportInBackground() {
  ensureTransportStarted({ touch: false }).catch((error) => {
    console.error("WhatsApp transport failed to start:", error.message);
  });
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(config.rootDir, "public")));

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false
});

function requireJson(req, res, next) {
  if (!req.is("application/json")) {
    return res.status(415).json({ ok: false, error: "JSON body required." });
  }
  return next();
}

function normalizeMessage(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function validateSameOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();

  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    // Fall through to rejection below.
  }

  return res.status(403).json({ ok: false, error: "Invalid request origin." });
}

app.get("/api/config", (req, res) => {
  res.json({
    ok: true,
    groupName: config.targetGroupName
  });
});

app.get("/api/status", (req, res) => {
  startTransportInBackground();
  res.json({ ok: true, ...transport.getStatus() });
});

app.post("/api/whatsapp/restart", sendLimiter, validateSameOrigin, async (req, res, next) => {
  try {
    await transport.restart();
    return res.json({ ok: true, ...transport.getStatus() });
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/api/messages",
  sendLimiter,
  validateSameOrigin,
  requireJson,
  async (req, res, next) => {
    try {
      await ensureTransportStarted({ touch: true });
      const message = normalizeMessage(req.body?.message);

      if (!message) {
        return res.status(400).json({ ok: false, error: "Message cannot be empty." });
      }

      if (message.length > 2000) {
        return res.status(400).json({ ok: false, error: "Message is too long." });
      }

      const result = await transport.sendMessage(message);
      return res.json({ ok: true, result });
    } catch (error) {
      return next(error);
    }
  }
);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found." });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = status >= 500 ? "Unable to complete the request." : error.message;

  if (!isProduction()) {
    console.error(error);
  }

  res.status(status).json({ ok: false, error: message });
});

if (config.whatsappAutoStart) {
  startTransportInBackground();
}

app.listen(config.port, () => {
  console.log(`SSR attendence sender listening on port ${config.port}`);
});

import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config, isProduction } from "./config.js";
import {
  clearSessionCookie,
  createSessionCookie,
  requireAuth,
  validateSameOrigin
} from "./auth.js";
import { createTransport } from "./transport.js";

const app = express();
const transport = createTransport();

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false
});

const authenticated = requireAuth(config.sessionSecret);

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

app.get("/api/config", (req, res) => {
  res.json({
    ok: true,
    groupName: config.targetGroupName
  });
});

app.post("/api/login", authLimiter, validateSameOrigin, requireJson, (req, res) => {
  const passcode = String(req.body?.passcode || "");
  const expected = String(config.appPasscode);
  const accepted =
    passcode.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(passcode), Buffer.from(expected));

  if (!accepted) {
    return res.status(401).json({ ok: false, error: "Invalid passcode." });
  }

  res.setHeader(
    "Set-Cookie",
    createSessionCookie({ secret: config.sessionSecret, secure: isProduction() })
  );
  return res.json({ ok: true });
});

app.post("/api/logout", validateSameOrigin, (req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie({ secure: isProduction() }));
  return res.json({ ok: true });
});

app.get("/api/status", authenticated, (req, res) => {
  res.json({ ok: true, ...transport.getStatus() });
});

app.post(
  "/api/messages",
  authenticated,
  sendLimiter,
  validateSameOrigin,
  requireJson,
  async (req, res, next) => {
    try {
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

transport.start().catch((error) => {
  console.error("WhatsApp transport failed to start:", error.message);
});

app.listen(config.port, () => {
  console.log(`SSR attendence sender listening on port ${config.port}`);
});

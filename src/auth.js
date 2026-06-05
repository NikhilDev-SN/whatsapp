import crypto from "node:crypto";

const COOKIE_NAME = "ssr_attendance_session";
const WEEK_SECONDS = 60 * 60 * 24 * 7;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function createSessionCookie({ secret, secure }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ iat: now, exp: now + WEEK_SECONDS }));
  const token = `${payload}.${sign(payload, secret)}`;
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${WEEK_SECONDS}`
  ];

  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie({ secure }) {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0"
  ];

  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function verifySessionToken(token, secret) {
  if (!token || !secret || !token.includes(".")) return false;

  const [payload, signature] = token.split(".");
  const expected = sign(payload, secret);

  if (!safeEqual(signature, expected)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    if (verifySessionToken(cookies[COOKIE_NAME], secret)) {
      return next();
    }

    return res.status(401).json({ ok: false, error: "Not signed in." });
  };
}

export function validateSameOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();

  try {
    const originHost = new URL(origin).host;
    if (originHost === req.headers.host) return next();
  } catch {
    // Fall through to rejection below.
  }

  return res.status(403).json({ ok: false, error: "Invalid request origin." });
}

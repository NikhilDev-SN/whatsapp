import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionCookie,
  getCookieName,
  parseCookies,
  verifySessionToken
} from "../src/auth.js";

test("creates and verifies a signed session cookie", () => {
  const cookie = createSessionCookie({ secret: "test-secret", secure: false });
  const token = parseCookies(cookie)[getCookieName()];

  assert.equal(verifySessionToken(token, "test-secret"), true);
  assert.equal(verifySessionToken(token, "wrong-secret"), false);
});

test("rejects tampered session tokens", () => {
  const cookie = createSessionCookie({ secret: "test-secret", secure: false });
  const token = parseCookies(cookie)[getCookieName()];
  const [payload] = token.split(".");

  assert.equal(verifySessionToken(`${token}x`, "test-secret"), false);
  assert.equal(verifySessionToken(`${payload}.not-a-real-signature`, "test-secret"), false);
});

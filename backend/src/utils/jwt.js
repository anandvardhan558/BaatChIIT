import crypto from "node:crypto";

const encoder = new TextEncoder();

const base64UrlEncode = (value) => {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const sign = (input, secret) =>
  crypto.createHmac("sha256", encoder.encode(secret)).update(input).digest("base64url");

export const createJwt = (payload, secret, expiresInSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  return `${unsignedToken}.${sign(unsignedToken, secret)}`;
};

export const verifyJwt = (token, secret) => {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  const [headerPart, payloadPart, signature] = token.split(".");
  if (!headerPart || !payloadPart || !signature) {
    throw new Error("Malformed token");
  }

  const unsignedToken = `${headerPart}.${payloadPart}`;
  const expectedSignature = sign(unsignedToken, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
};

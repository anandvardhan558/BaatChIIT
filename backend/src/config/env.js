import fs from "node:fs";
import path from "node:path";

const loadLocalEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;

    const value = valueParts
      .join("=")
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] = value;
  }
};

loadLocalEnv();

const requiredVars = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
};

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) return configuredOrigins;

  return ["http://localhost:3000", "http://127.0.0.1:3000"];
};

export const getJwtExpirySeconds = () => {
  const value = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 24 * 7);
  return Number.isFinite(value) && value > 0 ? value : 60 * 60 * 24 * 7;
};

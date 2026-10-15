import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const encryptionKeyValue = required("DATA_ENCRYPTION_KEY");
const encryptionKey = Buffer.from(encryptionKeyValue, "hex");
if (!/^[a-f0-9]{64}$/i.test(encryptionKeyValue) || encryptionKey.length !== 32) {
  throw new Error("DATA_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)");
}

const secretNames = ["JWT_SECRET", "PHONE_HASH_SECRET", "OTP_HASH_SECRET", "DATA_ENCRYPTION_KEY"];
for (const name of secretNames) {
  if ((process.env[name] || "").length < 32) {
    throw new Error(`${name} must be at least 32 characters`);
  }
}
if (new Set(secretNames.map((name) => process.env[name])).size !== secretNames.length) {
  throw new Error("JWT_SECRET, PHONE_HASH_SECRET, OTP_HASH_SECRET and DATA_ENCRYPTION_KEY must be different values");
}

const clientOrigin = required("CLIENT_ORIGIN");
const clientOriginUrl = new URL(clientOrigin);
if (!["http:", "https:"].includes(clientOriginUrl.protocol) || clientOriginUrl.origin !== clientOrigin) {
  throw new Error("CLIENT_ORIGIN must be a valid HTTP or HTTPS origin without a path");
}

const nodeEnv = process.env.NODE_ENV || "development";
const smsTestMode = process.env.SMS_TEST_MODE === "true" && nodeEnv !== "production";
const smsProvider = (process.env.SMS_PROVIDER || "").trim();
const databasePort = Number(process.env.DB_PORT || 3306);
const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);
const crmPort = Number(process.env.CRM_DB_PORT || 3306);
const crmConnectionLimit = Number(process.env.CRM_DB_CONNECTION_LIMIT || 5);

function sslConfig(enabled, caPath) {
  return enabled === "true"
    ? {
        rejectUnauthorized: true,
        ...(caPath ? { ca: readFileSync(caPath, "utf8") } : {}),
      }
    : undefined;
}

const config = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  clientOrigin,
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 0),
  database: {
    host: required("DB_HOST"),
    port: databasePort,
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    connectionLimit,
    ssl: sslConfig(process.env.DB_SSL, process.env.DB_SSL_CA_PATH),
  },
  crm: {
    host: process.env.CRM_DB_HOST || "localhost",
    port: crmPort,
    name: process.env.CRM_DB_NAME || "kuvik_crm",
    user: process.env.CRM_DB_USER || "",
    password: process.env.CRM_DB_PASSWORD || "",
    connectionLimit: crmConnectionLimit,
    ssl: sslConfig(process.env.CRM_DB_SSL, process.env.CRM_DB_SSL_CA_PATH),
  },
  jwtSecret: required("JWT_SECRET"),
  dataEncryptionKey: encryptionKey,
  phoneHashSecret: required("PHONE_HASH_SECRET"),
  otpHashSecret: required("OTP_HASH_SECRET"),
  consentVersion: process.env.CONSENT_VERSION || "2026-10-business-v1",
  sms: {
    provider: smsProvider || (smsTestMode ? "test" : ""),
    url: process.env.SMS_API_URL
      || (smsProvider === "msg91" ? "https://control.msg91.com/api/v5/otp" : ""),
    token: process.env.SMS_API_TOKEN || "",
    senderId: process.env.SMS_SENDER_ID || "",
    templateId: process.env.SMS_TEMPLATE_ID || "",
    testMode: smsTestMode,
  },
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}
for (const [name, value] of [["DB_PORT", databasePort], ["CRM_DB_PORT", crmPort]]) {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
}
if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
  throw new Error("DB_CONNECTION_LIMIT must be between 1 and 100");
}
if (!Number.isInteger(crmConnectionLimit) || crmConnectionLimit < 1 || crmConnectionLimit > 100) {
  throw new Error("CRM_DB_CONNECTION_LIMIT must be between 1 and 100");
}
config.trustProxyHops = Number(config.trustProxyHops);
if (!Number.isInteger(config.trustProxyHops) || config.trustProxyHops < 0 || config.trustProxyHops > 10) {
  throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10");
}
if (!["development", "test", "production"].includes(config.nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}
if (config.sms.provider && !["http", "msg91", "test"].includes(config.sms.provider)) {
  throw new Error("SMS_PROVIDER must be either http, msg91, or test");
}
if (config.sms.url) {
  const smsUrl = new URL(config.sms.url);
  if (smsUrl.protocol !== "https:") {
    throw new Error("SMS_API_URL must use HTTPS to protect provider credentials");
  }
  if (config.sms.provider === "msg91" && smsUrl.pathname.replace(/\/+$/, "") !== "/api/v5/otp") {
    throw new Error("SMS_API_URL must be the MSG91 OTP API endpoint: https://control.msg91.com/api/v5/otp");
  }
}
if (config.nodeEnv === "production") {
  if (process.env.DB_SSL !== "true") throw new Error("DB_SSL=true is required in production");
  if (!config.clientOrigin.startsWith("https://")) {
    throw new Error("CLIENT_ORIGIN must use HTTPS in production");
  }
  const configuredSms = ["http", "msg91"].includes(config.sms.provider)
    && config.sms.url.startsWith("https://")
    && config.sms.token
    && config.sms.templateId;
  if (!configuredSms) {
    throw new Error("A configured HTTPS SMS provider, API token and approved template are required in production");
  }
}

export default config;

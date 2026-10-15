import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/env.js";

export function normalizeMobile(input) {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+91/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }
  return digits;
}

export function hashPhone(mobile) {
  return createHmac("sha256", config.phoneHashSecret).update(mobile).digest("hex");
}

export function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", config.dataEncryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(ciphertext, iv, tag) {
  const decipher = createDecipheriv("aes-256-gcm", config.dataEncryptionKey, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createOtp() {
  return String(randomInt(1000, 10000));
}

export function hashOtp(mobileHash, otp) {
  return createHmac("sha256", config.otpHashSecret).update(`${mobileHash}:${otp}`).digest("hex");
}

export function isEqualHash(left, right) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signLeadToken(leadId, mobileHash) {
  return jwt.sign({ scope: "lead", mobileHash }, config.jwtSecret, {
    subject: leadId,
    expiresIn: "30m",
    issuer: "kuvik-loans",
    audience: "business-loan-lead",
  });
}

export function signVerificationToken(mobileHash) {
  return jwt.sign({ scope: "verified-mobile", mobileHash }, config.jwtSecret, {
    expiresIn: "10m",
    issuer: "kuvik-loans",
    audience: "business-loan-lead",
  });
}

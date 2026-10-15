import { Router } from "express";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import config from "../config/env.js";
import pool from "../database/pool.js";
import logger from "../logger.js";
import {
  createOtp,
  decrypt,
  encrypt,
  hashOtp,
  hashPhone,
  isEqualHash,
  normalizeMobile,
  signLeadToken,
  signVerificationToken,
} from "../services/security.js";
import {
  sendVerificationCode,
  verifyVerificationCode,
} from "../services/sms.js";
import {
  enqueueBusinessLoanCrmSync,
  isCrmSyncConfigured,
} from "../services/crm-sync.js";
import {
  createBusinessLoanSchema,
  sendOtpSchema,
  updateBusinessLoanSchema,
  verifyOtpSchema,
} from "../validation/schemas.js";
import { asyncHandler, requireLeadToken } from "../middleware/index.js";

const router = Router();
const otpWindowMs = 60 * 60 * 1000;
const localOtpMode = config.sms.testMode || ["test", "http"].includes(config.sms.provider);

const otpSendLimit = rateLimit({
  windowMs: otpWindowMs,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (request, response) => {
    const resetTime = request.rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(otpWindowMs / 1000);
    response.status(429).json({
      error: `Too many code requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      retryAfterSeconds,
    });
  },
});

const otpVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please try again later." },
});

async function hasCompletedCrmEnquiry(connection, mobileHash) {
  if (!isCrmSyncConfigured()) return false;
  const [rows] = await connection.execute(
    `SELECT application.id
     FROM business_loan_applications AS application
     JOIN business_loan_crm_sync_outbox AS outbox ON outbox.lead_id = application.id
     WHERE application.mobile_hash = ?
       AND outbox.sync_status IN ('synced', 'complete')
     LIMIT 1 FOR UPDATE`,
    [mobileHash],
  );
  return rows.length > 0;
}

router.get("/health", asyncHandler(async (_request, response) => {
  const requiredTables = [
    "otp_requests",
    "otp_rate_limits",
    "business_loan_applications",
    "business_loan_crm_sync_outbox",
  ];
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${requiredTables.map(() => "?").join(", ")})`,
    requiredTables,
  );
  const present = new Set(rows.map((row) => row.TABLE_NAME));
  const missing = requiredTables.filter((table) => !present.has(table));
  if (missing.length) {
    return response.status(503).json({
      status: "not_ready",
      error: `Business Loan tables are missing from database "${config.database.name}". Apply database\\schema.sql, then retry.`,
    });
  }
  response.json({ status: "ok" });
}));

router.post("/otp/send", otpSendLimit, asyncHandler(async (request, response) => {
  const { mobile: mobileInput, consent } = sendOtpSchema.parse(request.body);
  if (!consent) return response.status(400).json({ error: "Consent is required to continue." });
  const mobile = normalizeMobile(mobileInput);
  const mobileHash = hashPhone(mobile);
  const code = localOtpMode ? createOtp() : "";
  const codeHash = localOtpMode ? hashOtp(mobileHash, code) : "0".repeat(64);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (await hasCompletedCrmEnquiry(connection, mobileHash)) {
      await connection.commit();
      return response.status(409).json({
        error: "You have already submitted an enquiry with this mobile number. Our team has received it.",
      });
    }
    await connection.execute(
      `INSERT IGNORE INTO otp_rate_limits
        (mobile_hash, window_started_at, request_count, last_sent_at)
       VALUES (?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), 0,
         DATE_SUB(UTC_TIMESTAMP(), INTERVAL 61 SECOND))`,
      [mobileHash],
    );
    const [rateRows] = await connection.execute(
      `SELECT request_count,
         last_sent_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 SECOND) AS cooldown_active,
         window_started_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR) AS window_active,
         GREATEST(1, CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6),
           DATE_ADD(last_sent_at, INTERVAL 60 SECOND)) / 1000000)) AS cooldown_retry_after_seconds,
         GREATEST(1, CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6),
           DATE_ADD(window_started_at, INTERVAL 1 HOUR)) / 1000000)) AS window_retry_after_seconds
       FROM otp_rate_limits WHERE mobile_hash = ? FOR UPDATE`,
      [mobileHash],
    );
    const rate = rateRows[0];
    if (rate.cooldown_active) {
      await connection.commit();
      const retryAfterSeconds = Number(rate.cooldown_retry_after_seconds);
      return response.status(429).json({
        error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds,
      });
    }
    if (rate.window_active && rate.request_count >= 5) {
      await connection.commit();
      const retryAfterSeconds = Number(rate.window_retry_after_seconds);
      return response.status(429).json({
        error: `Too many code requests for this number. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        retryAfterSeconds,
      });
    }
    if (rate.window_active) {
      await connection.execute(
        "UPDATE otp_rate_limits SET request_count = request_count + 1, last_sent_at = UTC_TIMESTAMP() WHERE mobile_hash = ?",
        [mobileHash],
      );
    } else {
      await connection.execute(
        "UPDATE otp_rate_limits SET window_started_at = UTC_TIMESTAMP(), request_count = 1, last_sent_at = UTC_TIMESTAMP() WHERE mobile_hash = ?",
        [mobileHash],
      );
    }
    await connection.execute(
      `INSERT INTO otp_requests (mobile_hash, otp_hash, attempts, expires_at, created_at)
       VALUES (?, ?, 0, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), attempts = 0,
         expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
      [mobileHash, codeHash],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    const smsResult = await sendVerificationCode(mobile, code);
    const payload = {
      message: "Verification code sent.",
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    };
    if (smsResult.mode === "test" && config.nodeEnv !== "production") payload.testOtp = code;
    return response.status(202).json(payload);
  } catch (error) {
    await pool.execute(
      "DELETE FROM otp_requests WHERE mobile_hash = ? AND otp_hash = ?",
      [mobileHash, codeHash],
    );
    logger.warn({ code: error.code || error.name }, "Business Loan SMS provider rejected a verification request");
    return response.status(503).json({ error: error.message });
  }
}));

router.post("/otp/verify", otpVerifyLimit, asyncHandler(async (request, response) => {
  const { mobile: mobileInput, otp } = verifyOtpSchema.parse(request.body);
  const mobile = normalizeMobile(mobileInput);
  const mobileHash = hashPhone(mobile);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT otp_hash, attempts, expires_at, expires_at > UTC_TIMESTAMP() AS is_valid
       FROM otp_requests WHERE mobile_hash = ? FOR UPDATE`,
      [mobileHash],
    );
    const current = rows[0];
    if (!current || !current.is_valid) {
      await connection.execute("DELETE FROM otp_requests WHERE mobile_hash = ?", [mobileHash]);
      await connection.commit();
      return response.status(400).json({ error: "The code is invalid or expired. Request a new code." });
    }
    if (current.attempts >= 5) {
      await connection.commit();
      return response.status(429).json({ error: "Too many incorrect codes. Request a new code." });
    }
    let validCode;
    if (localOtpMode) {
      validCode = isEqualHash(current.otp_hash, hashOtp(mobileHash, otp));
    } else {
      try {
        validCode = await verifyVerificationCode(mobile, otp);
      } catch (error) {
        await connection.rollback();
        logger.warn({ code: error.code || error.name }, "SMS provider could not verify a Business Loan code");
        return response.status(503).json({ error: "Unable to verify the code with the SMS provider. Please try again." });
      }
    }
    if (!validCode) {
      await connection.execute(
        "UPDATE otp_requests SET attempts = attempts + 1 WHERE mobile_hash = ?",
        [mobileHash],
      );
      await connection.commit();
      return response.status(400).json({ error: "The code is incorrect. Please try again." });
    }
    await connection.execute("DELETE FROM otp_requests WHERE mobile_hash = ?", [mobileHash]);
    await connection.commit();
    return response.json({ verificationToken: signVerificationToken(mobileHash) });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.post("/business-loans", requireLeadToken, asyncHandler(async (request, response) => {
  const data = createBusinessLoanSchema.parse(request.body);
  if (request.auth.scope !== "verified-mobile") {
    return response.status(401).json({ error: "Please verify your mobile number again." });
  }
  const mobile = normalizeMobile(data.mobile);
  const mobileHash = hashPhone(mobile);
  if (request.auth.mobileHash !== mobileHash) {
    return response.status(403).json({ error: "The verified number does not match." });
  }
  const id = randomUUID();
  const encryptedMobile = encrypt(mobile);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (await hasCompletedCrmEnquiry(connection, mobileHash)) {
      await connection.commit();
      return response.status(409).json({
        error: "You have already submitted an enquiry with this mobile number. Our team has received it.",
      });
    }
    const [existingRows] = await connection.execute(
      "SELECT id, status FROM business_loan_applications WHERE mobile_hash = ? FOR UPDATE",
      [mobileHash],
    );
    if (existingRows.length) {
      const existing = existingRows[0];
      if (!["details_pending", "submitted"].includes(existing.status)) {
        await connection.rollback();
        return response.status(409).json({
          error: "A Business Loan enquiry for this mobile number is already being handled by our team.",
        });
      }
      await connection.execute(
        `UPDATE business_loan_applications
         SET name = ?, consent = 1, consent_version = ?, consented_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [data.name, config.consentVersion, existing.id],
      );
      await connection.commit();
      return response.json({
        leadId: existing.id,
        leadToken: signLeadToken(existing.id, mobileHash),
        status: existing.status,
      });
    }
    await connection.execute(
      `INSERT INTO business_loan_applications
       (id, name, mobile_ciphertext, mobile_iv, mobile_tag, mobile_hash,
        status, consent, consent_version, consented_at)
       VALUES (?, ?, ?, ?, ?, ?, 'details_pending', 1, ?, UTC_TIMESTAMP())`,
      [
        id,
        data.name,
        encryptedMobile.ciphertext,
        encryptedMobile.iv,
        encryptedMobile.tag,
        mobileHash,
        config.consentVersion,
      ],
    );
    await connection.commit();
    return response.status(201).json({
      leadId: id,
      leadToken: signLeadToken(id, mobileHash),
      status: "details_pending",
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      const [existingRows] = await connection.execute(
        "SELECT id, status FROM business_loan_applications WHERE mobile_hash = ?",
        [mobileHash],
      );
      const existing = existingRows[0];
      if (existing && ["details_pending", "submitted"].includes(existing.status)) {
        return response.json({
          leadId: existing.id,
          leadToken: signLeadToken(existing.id, mobileHash),
          status: existing.status,
        });
      }
      return response.status(409).json({
        error: "A Business Loan enquiry for this mobile number is already being handled by our team.",
      });
    }
    throw error;
  } finally {
    connection.release();
  }
}));

router.patch("/business-loans/:id", requireLeadToken, asyncHandler(async (request, response) => {
  const data = updateBusinessLoanSchema.parse(request.body);
  if (
    request.auth.scope !== "lead"
    || request.auth.sub !== request.params.id
    || !request.auth.mobileHash
  ) {
    return response.status(403).json({ error: "This enquiry cannot be updated with this verification." });
  }
  const crmSyncConfigured = isCrmSyncConfigured();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT status, mobile_hash, name, mobile_ciphertext, mobile_iv, mobile_tag
       FROM business_loan_applications WHERE id = ? FOR UPDATE`,
      [request.params.id],
    );
    const application = rows[0];
    if (!application || application.mobile_hash !== request.auth.mobileHash) {
      await connection.rollback();
      return response.status(404).json({ error: "Enquiry not found." });
    }
    if (!["details_pending", "submitted"].includes(application.status)) {
      await connection.rollback();
      return response.status(409).json({ error: "This enquiry is already being handled by our team." });
    }
    const encryptedRevenue = data.monthlyRevenue === null
      ? null
      : encrypt(String(data.monthlyRevenue));
    await connection.execute(
      `UPDATE business_loan_applications SET
         business_name = ?, business_type = ?, business_vintage = ?,
         monthly_revenue_ciphertext = ?, monthly_revenue_iv = ?, monthly_revenue_tag = ?,
         financing_purpose = ?, requested_amount = ?, city = ?, state = ?,
         status = 'submitted', updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        data.businessName,
        data.businessType,
        data.businessVintage,
        encryptedRevenue?.ciphertext || null,
        encryptedRevenue?.iv || null,
        encryptedRevenue?.tag || null,
        data.financingPurpose,
        data.requestedAmount,
        data.city,
        data.state,
        request.params.id,
      ],
    );
    if (crmSyncConfigured) {
      await enqueueBusinessLoanCrmSync(connection, {
        leadId: request.params.id,
        name: application.name,
        mobile: decrypt(application.mobile_ciphertext, application.mobile_iv, application.mobile_tag),
        businessName: data.businessName,
        businessType: data.businessType,
        businessVintage: data.businessVintage,
        monthlyRevenue: data.monthlyRevenue,
        financingPurpose: data.financingPurpose,
        requestedAmount: data.requestedAmount,
        city: data.city,
        state: data.state,
      });
    }
    await connection.commit();
    return response.json({
      leadId: request.params.id,
      status: "submitted",
      crmSyncStatus: crmSyncConfigured ? "pending" : "disabled",
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

export default router;

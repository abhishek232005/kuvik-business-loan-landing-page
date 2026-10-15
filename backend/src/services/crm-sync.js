import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import config from "../config/env.js";
import pool from "../database/pool.js";
import logger from "../logger.js";
import { decrypt, encrypt } from "./security.js";

const leadSourceName = "Kuvik Loans - Business Loan";
const productName = "Business Loan";

const crmPool = config.crm.user && config.crm.password
  ? mysql.createPool({
      host: config.crm.host,
      port: config.crm.port,
      database: config.crm.name,
      user: config.crm.user,
      password: config.crm.password,
      ...(config.crm.ssl ? { ssl: config.crm.ssl } : {}),
      connectionLimit: config.crm.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      timezone: "Z",
      charset: "utf8mb4",
    })
  : null;

export function isCrmSyncConfigured() {
  return Boolean(crmPool);
}

export async function enqueueBusinessLoanCrmSync(connection, lead) {
  const sealedPayload = encrypt(JSON.stringify(lead));
  await connection.execute(
    `INSERT INTO business_loan_crm_sync_outbox
      (lead_id, payload_ciphertext, payload_iv, payload_tag, sync_status, attempts, next_attempt_at)
     VALUES (?, ?, ?, ?, 'pending', 0, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       payload_ciphertext = VALUES(payload_ciphertext),
       payload_iv = VALUES(payload_iv),
       payload_tag = VALUES(payload_tag),
       sync_status = 'pending',
       attempts = 0,
       payload_version = payload_version + 1,
       next_attempt_at = UTC_TIMESTAMP(),
       locked_until = NULL,
       last_error = NULL`,
    [lead.leadId, sealedPayload.ciphertext, sealedPayload.iv, sealedPayload.tag],
  );
}

async function allocateBusinessId(connection, scope, prefix) {
  const [updated] = await connection.execute(
    "UPDATE business_id_sequences SET `last_value` = `last_value` + 1 WHERE scope = ?",
    [scope],
  );
  if (updated.affectedRows !== 1) {
    throw new Error(`CRM business ID sequence "${scope}" is missing.`);
  }
  const [rows] = await connection.execute(
    "SELECT `last_value` FROM business_id_sequences WHERE scope = ?",
    [scope],
  );
  const sequenceValue = Number(rows[0]?.last_value);
  if (!Number.isSafeInteger(sequenceValue) || sequenceValue < 1) {
    throw new Error(`CRM business ID sequence "${scope}" returned an invalid value.`);
  }
  return `${prefix}${String(sequenceValue).padStart(6, "0")}`;
}

export async function upsertBusinessLoanCrmLead(lead, databasePool = crmPool) {
  if (!databasePool) throw new Error("CRM database credentials are not configured.");
  const connection = await databasePool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO lead_sources (id, name, status)
       VALUES (?, ?, 'active')
       ON DUPLICATE KEY UPDATE status = 'active', deleted_at = NULL`,
      [randomUUID(), leadSourceName],
    );
    const [sourceRows] = await connection.execute(
      "SELECT id FROM lead_sources WHERE name = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1",
      [leadSourceName],
    );
    if (!sourceRows.length) throw new Error("The CRM Business Loan lead source could not be activated.");

    const [adminRows] = await connection.execute(
      `SELECT DISTINCT u.id
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE CONCAT_WS(' ', u.first_name, u.last_name) = 'Kuvik Administrator'
         AND u.status = 'active' AND u.deleted_at IS NULL
         AND r.code IN ('master_admin', 'super_admin')
         AND r.status = 'active' AND r.deleted_at IS NULL
       LIMIT 2`,
    );
    if (adminRows.length !== 1) {
      throw new Error("The CRM must have exactly one active Admin user named Kuvik Administrator.");
    }
    const adminUserId = adminRows[0].id;

    const [productRows] = await connection.execute(
      "SELECT id FROM loan_products WHERE name = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1",
      [productName],
    );
    if (!productRows.length) throw new Error("The CRM has no active Business Loan product.");

    const snapshot = {
      applicationLeadId: lead.leadId,
      loanType: "business",
      businessName: lead.businessName,
      businessType: lead.businessType,
      businessVintage: lead.businessVintage,
      monthlyRevenue: lead.monthlyRevenue,
      financingPurpose: lead.financingPurpose,
      state: lead.state,
    };

    const [existingLeadRows] = await connection.execute(
      `SELECT customers.id AS customer_id, customers.deleted_at AS customer_deleted_at,
         customers.created_by_user_id, leads.id AS crm_lead_id,
         leads.business_id AS crm_lead_business_id
       FROM customers
       JOIN leads ON leads.customer_id = customers.id
       WHERE JSON_UNQUOTE(JSON_EXTRACT(leads.snapshot, '$.applicationLeadId')) = ?
       LIMIT 1 FOR UPDATE`,
      [lead.leadId],
    );
    if (existingLeadRows.length) {
      const existing = existingLeadRows[0];
      if (existing.customer_deleted_at) {
        throw new Error("The linked CRM customer was deleted and cannot be updated.");
      }
      if (
        existing.created_by_user_id
        && String(existing.created_by_user_id) !== String(adminUserId)
      ) {
        throw new Error("The existing CRM customer has a different creator; refusing to overwrite its information.");
      }
      if (!existing.created_by_user_id) {
        await connection.execute(
          "UPDATE customers SET created_by_user_id = COALESCE(created_by_user_id, ?) WHERE id = ?",
          [adminUserId, existing.customer_id],
        );
      }
      await connection.execute(
        `UPDATE leads
         SET required_amount = ?, product_id = ?, source_id = ?, assigned_to_id = ?,
           snapshot = JSON_SET(COALESCE(snapshot, JSON_OBJECT()),
             '$.applicationLeadId', ?, '$.loanType', 'business',
             '$.businessName', ?, '$.businessType', ?, '$.businessVintage', ?,
             '$.monthlyRevenue', ?, '$.financingPurpose', ?, '$.state', ?)
         WHERE id = ?`,
        [
          lead.requestedAmount,
          productRows[0].id,
          sourceRows[0].id,
          adminUserId,
          lead.leadId,
          lead.businessName,
          lead.businessType,
          lead.businessVintage,
          lead.monthlyRevenue,
          lead.financingPurpose,
          lead.state,
          existing.crm_lead_id,
        ],
      );
      await connection.commit();
      return existing.crm_lead_business_id;
    }

    const [customerRows] = await connection.execute(
      `SELECT id, deleted_at, created_by_user_id
       FROM customers WHERE mobile = ? LIMIT 2 FOR UPDATE`,
      [`+91${lead.mobile}`],
    );
    if (customerRows.length > 1) {
      throw new Error("Multiple CRM customers use this mobile number; refusing to change existing customer records.");
    }
    const existingCustomer = customerRows[0];
    if (existingCustomer?.deleted_at) {
      throw new Error("A deleted CRM customer uses this mobile number and cannot be reused.");
    }
    if (
      existingCustomer?.created_by_user_id
      && String(existingCustomer.created_by_user_id) !== String(adminUserId)
    ) {
      throw new Error("The existing CRM customer has a different creator; refusing to overwrite its information.");
    }

    const customerId = existingCustomer?.id || randomUUID();
    if (existingCustomer) {
      if (!existingCustomer.created_by_user_id) {
        await connection.execute(
          "UPDATE customers SET created_by_user_id = COALESCE(created_by_user_id, ?) WHERE id = ?",
          [adminUserId, customerId],
        );
      }
    } else {
      const customerBusinessId = await allocateBusinessId(connection, "customer", "KUV-CUST-");
      await connection.execute(
        `INSERT INTO customers
          (id, business_id, full_name, mobile, city, employment_type, monthly_income,
           requested_loan_amount, lifecycle_status, source_id, preferred_product_id,
           created_by_user_id)
         VALUES (?, ?, ?, ?, ?, 'business_owner', NULL, ?, 'NEW', ?, ?, ?)`,
        [
          customerId,
          customerBusinessId,
          lead.name,
          `+91${lead.mobile}`,
          lead.city,
          lead.requestedAmount,
          sourceRows[0].id,
          productRows[0].id,
          adminUserId,
        ],
      );
    }

    const crmLeadId = randomUUID();
    const crmLeadBusinessId = await allocateBusinessId(connection, "lead", "KUV-LEAD-");
    await connection.execute(
      `INSERT INTO leads
        (id, business_id, customer_id, source_id, product_id, assigned_to_id,
         status, required_amount, snapshot)
       VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [
        crmLeadId,
        crmLeadBusinessId,
        customerId,
        sourceRows[0].id,
        productRows[0].id,
        adminUserId,
        lead.requestedAmount,
        JSON.stringify(snapshot),
      ],
    );
    await connection.execute(
      "UPDATE customers SET intake_lead_id = COALESCE(intake_lead_id, ?) WHERE id = ?",
      [crmLeadId, customerId],
    );
    await connection.commit();
    return crmLeadBusinessId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function claimOutboxRow() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT lead_id, payload_ciphertext, payload_iv, payload_tag, payload_version,
         sync_status, crm_lead_business_id
       FROM business_loan_crm_sync_outbox
       WHERE next_attempt_at <= UTC_TIMESTAMP()
         AND (sync_status IN ('pending', 'synced')
           OR (sync_status = 'processing' AND locked_until < UTC_TIMESTAMP()))
       ORDER BY created_at ASC
       LIMIT 1 FOR UPDATE SKIP LOCKED`,
    );
    if (!rows.length) {
      await connection.commit();
      return null;
    }
    const row = rows[0];
    await connection.execute(
      `UPDATE business_loan_crm_sync_outbox
       SET sync_status = 'processing', locked_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
       WHERE lead_id = ?`,
      [row.lead_id],
    );
    await connection.commit();
    return row;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveOutboxResult(leadId, payloadVersion, { syncStatus, crmLeadBusinessId, error }) {
  await pool.execute(
    `UPDATE business_loan_crm_sync_outbox
     SET sync_status = ?, crm_lead_business_id = COALESCE(?, crm_lead_business_id),
       attempts = attempts + ?, next_attempt_at = CASE WHEN ? = 1
         THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL LEAST(POW(2, LEAST(attempts, 10)), 3600) SECOND)
         ELSE UTC_TIMESTAMP() END,
       locked_until = NULL, last_error = ?
     WHERE lead_id = ? AND payload_version = ?`,
    [
      syncStatus,
      crmLeadBusinessId,
      error ? 1 : 0,
      error ? 1 : 0,
      error ? `${error.code || error.name || "CRM_DELIVERY_FAILED"}: ${error.message || "Delivery failed"}`.slice(0, 255) : null,
      leadId,
      payloadVersion,
    ],
  );
}

export async function processNextBusinessLoanCrmSync() {
  if (!crmPool) return false;
  const row = await claimOutboxRow();
  if (!row) return false;
  const lead = JSON.parse(decrypt(row.payload_ciphertext, row.payload_iv, row.payload_tag));
  let syncStatus = row.sync_status === "synced" ? "synced" : "pending";
  let crmLeadBusinessId = row.crm_lead_business_id;
  try {
    if (syncStatus !== "synced") {
      crmLeadBusinessId = await upsertBusinessLoanCrmLead(lead);
      syncStatus = "synced";
    }
    await saveOutboxResult(row.lead_id, row.payload_version, {
      syncStatus: "complete",
      crmLeadBusinessId,
    });
  } catch (error) {
    await saveOutboxResult(row.lead_id, row.payload_version, {
      syncStatus,
      crmLeadBusinessId,
      error,
    });
    logger.warn(
      { leadId: row.lead_id, code: error.code || error.name },
      "Business Loan CRM delivery will be retried",
    );
  }
  return true;
}

export function startCrmSyncWorker() {
  if (!crmPool) return async () => {};
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      for (let processed = 0; processed < 10 && await processNextBusinessLoanCrmSync(); processed += 1) {
        // Process a small batch, then return to the API event loop.
      }
    } catch (error) {
      logger.error({ code: error.code || error.name }, "Business Loan CRM worker could not process the outbox");
    } finally {
      running = false;
    }
  }, 1000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    while (running) await new Promise((resolve) => setTimeout(resolve, 10));
  };
}

export async function closeCrmPool() {
  if (crmPool) await crmPool.end();
}

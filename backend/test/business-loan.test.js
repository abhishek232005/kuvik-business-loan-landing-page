import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.DB_HOST = "localhost";
process.env.DB_NAME = "kuvik_business_loan_test";
process.env.DB_USER = "business_test";
process.env.DB_PASSWORD = "test-only";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.PHONE_HASH_SECRET = randomBytes(32).toString("hex");
process.env.OTP_HASH_SECRET = randomBytes(32).toString("hex");
process.env.NODE_ENV = "test";
process.env.SMS_TEST_MODE = "false";
process.env.SMS_PROVIDER = "http";
process.env.SMS_API_URL = "https://sms.example.test/otp";
process.env.SMS_API_TOKEN = "test-provider-token";
process.env.SMS_TEMPLATE_ID = "business-otp-test";
process.env.CRM_DB_USER = "";
process.env.CRM_DB_PASSWORD = "";

const security = await import("../src/services/security.js");
const {
  createBusinessLoanSchema,
  sendOtpSchema,
  updateBusinessLoanSchema,
  verifyOtpSchema,
} = await import("../src/validation/schemas.js");

test("validates Business Loan consent, mobile, details and OTP", () => {
  assert.equal(sendOtpSchema.safeParse({ mobile: "9876543210", consent: true }).success, true);
  assert.equal(sendOtpSchema.safeParse({ mobile: "9876543210", consent: false }).success, false);
  assert.equal(verifyOtpSchema.safeParse({ mobile: "9876543210", otp: "1234" }).success, true);
  assert.equal(verifyOtpSchema.safeParse({ mobile: "9876543210", otp: "12345" }).success, false);
  assert.equal(createBusinessLoanSchema.safeParse({
    name: "Asha Kumar",
    mobile: "9876543210",
    consent: true,
  }).success, true);
  assert.equal(updateBusinessLoanSchema.safeParse({
    businessName: "Asha Trading",
    businessType: "sole_proprietorship",
    businessVintage: "1_to_3_years",
    monthlyRevenue: null,
    financingPurpose: "working_capital",
    requestedAmount: 500000,
    city: "Jaipur",
    state: "Rajasthan",
  }).success, true);
  assert.equal(updateBusinessLoanSchema.safeParse({
    businessName: "Asha Trading",
    businessType: "sole_proprietorship",
    businessVintage: "1_to_3_years",
    monthlyRevenue: -1,
    financingPurpose: "working_capital",
    requestedAmount: 500000,
    city: "Jaipur",
    state: "Rajasthan",
  }).success, false);
});

test("encrypts private application data and hashes phone numbers and OTPs", () => {
  const sealed = security.encrypt("9876543210");
  assert.notEqual(sealed.ciphertext, "9876543210");
  assert.equal(security.decrypt(sealed.ciphertext, sealed.iv, sealed.tag), "9876543210");
  const mobileHash = security.hashPhone("9876543210");
  const otp = security.createOtp();
  assert.match(otp, /^\d{4}$/);
  assert.equal(security.isEqualHash(
    security.hashOtp(mobileHash, otp),
    security.hashOtp(mobileHash, otp),
  ), true);
  assert.equal(security.isEqualHash(
    security.hashOtp(mobileHash, otp),
    security.hashOtp(mobileHash, "0000"),
  ), false);
});

test("sends the generated OTP through the configured HTTP provider", async () => {
  const { sendVerificationCode } = await import("../src/services/sms.js");
  const originalFetch = globalThis.fetch;
  let requestBody;
  let requestHeaders;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    requestHeaders = options.headers;
    return { ok: true };
  };
  try {
    const result = await sendVerificationCode("9876543210", "1234");
    assert.equal(result.mode, "live");
    assert.equal(requestBody.otp, "1234");
    assert.equal(requestBody.to, "+919876543210");
    assert.equal(requestBody.templateId, "business-otp-test");
    assert.equal(requestHeaders.Authorization, "Bearer test-provider-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("queues CRM payloads using encrypted business-only outbox rows", async () => {
  const { enqueueBusinessLoanCrmSync } = await import("../src/services/crm-sync.js");
  let sql;
  let values;
  const lead = {
    leadId: "test-business-lead",
    businessName: "Asha Trading",
    financingPurpose: "working_capital",
  };
  await enqueueBusinessLoanCrmSync({
    async execute(query, params) {
      sql = query;
      values = params;
    },
  }, lead);
  assert.match(sql, /business_loan_crm_sync_outbox/);
  assert.equal(JSON.stringify(values).includes("Asha Trading"), false);
  assert.deepEqual(
    JSON.parse(security.decrypt(values[1], values[2], values[3])),
    lead,
  );
});

test("maps enquiries to the Business Loan product, source and configured CRM admin", async () => {
  const { upsertBusinessLoanCrmLead } = await import("../src/services/crm-sync.js");
  const statements = [];
  const sequences = { customer: 0, lead: 0 };
  const connection = {
    async beginTransaction() {},
    async execute(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes("SELECT id FROM lead_sources")) return [[{ id: "business-source" }], []];
      if (sql.includes("SELECT DISTINCT u.id")) return [[{ id: "configured-admin-id" }], []];
      if (sql.includes("SELECT id FROM loan_products")) {
        assert.equal(params[0], "Business Loan");
        return [[{ id: "business-product" }], []];
      }
      if (sql.includes("JSON_EXTRACT")) return [[], []];
      if (sql.includes("FROM customers WHERE mobile")) return [[], []];
      if (sql.includes("UPDATE business_id_sequences")) {
        sequences[params[0]] += 1;
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("SELECT `last_value`")) return [[{ last_value: sequences[params[0]] }], []];
      return [{ affectedRows: 1 }, []];
    },
    async commit() {},
    async rollback() {},
    release() {},
  };
  const lead = {
    leadId: "test-business-lead",
    name: "Asha Kumar",
    mobile: "9876543210",
    businessName: "Asha Trading",
    businessType: "sole_proprietorship",
    businessVintage: "1_to_3_years",
    monthlyRevenue: 200000,
    financingPurpose: "working_capital",
    requestedAmount: 500000,
    city: "Jaipur",
    state: "Rajasthan",
  };
  const crmLeadId = await upsertBusinessLoanCrmLead(lead, {
    async getConnection() { return connection; },
  });
  const source = statements.find((row) => row.sql.includes("INSERT INTO lead_sources"));
  const customer = statements.find((row) => row.sql.includes("INSERT INTO customers"));
  const crmLead = statements.find((row) => row.sql.includes("INSERT INTO leads"));
  assert.equal(source.params[1], "Kuvik Loans - Business Loan");
  assert.equal(customer.params.at(-1), "configured-admin-id");
  assert.equal(crmLead.params[3], "business-source");
  assert.equal(crmLead.params[4], "business-product");
  assert.equal(crmLead.params[5], "configured-admin-id");
  assert.equal(JSON.parse(crmLead.params[7]).businessName, "Asha Trading");
  assert.equal(crmLeadId, "KUV-LEAD-000001");
});

test("serves API 404 responses as JSON instead of falling through to a page", async (t) => {
  const { createApp } = await import("../src/index.js");
  const server = createApp({ serveFrontend: false }).listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/not-a-business-endpoint`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), { error: "Endpoint not found." });
});

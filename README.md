# Kuvik Business Loan Landing Page

A standalone React and Tailwind CSS landing page for business owners, with an Express API for consent-based mobile OTP verification, encrypted Business Loan enquiries, and optional CRM synchronization through a retryable outbox.

## Requirements

- Node.js 20 or newer
- MySQL 8.0 or newer
- An approved SMS provider for live OTP delivery
- Optional access to the Kuvik CRM database for CRM delivery

## Local setup

1. Create a MySQL database and a restricted application user. Apply [`database/schema.sql`](./database/schema.sql) to the Business Loan database. The app requires CRUD access to its Business Loan tables; grant schema changes separately to an operator that applies migrations.
2. Copy [`backend/.env.example`](./backend/.env.example) to `backend/.env`. Set database credentials and generate four independent secrets (JWT, encryption, phone-hash and OTP-hash) using cryptographically secure random bytes. `DATA_ENCRYPTION_KEY` must be exactly 32 random bytes encoded as 64 hexadecimal characters; each other secret must be at least 32 characters.
3. For local development only, keep `SMS_TEST_MODE=true`. OTP responses include a `testOtp` only outside production. Never enable this mode in a production environment.
4. Install and run each package in a separate terminal:

   ```powershell
   cd backend
   npm ci
   npm test
   npm run dev
   ```

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

The Vite development server proxies `/api` requests to `http://localhost:4000`. Set `CLIENT_ORIGIN` to the frontend origin if using a different Vite port.

## Production build and run

Build the frontend, then start the API server from the backend package:

```powershell
cd frontend
npm ci
npm run build
cd ..\backend
npm ci
npm start
```

The backend serves the built frontend and `/api` endpoints from the same origin. Configure `NODE_ENV=production`, TLS-enabled MySQL (`DB_SSL=true`), an HTTPS `CLIENT_ORIGIN`, and live SMS provider credentials. The server checks its database connection on startup and exits with an error if required configuration or the database is unavailable.

## Business Loan API

All paths are prefixed with `/api`:

- `POST /otp/send` — request an OTP after providing consent.
- `POST /otp/verify` — verify the OTP and receive a short-lived verification token.
- `POST /business-loans` — create or resume an enquiry using that token.
- `PATCH /business-loans/:id` — save the business details and queue CRM delivery.

Requests are validated server-side, rate-limited, and bound to the verified mobile number. Mobile numbers and OTPs are stored as keyed hashes; personal/business details are encrypted at rest in the application database. Consent metadata is stored with each application. The app does not make credit, eligibility or approval decisions.

## SMS configuration

`SMS_PROVIDER=msg91` uses the MSG91 OTP API with an approved template and provider-side verification. `SMS_PROVIDER=http` posts the phone, generated OTP, sender ID and template ID to a configured HTTPS provider, then verifies the OTP against the application's protected, expiring OTP record. Configure the receiving provider endpoint to use the `to`, `otp`, `senderId`, and `templateId` JSON fields. Provider credentials are sent in the Authorization header and must never be committed.

## CRM synchronization

CRM integration is optional. Configure the `CRM_DB_*` values in `backend/.env` to enable it. The outbox worker retries pending CRM delivery and records delivery state; a saved enquiry remains available in the application database when CRM is not configured or temporarily unavailable. CRM delivery is not reported as successful until confirmed. The CRM database must contain the expected Kuvik lead-source, loan-product, administrator, customer and business-ID sequence data.

## Secrets and generated files

Never commit `.env` files, credentials, database dumps, `node_modules`, build output or logs. The tracked `.env.example` files contain placeholders only. `.gitignore` excludes local secrets and generated artifacts.

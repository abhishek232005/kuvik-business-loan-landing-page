CREATE DATABASE IF NOT EXISTS kuvik_business_loan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE kuvik_business_loan;

CREATE TABLE IF NOT EXISTS otp_requests (
  mobile_hash CHAR(64) NOT NULL PRIMARY KEY,
  otp_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_business_otp_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otp_rate_limits (
  mobile_hash CHAR(64) NOT NULL PRIMARY KEY,
  window_started_at DATETIME NOT NULL,
  request_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_sent_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_business_otp_rate_last_sent (last_sent_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS business_loan_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  mobile_ciphertext VARCHAR(128) NOT NULL,
  mobile_iv CHAR(24) NOT NULL,
  mobile_tag CHAR(32) NOT NULL,
  mobile_hash CHAR(64) NOT NULL UNIQUE,
  business_name VARCHAR(120) NULL,
  business_type ENUM(
    'sole_proprietorship',
    'partnership',
    'llp',
    'private_limited',
    'public_limited',
    'other'
  ) NULL,
  business_vintage ENUM(
    'under_1_year',
    '1_to_3_years',
    '3_to_5_years',
    'over_5_years'
  ) NULL,
  monthly_revenue_ciphertext VARCHAR(128) NULL,
  monthly_revenue_iv CHAR(24) NULL,
  monthly_revenue_tag CHAR(32) NULL,
  financing_purpose ENUM(
    'working_capital',
    'equipment',
    'expansion',
    'inventory',
    'operational_expenses',
    'other'
  ) NULL,
  requested_amount DECIMAL(12, 0) NULL,
  city VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  status ENUM('details_pending', 'submitted', 'contacted', 'qualified', 'rejected', 'disbursed')
    NOT NULL DEFAULT 'details_pending',
  consent BOOLEAN NOT NULL,
  consent_version VARCHAR(40) NOT NULL,
  consented_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_business_loan_status_created (status, created_at),
  INDEX idx_business_loan_name (business_name),
  INDEX idx_business_loan_city (city)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS business_loan_crm_sync_outbox (
  lead_id CHAR(36) NOT NULL PRIMARY KEY,
  payload_ciphertext MEDIUMTEXT NOT NULL,
  payload_iv CHAR(24) NOT NULL,
  payload_tag CHAR(32) NOT NULL,
  sync_status ENUM('pending', 'processing', 'synced', 'complete') NOT NULL DEFAULT 'pending',
  notification_status ENUM('not_configured') NOT NULL DEFAULT 'not_configured',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  payload_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until DATETIME NULL,
  crm_lead_business_id VARCHAR(30) NULL,
  last_error VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_business_crm_outbox_work (sync_status, next_attempt_at),
  CONSTRAINT fk_business_crm_outbox_application
    FOREIGN KEY (lead_id) REFERENCES business_loan_applications(id)
) ENGINE=InnoDB;

-- Pole² landing — forms backend schema (Cloudflare D1).
-- Apply with:  wrangler d1 migrations apply pole2-forms
-- D1 is the source of truth. No raw IPs, no user-agent, no PII beyond what a
-- user voluntarily types into a support message. All timestamps are UTC ISO-8601.

-- Beta / waiting-list subscriptions. The normalized (trimmed, lowercased) email
-- is the primary key, so a duplicate signup is a no-op (ON CONFLICT DO NOTHING).
CREATE TABLE IF NOT EXISTS waitlist (
  email       TEXT PRIMARY KEY,          -- normalized, UNIQUE
  created_at  TEXT NOT NULL,             -- UTC ISO-8601
  source      TEXT NOT NULL DEFAULT 'landing',
  consent_at  TEXT NOT NULL,             -- when consent was given
  ip_key      TEXT                       -- HMAC-SHA256(ip, IP_HASH_SECRET); never the raw IP
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist (created_at);

-- Support / bug-report submissions from /supporto (and the future in-app link).
CREATE TABLE IF NOT EXISTS support (
  id                  TEXT PRIMARY KEY,  -- unique submission id (client- or server-generated); makes retries idempotent
  email               TEXT NOT NULL,     -- normalized reply address
  category            TEXT NOT NULL,     -- fixed enum (see functions/_lib/validation.js)
  message             TEXT NOT NULL,     -- 10–4000 chars, user-authored
  app_version         TEXT,              -- optional, short
  app_build           TEXT,              -- optional, short
  created_at          TEXT NOT NULL,     -- UTC ISO-8601
  privacy_ack_at      TEXT NOT NULL,     -- when the privacy acknowledgment was given
  ip_key              TEXT,              -- HMAC-SHA256(ip, IP_HASH_SECRET); never the raw IP
  notification_status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed (internal only)
  notified_at         TEXT               -- UTC ISO-8601 when the notification succeeded, else NULL
);
CREATE INDEX IF NOT EXISTS idx_support_created ON support (created_at);
CREATE INDEX IF NOT EXISTS idx_support_email   ON support (email);
CREATE INDEX IF NOT EXISTS idx_support_notif   ON support (notification_status);

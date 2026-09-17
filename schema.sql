-- ============================================================
-- Customer 360 & Relationship Copilot — backend schema
-- Postgres. Build this in parallel with the mock server; nothing
-- here needs to be finished before frontend or API work starts.
-- Column names deliberately mirror the OpenAPI schemas 1:1 so the
-- eventual "swap mock server for real DB" step is a mechanical one.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('RM', 'Manager', 'Operations', 'Auditor');
CREATE TYPE segment_type AS ENUM ('Premium', 'Regular');
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE kyc_status AS ENUM ('Verified', 'Pending');
CREATE TYPE txn_type AS ENUM ('credit', 'debit', 'failed');
CREATE TYPE sr_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE ai_decision AS ENUM ('accept', 'reject');
CREATE TYPE plan_status AS ENUM ('draft', 'accepted', 'rejected');

-- ---------------- Identity & access ----------------

CREATE TABLE app_user (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          user_role NOT NULL,
  branch        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RM <-> customer assignment. A customer has exactly one owning RM;
-- Manager/Operations/Auditor access is governed by role, not this table.
CREATE TABLE portfolio_assignment (
  rm_user_id    UUID NOT NULL REFERENCES app_user(id),
  customer_id   TEXT NOT NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rm_user_id, customer_id)
);

-- ---------------- Customer core ----------------

CREATE TABLE customer (
  id              TEXT PRIMARY KEY,             -- e.g. CU10231
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  address         TEXT,
  segment         segment_type NOT NULL DEFAULT 'Regular',
  kyc_status      kyc_status NOT NULL DEFAULT 'Pending',
  risk_flag       risk_level NOT NULL DEFAULT 'Low',
  marketing_consent     BOOLEAN NOT NULL DEFAULT false,
  data_sharing_consent  BOOLEAN NOT NULL DEFAULT false,
  consent_updated_on    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account (
  id            TEXT PRIMARY KEY,
  customer_id   TEXT NOT NULL REFERENCES customer(id),
  type          TEXT NOT NULL,                  -- Savings, Current, NRE Savings...
  balance       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Active',
  opened_on     DATE NOT NULL
);

CREATE TABLE loan (
  id              TEXT PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES customer(id),
  type            TEXT NOT NULL,
  principal       NUMERIC(14,2) NOT NULL,
  outstanding     NUMERIC(14,2) NOT NULL,
  emi             NUMERIC(12,2) NOT NULL,
  tenure_months   INTEGER,
  status          TEXT NOT NULL DEFAULT 'Active',
  missed_emis     INTEGER NOT NULL DEFAULT 0,
  last_missed_on  DATE
);

-- Full PAN, if ever stored, belongs in a tokenized vault, NOT this table.
-- This table only ever holds the masked display form the API returns.
CREATE TABLE card (
  id                TEXT PRIMARY KEY,
  customer_id       TEXT NOT NULL REFERENCES customer(id),
  type              TEXT NOT NULL,
  masked_number     TEXT NOT NULL,
  card_limit        NUMERIC(12,2) NOT NULL,
  used              NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE transaction (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES customer(id),
  txn_date        DATE NOT NULL,
  description     TEXT NOT NULL,
  type            txn_type NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  balance_after   NUMERIC(14,2) NOT NULL
);
CREATE INDEX idx_transaction_customer_date ON transaction(customer_id, txn_date DESC);

CREATE TABLE interaction (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES customer(id),
  rm_user_id      UUID NOT NULL REFERENCES app_user(id),
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel         TEXT NOT NULL,
  notes           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_request (
  id              TEXT PRIMARY KEY,              -- e.g. SR-5581
  customer_id     TEXT NOT NULL REFERENCES customer(id),
  type            TEXT NOT NULL,
  status          sr_status NOT NULL DEFAULT 'open',
  assigned_to_user_id UUID REFERENCES app_user(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_request_history (
  id                  BIGSERIAL PRIMARY KEY,
  service_request_id  TEXT NOT NULL REFERENCES service_request(id),
  changed_by_user_id  UUID NOT NULL REFERENCES app_user(id),
  note                TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforced in application code (open -> in_progress -> closed, or back to open);
-- this table just records the trail. Consider a DB trigger if you want the
-- transition rule enforced at the data layer too.

-- ---------------- Copilot / AI ----------------

-- Every AI generation is stored, not just logged as text — this is what lets
-- an auditor answer "what did the AI suggest, and did the human follow it."
CREATE TABLE ai_interaction (
  id              BIGSERIAL PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES customer(id),
  user_id         UUID NOT NULL REFERENCES app_user(id),
  kind            TEXT NOT NULL,   -- summary | next_best_action | chat | contact_plan
  input_context   JSONB NOT NULL,  -- the grounding data actually sent to the model
  output_text     TEXT NOT NULL,
  decision        ai_decision,     -- null until the RM accepts/rejects (nba only)
  plan_status     plan_status,     -- null unless kind = contact_plan
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Authorized retrieval chunks for RAG. The source_id points back to the
-- relational record used to build the chunk; raw card/PAN data never belongs here.
CREATE TABLE customer_embedding (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   TEXT NOT NULL REFERENCES customer(id),
  source_id     TEXT NOT NULL,
  source_type   TEXT NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(384) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_embedding_customer ON customer_embedding(customer_id);
CREATE INDEX idx_customer_embedding_vector ON customer_embedding USING hnsw (embedding vector_cosine_ops);

-- ---------------- Audit ----------------

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID REFERENCES app_user(id),
  role        user_role,
  action      TEXT NOT NULL,     -- LOGIN, VIEW_PROFILE, VIEW_TAB, AI_SUMMARY, SR_STATUS_CHANGE, ...
  details     TEXT
);
CREATE INDEX idx_audit_ts ON audit_log(ts DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id);

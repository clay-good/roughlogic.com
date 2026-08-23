CREATE TABLE calculator_reports (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  calculator_id TEXT NOT NULL,
  calculator_name TEXT NOT NULL,
  page_url TEXT NOT NULL CHECK (length(page_url) <= 8192),
  note TEXT CHECK (note IS NULL OR length(note) <= 160),
  inputs_json TEXT NOT NULL CHECK (length(inputs_json) <= 60000),
  outputs_json TEXT NOT NULL CHECK (length(outputs_json) <= 60000),
  output_text TEXT NOT NULL CHECK (length(output_text) <= 12000),
  output_truncated INTEGER NOT NULL DEFAULT 0 CHECK (output_truncated IN (0, 1)),
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'wont_fix')),
  resolved_at TEXT,
  resolution_note TEXT CHECK (resolution_note IS NULL OR length(resolution_note) <= 1000)
);

CREATE INDEX calculator_reports_status_created
  ON calculator_reports (status, created_at);

CREATE INDEX calculator_reports_calculator_status
  ON calculator_reports (calculator_id, status);

CREATE TABLE report_limits (
  bucket TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'reporter')),
  subject TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (bucket, scope, subject)
) WITHOUT ROWID;

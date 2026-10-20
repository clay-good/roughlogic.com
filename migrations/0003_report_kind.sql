-- spec-v1971: one table, two kinds. A "request" is a reader asking for a
-- calculator the search did not find; every existing row is a "problem".
ALTER TABLE calculator_reports
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'problem' CHECK (kind IN ('problem', 'request'));

CREATE INDEX calculator_reports_kind_status
  ON calculator_reports (kind, status);

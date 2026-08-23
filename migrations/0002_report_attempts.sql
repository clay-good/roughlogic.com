CREATE INDEX calculator_reports_created_at
  ON calculator_reports (created_at);

CREATE TABLE report_attempt_limits (
  bucket TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'reporter')),
  subject TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (bucket, scope, subject)
) WITHOUT ROWID;

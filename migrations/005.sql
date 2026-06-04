-- Add status column to daily_report table
ALTER TABLE daily_report.daily_report
  ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'note'
    CHECK (status IN ('note', 'todo', 'done'));

CREATE INDEX IF NOT EXISTS idx_daily_report_status ON daily_report.daily_report(status);

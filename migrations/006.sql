-- Migration 006: Add assignee_id and deadline columns (teamwork branch only)
ALTER TABLE daily_report.daily_report
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES daily_report.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deadline DATE;

CREATE INDEX IF NOT EXISTS idx_daily_report_assignee ON daily_report.daily_report(assignee_id);

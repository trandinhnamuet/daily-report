-- Migration 007: Add short non-guessable public_id for task share links
ALTER TABLE daily_report.daily_report
  ADD COLUMN IF NOT EXISTS public_id TEXT;

-- Backfill existing rows with an 8-char hex id
UPDATE daily_report.daily_report
  SET public_id = substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 8)
  WHERE public_id IS NULL;

-- New rows get an id automatically
ALTER TABLE daily_report.daily_report
  ALTER COLUMN public_id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);

ALTER TABLE daily_report.daily_report
  ALTER COLUMN public_id SET NOT NULL;

ALTER TABLE daily_report.daily_report
  ADD CONSTRAINT daily_report_public_id_unique UNIQUE (public_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_public_id ON daily_report.daily_report(public_id);

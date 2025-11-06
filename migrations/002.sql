-- Migration: Create daily_report table
CREATE TABLE daily_report (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_daily_report_user_id ON daily_report(user_id);
CREATE INDEX idx_daily_report_created_at ON daily_report(created_at);
-- Migration: Create notes table
CREATE TABLE daily_report.notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 0,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_notes_user_id ON daily_report.notes(user_id);
CREATE INDEX idx_notes_created_at ON daily_report.notes(created_at);
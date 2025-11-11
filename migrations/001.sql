-- Migration: Create schema and users table
CREATE SCHEMA IF NOT EXISTS daily_report;

CREATE TABLE daily_report.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample users
INSERT INTO daily_report.users (name) VALUES 
  ('Nguyễn Văn A'),
  ('Trần Thị B'),
  ('Lê Văn C'),
  ('Phạm Thị D'),
  ('Hoàng Văn E');
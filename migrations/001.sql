-- Migration: Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample users
INSERT INTO users (name) VALUES 
  ('Nguyễn Văn A'),
  ('Trần Thị B'),
  ('Lê Văn C'),
  ('Phạm Thị D'),
  ('Hoàng Văn E');
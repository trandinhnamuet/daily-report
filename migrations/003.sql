-- Migration: Create documents table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 0,
  detail TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
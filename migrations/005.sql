CREATE SCHEMA IF NOT EXISTS security;

CREATE TABLE IF NOT EXISTS security.devices (
  id UUID NOT NULL PRIMARY KEY,      -- device_id từ localStorage

  user_agent TEXT,
  platform TEXT,
  screen TEXT,
  timezone TEXT,

  is_blocked BOOLEAN DEFAULT FALSE,

  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

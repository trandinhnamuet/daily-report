-- =========================
-- 003.sql
-- Index tối ưu truy vấn
-- =========================

CREATE INDEX IF NOT EXISTS idx_device_logs_device
  ON security.device_login_logs(device_id);

CREATE INDEX IF NOT EXISTS idx_device_logs_user
  ON security.device_login_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_device_logs_time
  ON security.device_login_logs(logged_in_at);

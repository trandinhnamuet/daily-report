-- =========================
-- 002.sql
-- Log thiết bị đăng nhập tài khoản
-- =========================

CREATE TABLE IF NOT EXISTS security.device_login_logs (
  id BIGSERIAL PRIMARY KEY,

  device_id UUID NOT NULL,
  user_id INT NOT NULL,

  ip_address INET,
  logged_in_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_device
    FOREIGN KEY (device_id)
    REFERENCES security.devices(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES daily_report.users(id)
    ON DELETE CASCADE
);

-- =========================
-- 004.sql
-- Mở rộng quản lý thiết bị
-- =========================

ALTER TABLE security.devices
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Migration 008: nhật ký hành động (activity log) — xem lại lịch sử thao tác của mọi người

CREATE TABLE IF NOT EXISTS daily_report.activity_log (
  id BIGSERIAL PRIMARY KEY,
  -- không đặt FOREIGN KEY: xoá user vẫn phải giữ được lịch sử
  user_id INTEGER,
  user_name VARCHAR(255) NOT NULL DEFAULT 'Không xác định',
  action VARCHAR(40) NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id INTEGER,
  summary TEXT,
  detail JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_id_desc ON daily_report.activity_log(id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON daily_report.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON daily_report.activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON daily_report.activity_log(created_at);

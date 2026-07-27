-- Migration 009: comment, cảm xúc (reaction) và trạng thái đã đọc cho note/task

-- Comment dưới mỗi note/task
CREATE TABLE IF NOT EXISTS daily_report.report_comments (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES daily_report.daily_report(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES daily_report.users(id) ON DELETE SET NULL,
  -- giữ tên tại thời điểm comment để nội dung không mất chủ khi user bị xoá
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report ON daily_report.report_comments(report_id, id);

-- Cảm xúc: mỗi người 1 reaction cho 1 note/task (giống Messenger)
CREATE TABLE IF NOT EXISTS daily_report.report_reactions (
  report_id INTEGER NOT NULL REFERENCES daily_report.daily_report(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES daily_report.users(id) ON DELETE CASCADE,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_reactions_report ON daily_report.report_reactions(report_id);

-- Đã đọc: mỗi cặp (note/task, người đọc) chỉ ghi 1 lần
CREATE TABLE IF NOT EXISTS daily_report.report_reads (
  report_id INTEGER NOT NULL REFERENCES daily_report.daily_report(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES daily_report.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_reads_report ON daily_report.report_reads(report_id);

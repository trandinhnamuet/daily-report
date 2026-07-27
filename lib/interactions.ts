import pool from './db';

/** Bộ cảm xúc cho phép — giống thanh reaction của Messenger */
export const ALLOWED_EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '😡'] as const;
export type Emoji = (typeof ALLOWED_EMOJIS)[number];

export const isAllowedEmoji = (value: unknown): value is Emoji =>
  typeof value === 'string' && (ALLOWED_EMOJIS as readonly string[]).includes(value);

export interface ReactionUser {
  id: number;
  name: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: ReactionUser[];
}

export interface Reader {
  id: number;
  name: string;
  read_at: string;
}

export interface InteractionSummary {
  reactions: ReactionGroup[];
  readers: Reader[];
  comment_count: number;
}

/** Cảm xúc của nhiều note/task, gom theo emoji, nhiều nhất lên đầu */
export async function fetchReactions(reportIds: number[]): Promise<Map<number, ReactionGroup[]>> {
  const byReport = new Map<number, ReactionGroup[]>();
  if (!reportIds.length) return byReport;

  const result = await pool.query(
    `SELECT r.report_id, r.emoji, r.user_id, COALESCE(u.name, 'Người dùng đã bị xoá') AS user_name
     FROM daily_report.report_reactions r
     LEFT JOIN daily_report.users u ON u.id = r.user_id
     WHERE r.report_id = ANY($1::int[])
     ORDER BY r.report_id, r.created_at`,
    [reportIds]
  );

  for (const row of result.rows) {
    const groups = byReport.get(row.report_id) ?? [];
    let group = groups.find(g => g.emoji === row.emoji);
    if (!group) {
      group = { emoji: row.emoji, count: 0, users: [] };
      groups.push(group);
    }
    group.count += 1;
    group.users.push({ id: row.user_id, name: row.user_name });
    byReport.set(row.report_id, groups);
  }

  for (const groups of byReport.values()) {
    groups.sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }

  return byReport;
}

/** Danh sách người đã đọc từng note/task */
export async function fetchReaders(reportIds: number[]): Promise<Map<number, Reader[]>> {
  const byReport = new Map<number, Reader[]>();
  if (!reportIds.length) return byReport;

  const result = await pool.query(
    `SELECT rr.report_id, rr.user_id, u.name AS user_name, rr.read_at
     FROM daily_report.report_reads rr
     JOIN daily_report.users u ON u.id = rr.user_id
     WHERE rr.report_id = ANY($1::int[])
     ORDER BY rr.report_id, rr.read_at`,
    [reportIds]
  );

  for (const row of result.rows) {
    const readers = byReport.get(row.report_id) ?? [];
    readers.push({ id: row.user_id, name: row.user_name, read_at: row.read_at });
    byReport.set(row.report_id, readers);
  }

  return byReport;
}

/** Số comment của từng note/task */
export async function fetchCommentCounts(reportIds: number[]): Promise<Map<number, number>> {
  const byReport = new Map<number, number>();
  if (!reportIds.length) return byReport;

  const result = await pool.query(
    `SELECT report_id, COUNT(*)::int AS count
     FROM daily_report.report_comments
     WHERE report_id = ANY($1::int[])
     GROUP BY report_id`,
    [reportIds]
  );

  for (const row of result.rows) byReport.set(row.report_id, row.count);
  return byReport;
}

/** Parse "1,2,3" → [1,2,3], bỏ giá trị rác và giới hạn số lượng */
export function parseIdList(raw: string | null, max = 200): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map(part => Number(part.trim()))
    .filter(id => Number.isInteger(id) && id > 0);
  return Array.from(new Set(ids)).slice(0, max);
}

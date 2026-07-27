import { cookies } from 'next/headers';
import pool from './db';

export type EntityType = 'report' | 'note' | 'document' | 'user' | 'comment' | 'reaction';

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'assignee_change'
  | 'deadline_change'
  | 'comment_create'
  | 'comment_delete'
  | 'reaction_set'
  | 'reaction_remove'
  | 'read';

export interface Actor {
  id: number | null;
  name: string;
}

/**
 * Người đang thao tác, lấy từ cookie mà UserProvider set ở client.
 * Không có cookie → 'Khách' (vẫn ghi log để không mất dấu hành động).
 */
export async function getActor(): Promise<Actor> {
  try {
    const store = await cookies();
    const rawId = store.get('current_user_id')?.value;
    const rawName = store.get('current_user_name')?.value;

    const parsedId = rawId ? Number(rawId) : NaN;
    const id = Number.isFinite(parsedId) ? parsedId : null;

    let name = '';
    if (rawName) {
      try { name = decodeURIComponent(rawName); } catch { name = rawName; }
    }

    // Cookie tên có thể thiếu (bản cũ) → tra lại từ DB
    if (!name && id) {
      const res = await pool.query('SELECT name FROM daily_report.users WHERE id = $1', [id]);
      name = res.rows[0]?.name ?? '';
    }

    return { id, name: name || 'Khách' };
  } catch {
    return { id: null, name: 'Khách' };
  }
}

interface LogParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: number | null;
  summary?: string | null;
  detail?: unknown;
  actor?: Actor;
}

/**
 * Ghi 1 dòng nhật ký. Cố tình nuốt lỗi: log hỏng không được làm hỏng request chính.
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const actor = params.actor ?? (await getActor());
    await pool.query(
      `INSERT INTO daily_report.activity_log
         (user_id, user_name, action, entity_type, entity_id, summary, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actor.id,
        actor.name,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.summary ?? null,
        params.detail === undefined ? null : JSON.stringify(params.detail),
      ]
    );
  } catch (error) {
    console.error('logActivity error:', error);
  }
}

/** Cắt ngắn nội dung dài để summary trong nhật ký không phình ra */
export function excerpt(text: string | null | undefined, max = 120): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

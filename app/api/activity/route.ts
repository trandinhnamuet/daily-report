import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/activity — nhật ký hành động, mới nhất trước.
 * Lọc: user_id, entity_type, action, date (YYYY-MM-DD), q (tìm trong summary).
 * Phân trang bằng before_id (id giảm dần) để không lệch khi có log mới chen vào.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    const push = (clause: (placeholder: string) => string, value: string | number) => {
      values.push(value);
      conditions.push(clause(`$${values.length}`));
    };

    const beforeId = searchParams.get('before_id');
    if (beforeId && Number.isFinite(Number(beforeId))) push(p => `id < ${p}`, Number(beforeId));

    const userId = searchParams.get('user_id');
    if (userId && userId !== 'all' && Number.isFinite(Number(userId))) {
      push(p => `user_id = ${p}`, Number(userId));
    }

    const entityType = searchParams.get('entity_type');
    if (entityType && entityType !== 'all') push(p => `entity_type = ${p}`, entityType);

    const action = searchParams.get('action');
    if (action && action !== 'all') push(p => `action = ${p}`, action);

    const date = searchParams.get('date');
    if (date && date !== 'all') push(p => `created_at::date = ${p}::date`, date);

    const q = searchParams.get('q')?.trim();
    if (q) push(p => `(summary ILIKE ${p} OR user_name ILIKE ${p})`, `%${q}%`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit);

    const result = await pool.query(
      `SELECT id, user_id, user_name, action, entity_type, entity_id, summary, detail, created_at
       FROM daily_report.activity_log
       ${where}
       ORDER BY id DESC
       LIMIT $${values.length}`,
      values
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}

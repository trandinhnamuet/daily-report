import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, getActor, logActivity } from '@/lib/activity';

/** GET /api/reports/[id]/comments — toàn bộ comment của 1 note/task, cũ → mới */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId)) {
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT c.id, c.report_id, c.user_id, c.content, c.created_at,
              COALESCE(u.name, c.user_name) AS user_name
       FROM daily_report.report_comments c
       LEFT JOIN daily_report.users u ON u.id = c.user_id
       WHERE c.report_id = $1
       ORDER BY c.id ASC`,
      [reportId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/** POST /api/reports/[id]/comments  body: { content } */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId)) {
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const { content } = await request.json();
    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Nội dung comment trống' }, { status: 400 });
    }

    const actor = await getActor();
    if (!actor.id) {
      return NextResponse.json({ error: 'Chưa chọn user' }, { status: 401 });
    }

    const reportRes = await pool.query(
      'SELECT id, message FROM daily_report.daily_report WHERE id = $1',
      [reportId]
    );
    if (reportRes.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const result = await pool.query(
      `INSERT INTO daily_report.report_comments (report_id, user_id, user_name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, report_id, user_id, user_name, content, created_at`,
      [reportId, actor.id, actor.name, trimmed]
    );

    const comment = result.rows[0];

    await logActivity({
      actor,
      action: 'comment_create',
      entityType: 'comment',
      entityId: comment.id,
      summary: `Bình luận "${excerpt(trimmed, 80)}" vào "${excerpt(reportRes.rows[0].message, 60)}"`,
      detail: { report_id: reportId, content: trimmed },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, getActor, logActivity } from '@/lib/activity';
import { fetchReactions, isAllowedEmoji } from '@/lib/interactions';

/**
 * POST /api/reports/[id]/reactions  body: { emoji }
 * Giống Messenger: mỗi người 1 cảm xúc / 1 note-task.
 * Thả lại đúng emoji đang có → gỡ bỏ; thả emoji khác → thay thế.
 */
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

    const { emoji } = await request.json();
    if (!isAllowedEmoji(emoji)) {
      return NextResponse.json({ error: 'Emoji không hợp lệ' }, { status: 400 });
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

    const existing = await pool.query(
      'SELECT emoji FROM daily_report.report_reactions WHERE report_id = $1 AND user_id = $2',
      [reportId, actor.id]
    );
    const previous: string | null = existing.rows[0]?.emoji ?? null;
    const removing = previous === emoji;

    if (removing) {
      await pool.query(
        'DELETE FROM daily_report.report_reactions WHERE report_id = $1 AND user_id = $2',
        [reportId, actor.id]
      );
    } else {
      await pool.query(
        `INSERT INTO daily_report.report_reactions (report_id, user_id, emoji)
         VALUES ($1, $2, $3)
         ON CONFLICT (report_id, user_id)
         DO UPDATE SET emoji = EXCLUDED.emoji, updated_at = CURRENT_TIMESTAMP`,
        [reportId, actor.id, emoji]
      );
    }

    const reactions = (await fetchReactions([reportId])).get(reportId) ?? [];

    await logActivity({
      actor,
      action: removing ? 'reaction_remove' : 'reaction_set',
      entityType: 'reaction',
      entityId: reportId,
      summary: removing
        ? `Gỡ cảm xúc ${emoji} khỏi "${excerpt(reportRes.rows[0].message, 80)}"`
        : `Thả cảm xúc ${emoji} vào "${excerpt(reportRes.rows[0].message, 80)}"`,
      detail: { report_id: reportId, emoji, previous },
    });

    return NextResponse.json({ reactions, my_emoji: removing ? null : emoji });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }
}

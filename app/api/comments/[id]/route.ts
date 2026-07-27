import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, getActor, logActivity } from '@/lib/activity';

/** PATCH /api/comments/[id]  body: { content } — chỉ người viết mới sửa được */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);
    if (!Number.isInteger(commentId)) {
      return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
    }

    const { content } = await request.json();
    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Nội dung comment trống' }, { status: 400 });
    }

    const actor = await getActor();
    const existing = await pool.query(
      'SELECT id, report_id, user_id, content FROM daily_report.report_comments WHERE id = $1',
      [commentId]
    );
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (existing.rows[0].user_id !== actor.id) {
      return NextResponse.json({ error: 'Chỉ người viết mới sửa được comment' }, { status: 403 });
    }

    const result = await pool.query(
      `UPDATE daily_report.report_comments
       SET content = $1
       WHERE id = $2
       RETURNING id, report_id, user_id, user_name, content, created_at`,
      [trimmed, commentId]
    );

    await logActivity({
      actor,
      action: 'update',
      entityType: 'comment',
      entityId: commentId,
      summary: `Sửa bình luận thành "${excerpt(trimmed, 80)}"`,
      detail: {
        report_id: existing.rows[0].report_id,
        before: existing.rows[0].content,
        after: trimmed,
      },
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

/** DELETE /api/comments/[id] — chỉ người viết mới xoá được */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const commentId = Number(id);
    if (!Number.isInteger(commentId)) {
      return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
    }

    const actor = await getActor();
    const existing = await pool.query(
      'SELECT id, report_id, user_id, content FROM daily_report.report_comments WHERE id = $1',
      [commentId]
    );
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (existing.rows[0].user_id !== actor.id) {
      return NextResponse.json({ error: 'Chỉ người viết mới xoá được comment' }, { status: 403 });
    }

    await pool.query('DELETE FROM daily_report.report_comments WHERE id = $1', [commentId]);

    await logActivity({
      actor,
      action: 'comment_delete',
      entityType: 'comment',
      entityId: commentId,
      summary: `Xoá bình luận "${excerpt(existing.rows[0].content, 80)}"`,
      detail: { report_id: existing.rows[0].report_id, content: existing.rows[0].content },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

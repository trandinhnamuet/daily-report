import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, getActor, logActivity } from '@/lib/activity';

// GET theo integer id đã bỏ — đọc 1 task dùng public_id qua /api/reports/by-public/[publicId]
// (tránh đoán id tuần tự). Route này chỉ còn PATCH/DELETE cho thao tác nội bộ.

const STATUS_LABEL: Record<string, string> = { note: 'Ghi chú', todo: 'Todo', done: 'Done' };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reportId = Number(id);

    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const { status } = await request.json();
    if (!['note', 'todo', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const before = await pool.query(
      'SELECT id, message, status FROM daily_report.daily_report WHERE id = $1',
      [reportId]
    );
    if (before.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    const prev = before.rows[0];

    const result = await pool.query(
      'UPDATE daily_report.daily_report SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, reportId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (prev.status !== status) {
      await logActivity({
        actor: await getActor(),
        action: 'status_change',
        entityType: 'report',
        entityId: reportId,
        summary: `Đổi trạng thái "${excerpt(prev.message, 80)}" từ ${STATUS_LABEL[prev.status] ?? prev.status} sang ${STATUS_LABEL[status] ?? status}`,
        detail: { before: prev.status, after: status },
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reportId = Number(id);

    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM daily_report.daily_report WHERE id = $1 RETURNING id, message, status, user_id',
      [reportId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const removed = result.rows[0];
    await logActivity({
      action: 'delete',
      entityType: 'report',
      entityId: reportId,
      summary: `Xoá ${removed.status === 'note' ? 'ghi chú' : 'công việc'} "${excerpt(removed.message)}"`,
      detail: { message: removed.message, status: removed.status, owner_id: removed.user_id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, getActor, logActivity } from '@/lib/activity';

// GET theo integer id đã bỏ — đọc 1 task dùng public_id qua /api/reports/by-public/[publicId]
// (tránh đoán id tuần tự). Route này chỉ còn PATCH/DELETE cho thao tác nội bộ.

const STATUS_LABEL: Record<string, string> = { note: 'Ghi chú', todo: 'Todo', done: 'Done' };

/** Tên user, dùng cho summary nhật ký */
async function userName(id: number | null): Promise<string | null> {
  if (!id) return null;
  const res = await pool.query('SELECT name FROM daily_report.users WHERE id = $1', [id]);
  return res.rows[0]?.name ?? null;
}

const asDateString = (value: unknown): string | null =>
  value ? new Date(value as string).toISOString().slice(0, 10) : null;

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

    const body = await request.json();

    const before = await pool.query(
      'SELECT id, message, status, assignee_id, deadline FROM daily_report.daily_report WHERE id = $1',
      [reportId]
    );
    if (before.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    const prev = before.rows[0];
    const actor = await getActor();

    // Status update
    if ('status' in body) {
      const { status } = body;
      if (!['note', 'todo', 'done'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const result = await pool.query(
        'UPDATE daily_report.daily_report SET status = $1 WHERE id = $2 RETURNING id, status',
        [status, reportId]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      if (prev.status !== status) {
        await logActivity({
          actor,
          action: 'status_change',
          entityType: 'report',
          entityId: reportId,
          summary: `Đổi trạng thái "${excerpt(prev.message, 80)}" từ ${STATUS_LABEL[prev.status] ?? prev.status} sang ${STATUS_LABEL[status] ?? status}`,
          detail: { before: prev.status, after: status },
        });
      }

      return NextResponse.json(result.rows[0]);
    }

    // Assignee / deadline update
    if ('assignee_id' in body || 'deadline' in body) {
      const sets: string[] = [];
      const values: (number | string | null)[] = [];

      if ('assignee_id' in body) {
        values.push(body.assignee_id ? Number(body.assignee_id) : null);
        sets.push(`assignee_id = $${values.length}`);
      }
      if ('deadline' in body) {
        values.push(body.deadline || null);
        sets.push(`deadline = $${values.length}`);
      }

      values.push(reportId);
      const result = await pool.query(
        `UPDATE daily_report.daily_report SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, assignee_id, deadline`,
        values
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      // Resolve assignee name
      let assignee_name: string | null = null;
      if (result.rows[0].assignee_id) {
        const ar = await pool.query('SELECT name FROM daily_report.users WHERE id = $1', [result.rows[0].assignee_id]);
        assignee_name = ar.rows[0]?.name ?? null;
      }

      if ('assignee_id' in body && prev.assignee_id !== result.rows[0].assignee_id) {
        const previousName = await userName(prev.assignee_id);
        await logActivity({
          actor,
          action: 'assignee_change',
          entityType: 'report',
          entityId: reportId,
          summary: `Đổi người nhận của "${excerpt(prev.message, 80)}" từ ${previousName ?? 'trống'} sang ${assignee_name ?? 'trống'}`,
          detail: { before: prev.assignee_id, after: result.rows[0].assignee_id, before_name: previousName, after_name: assignee_name },
        });
      }

      if ('deadline' in body) {
        const beforeDeadline = asDateString(prev.deadline);
        const afterDeadline = asDateString(result.rows[0].deadline);
        if (beforeDeadline !== afterDeadline) {
          await logActivity({
            actor,
            action: 'deadline_change',
            entityType: 'report',
            entityId: reportId,
            summary: `Đổi deadline của "${excerpt(prev.message, 80)}" từ ${beforeDeadline ?? 'trống'} sang ${afterDeadline ?? 'trống'}`,
            detail: { before: beforeDeadline, after: afterDeadline },
          });
        }
      }

      return NextResponse.json({ ...result.rows[0], assignee_name });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
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

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET theo integer id đã bỏ — đọc 1 task dùng public_id qua /api/reports/by-public/[publicId]
// (tránh đoán id tuần tự). Route này chỉ còn PATCH/DELETE cho thao tác nội bộ.

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
      'DELETE FROM daily_report.daily_report WHERE id = $1 RETURNING id',
      [reportId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}

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

    const { status } = await request.json();
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

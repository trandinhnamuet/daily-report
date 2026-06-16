import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    const result = await pool.query(
      `SELECT dr.id, dr.public_id, dr.message, dr.created_at, dr.status, dr.deadline,
              u.name AS user_name, u.id AS user_id,
              a.id AS assignee_id, a.name AS assignee_name
       FROM daily_report.daily_report dr
       JOIN daily_report.users u ON dr.user_id = u.id
       LEFT JOIN daily_report.users a ON dr.assignee_id = a.id
       WHERE dr.public_id = $1`,
      [publicId]
    );

    if (result.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

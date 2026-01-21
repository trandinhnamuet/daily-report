import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return NextResponse.json(
      { error: 'invalid user id' },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        device_id,
        MIN(logged_in_at) AS first_seen_at,
        MAX(logged_in_at) AS last_seen_at
      FROM security.device_login_logs
      WHERE user_id = $1
      GROUP BY device_id
      ORDER BY last_seen_at DESC
      `,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/users/[id]/devices error:', err);
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT 
        dr.id,
        dr.message,
        dr.created_at,
        u.name AS user_name,
        u.id AS user_id
      FROM daily_report.daily_report dr
      JOIN daily_report.users u ON dr.user_id = u.id
      ORDER BY dr.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    const cookieStore = cookies();
    const reporterId = (await cookieStore).get('reporter_id')?.value;

    if (!reporterId || !message?.trim()) {
      return NextResponse.json({ error: 'Missing reporter or message' }, { status: 400 });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO daily_report.daily_report (user_id, message)
      VALUES ($1, $2)
      RETURNING id, user_id, message, created_at
    `,
      [Number(reporterId), message.trim()]
    );

    const userResult = await pool.query(
      'SELECT name FROM daily_report.users WHERE id = $1',
      [Number(reporterId)]
    );

    return NextResponse.json(
      {
        ...insertResult.rows[0],
        user_name: userResult.rows[0]?.name,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const beforeId = searchParams.get('before_id');
    const userId = searchParams.get('user_id');
    const date = searchParams.get('date');

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (beforeId) {
      conditions.push(`dr.id < $${values.length + 1}`);
      values.push(parseInt(beforeId));
    }
    if (userId) {
      conditions.push(`dr.user_id = $${values.length + 1}`);
      values.push(parseInt(userId));
    }
    if (date) {
      conditions.push(`dr.created_at::date = $${values.length + 1}::date`);
      values.push(date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const isFiltered = !!(userId || date);

    values.push(isFiltered ? 1000 : limit);
    const limitParam = `$${values.length}`;

    const result = await pool.query(
      `
      SELECT
        dr.id,
        dr.message,
        dr.created_at,
        dr.status,
        u.name AS user_name,
        u.id AS user_id
      FROM daily_report.daily_report dr
      JOIN daily_report.users u ON dr.user_id = u.id
      ${where}
      ORDER BY dr.id DESC
      LIMIT ${limitParam}
    `,
      values
    );

    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, message } = await request.json();
if (!user_id || !message?.trim()) {
  return NextResponse.json(
    { error: 'Missing user or message' },
    { status: 400 }
  );
}

const insertResult = await pool.query(
  `
  INSERT INTO daily_report.daily_report (user_id, message)
  VALUES ($1, $2)
  RETURNING id, user_id, message, created_at, status
`,
  [Number(user_id), message.trim()]
);


    const userResult = await pool.query(
  'SELECT name FROM daily_report.users WHERE id = $1',
  [Number(user_id)]
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

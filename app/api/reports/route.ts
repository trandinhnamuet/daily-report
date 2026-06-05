import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const assigneeId = searchParams.get('assignee_id');

    const conditions: string[] = [];
    const values: (string | number)[] = [limit, offset];

    if (assigneeId && assigneeId !== 'all') {
      conditions.push(`dr.assignee_id = $${values.length + 1}`);
      values.push(Number(assigneeId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        dr.id,
        dr.message,
        dr.created_at,
        dr.status,
        dr.deadline,
        u.name AS user_name,
        u.id AS user_id,
        a.id AS assignee_id,
        a.name AS assignee_name
      FROM daily_report.daily_report dr
      JOIN daily_report.users u ON dr.user_id = u.id
      LEFT JOIN daily_report.users a ON dr.assignee_id = a.id
      ${where}
      ORDER BY dr.created_at DESC
      LIMIT $1 OFFSET $2
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
    const { user_id, message, assignee_id, deadline } = await request.json();
if (!user_id || !message?.trim()) {
  return NextResponse.json(
    { error: 'Missing user or message' },
    { status: 400 }
  );
}

const insertResult = await pool.query(
  `
  INSERT INTO daily_report.daily_report (user_id, message, assignee_id, deadline)
  VALUES ($1, $2, $3, $4)
  RETURNING id, user_id, message, created_at, status, assignee_id, deadline
`,
  [Number(user_id), message.trim(), assignee_id ? Number(assignee_id) : null, deadline || null]
);


    const userResult = await pool.query(
  'SELECT name FROM daily_report.users WHERE id = $1',
  [Number(user_id)]
);

    let assignee_name: string | null = null;
    if (assignee_id) {
      const assigneeResult = await pool.query(
        'SELECT name FROM daily_report.users WHERE id = $1',
        [Number(assignee_id)]
      );
      assignee_name = assigneeResult.rows[0]?.name ?? null;
    }

    return NextResponse.json(
      {
        ...insertResult.rows[0],
        user_name: userResult.rows[0]?.name,
        assignee_name,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

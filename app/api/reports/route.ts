import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import pool from '../../../lib/db';
import type { QueryResult } from 'pg';

// public_id ngắn 8 ký tự hex, sinh ở tầng app để có thể retry khi trùng
const genPublicId = () => randomBytes(4).toString('hex');

const isUniqueViolation = (e: unknown) =>
  !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === '23505';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const beforeId = searchParams.get('before_id');
    const userId = searchParams.get('user_id');
    const date = searchParams.get('date');
    const assigneeId = searchParams.get('assignee_id');

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
    if (assigneeId && assigneeId !== 'all') {
      conditions.push(`dr.assignee_id = $${values.length + 1}`);
      values.push(Number(assigneeId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const isFiltered = !!(userId || date || assigneeId);

    values.push(isFiltered ? 1000 : limit);
    const limitParam = `$${values.length}`;

    const result = await pool.query(
      `
      SELECT
        dr.id,
        dr.public_id,
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
    const { user_id, message, assignee_id, deadline } = await request.json();
if (!user_id || !message?.trim()) {
  return NextResponse.json(
    { error: 'Missing user or message' },
    { status: 400 }
  );
}

// Sinh public_id ở app + retry nếu trùng (unique violation 23505)
let insertResult: QueryResult | undefined;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    insertResult = await pool.query(
      `
      INSERT INTO daily_report.daily_report (user_id, message, assignee_id, deadline, public_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, public_id, user_id, message, created_at, status, assignee_id, deadline
    `,
      [Number(user_id), message.trim(), assignee_id ? Number(assignee_id) : null, deadline || null, genPublicId()]
    );
    break;
  } catch (e) {
    if (isUniqueViolation(e) && attempt < 4) continue; // trùng public_id → sinh lại
    throw e;
  }
}
if (!insertResult) throw new Error('Failed to insert report');


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

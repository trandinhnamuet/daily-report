import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const { username } = await req.json();

  const result = await pool.query(
    `SELECT id, name, password FROM daily_report.users WHERE name = $1`,
    [username]
  );

  if (!result.rows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = result.rows[0];

  return NextResponse.json({
    id: user.id,
    name: user.name,
    hasPassword: !!user.password,
  });
}

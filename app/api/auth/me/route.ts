import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const cookieStore = cookies();

  const id = (await cookieStore).get('current_user_id')?.value;
  const name = (await cookieStore).get('current_user_name')?.value;

  if (!id || !name) {
    return NextResponse.json(null, { status: 401 });
  }

  // ✅ DÙNG ĐÚNG SCHEMA + TABLE
  const { rows } = await pool.query(
    `SELECT id, name
     FROM "daily_report"."users"
     WHERE id = $1`,
    [Number(id)]
  );

  if (rows.length === 0) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json(rows[0]);
}

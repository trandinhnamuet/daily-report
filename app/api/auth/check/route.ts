import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/auth/check
 * Body: { name: string }
 * Response:
 *  - { exists: false }
 *  - { exists: true, hasPassword: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body?.name?.trim();

    // ❌ thiếu name
    if (!name) {
      return NextResponse.json(
        { error: 'Missing user name' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT id, password
      FROM daily_report.users
      WHERE name = $1
      LIMIT 1
      `,
      [name]
    );

    // ❌ không tồn tại user
    if (result.rowCount === 0) {
      return NextResponse.json({
        exists: false,
      });
    }

    const user = result.rows[0];

    return NextResponse.json({
      exists: true,
      hasPassword: !!user.password,
    });
  } catch (error) {
    console.error('AUTH CHECK ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
}

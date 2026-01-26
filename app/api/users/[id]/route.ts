import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

/* ================= UTILS ================= */
const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex');

/**
 * PUT /api/users/[id]
 * - Update name
 * - Update password (yêu cầu mật khẩu cũ)
 * - Logout toàn bộ thiết bị nếu đổi mật khẩu
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    // 👇 Nhận đủ field
    const { name, password, oldPassword } = await request.json();
    const trimmedName = name?.trim();

    if (!trimmedName && !password) {
      return NextResponse.json(
        { error: 'Nothing to update' },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu không hợp lệ' },
        { status: 400 }
      );
    }

    /* ===== CHECK MẬT KHẨU CŨ NẾU ĐỔI PASSWORD ===== */
    if (password) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: 'Thiếu mật khẩu cũ' },
          { status: 400 }
        );
      }

      const check = await pool.query(
        `SELECT password FROM daily_report.users WHERE id = $1`,
        [userId]
      );

      if (check.rowCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (sha256(oldPassword) !== check.rows[0].password) {
        return NextResponse.json(
          { error: 'Mật khẩu cũ không đúng' },
          { status: 401 }
        );
      }
    }

    /* ===== BUILD UPDATE QUERY ===== */
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (trimmedName) {
      fields.push(`name = $${idx++}`);
      values.push(trimmedName);
    }

    let changedPassword = false;

    if (password) {
      fields.push(`password = $${idx++}`);
      values.push(sha256(password));
      changedPassword = true;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await pool.query(
      `
      UPDATE daily_report.users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, created_at, updated_at
      `,
      [...values, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    /* ===== LOGOUT TOÀN BỘ THIẾT BỊ NẾU ĐỔI MẬT KHẨU ===== */
    if (changedPassword) {
      await pool.query(
        `DELETE FROM user_devices WHERE user_id = $1`,
        [userId]
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const reporterId = request.cookies.get('reporter_id')?.value;

    const result = await pool.query(
      `
      DELETE FROM daily_report.users
      WHERE id = $1
      RETURNING id, name
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      user: result.rows[0],
    });

    if (reporterId === userId.toString()) {
      response.cookies.set('reporter_id', '', { path: '/', maxAge: 0 });
      response.cookies.set('reporter_name', '', { path: '/', maxAge: 0 });
    }

    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

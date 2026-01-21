import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { user_id, old_password, new_password } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `SELECT password FROM daily_report.users WHERE id = $1`,
      [user_id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 });
    }

    const currentPassword = rows[0].password;

    // Nếu đã có mật khẩu → bắt buộc nhập mật khẩu cũ
    if (currentPassword) {
      if (!old_password) {
        return NextResponse.json(
          { error: 'missing old password' },
          { status: 400 }
        );
      }

      const ok = await bcrypt.compare(old_password, currentPassword);
      if (!ok) {
        return NextResponse.json(
          { error: 'wrong old password' },
          { status: 401 }
        );
      }
    }

    // new_password rỗng → xoá mật khẩu
    if (!new_password) {
      await client.query(
        `UPDATE daily_report.users SET password = NULL WHERE id = $1`,
        [user_id]
      );
    } else {
      const hash = await bcrypt.hash(new_password, 10);
      await client.query(
        `UPDATE daily_report.users SET password = $1 WHERE id = $2`,
        [hash, user_id]
      );
    }

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}

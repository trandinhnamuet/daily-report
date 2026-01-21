import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { user_id, password, device_id } = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { error: 'Missing user_id' },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      'SELECT id, name, password FROM daily_report.users WHERE id = $1',
      [user_id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = rows[0];

    /* ================= PASSWORD LOGIC ================= */
    const rawPassword = password ?? '';

    const hasPassword =
      user.password !== null &&
      typeof user.password === 'string' &&
      user.password.trim() !== '';

    if (!hasPassword) {
      // 🆕 CHƯA CÓ PASSWORD → SET MỚI (CHO PHÉP RỖNG NẾU MUỐN)
      if (rawPassword.trim() !== '') {
        const hashed = await bcrypt.hash(rawPassword, 10);

        await client.query(
          'UPDATE daily_report.users SET password = $1 WHERE id = $2',
          [hashed, user_id]
        );
      }
    } else {
      // 🔐 ĐÃ CÓ PASSWORD → VERIFY
      const ok = await bcrypt.compare(rawPassword, user.password);
      if (!ok) {
        return NextResponse.json(
          { error: 'Sai mật khẩu' },
          { status: 401 }
        );
      }
    }

    /* ================= DEVICE LOG ================= */
    if (device_id) {
      await client.query(
        `
        INSERT INTO security.devices (id, last_seen_at)
        VALUES ($1, NOW())
        ON CONFLICT (id)
        DO UPDATE SET last_seen_at = NOW()
        `,
        [device_id]
      );

      await client.query(
        `
        INSERT INTO security.device_login_logs (device_id, user_id)
        VALUES ($1, $2)
        `,
        [device_id, user_id]
      );
    }

    /* ================= RESPONSE ================= */
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name },
      first_login: !hasPassword,
    });

    res.cookies.set('current_user_id', String(user.id), {
      path: '/',
      httpOnly: false,
    });

    res.cookies.set(
      'current_user_name',
      encodeURIComponent(user.name),
      {
        path: '/',
        httpOnly: false,
      }
    );

    return res;
  } finally {
    client.release();
  }
}

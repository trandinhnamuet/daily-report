import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

/* ================= UTILS ================= */
const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex');

/**
 * POST /api/auth/login
 */
export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: 'Thiếu thông tin đăng nhập' },
        { status: 400 }
      );
    }

    /* ================= 1️⃣ TÌM USER ================= */
    const result = await pool.query(
      `
      SELECT id, name, password
      FROM daily_report.users
      WHERE name = $1
      LIMIT 1
      `,
      [name.trim()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    /* ================= 2️⃣ CHECK PASSWORD ================= */
    const hashedInput = sha256(password);

    if (hashedInput !== user.password) {
      return NextResponse.json(
        { error: 'Sai mật khẩu' },
        { status: 401 }
      );
    }

    /* ================= 3️⃣ DEVICE ================= */
    const deviceId =
      req.cookies.get('device_id')?.value || randomUUID();

    const deviceName =
      req.headers.get('user-agent') || 'Unknown';

    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'Unknown';

    await pool.query(
      `
      INSERT INTO user_devices (user_id, device_id, device_name, ip_address)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, device_id)
      DO UPDATE SET last_login_at = NOW()
      `,
      [user.id, deviceId, deviceName, ipAddress]
    );

    /* ================= 4️⃣ RESPONSE + COOKIE ================= */
    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
      },
    });

    res.cookies.set('reporter_id', String(user.id), {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set('reporter_name', user.name, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set('device_id', deviceId, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return NextResponse.json(
      { error: 'Đăng nhập thất bại' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { device_id, user_id } = await req.json();

    if (!device_id || !user_id) {
      return NextResponse.json(
        { error: 'missing data' },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers
        .get('x-forwarded-for')
        ?.split(',')[0]
        ?.trim() || null;

    const userAgent = req.headers.get('user-agent');

    /* =========================
       UPSERT DEVICE
    ========================= */
    await pool.query(
      `
      INSERT INTO security.devices (id, user_agent)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET 
        last_seen_at = NOW(),
        user_agent = EXCLUDED.user_agent
      `,
      [device_id, userAgent]
    );

    /* =========================
       LOG LOGIN
    ========================= */
    await pool.query(
      `
      INSERT INTO security.device_login_logs
        (device_id, user_id, ip_address)
      VALUES ($1, $2, $3)
      `,
      [device_id, user_id, ipAddress]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('device-log error:', error);
    return NextResponse.json(
      { error: 'server error' },
      { status: 500 }
    );
  }
}

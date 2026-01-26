import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    // API danh sách: luôn trả JSON
    if (Number.isNaN(userId)) {
      return NextResponse.json([]);
    }

    const { rows } = await pool.query(
        `
        SELECT 
          device_id,
          device_name,
          last_login_at
        FROM public.user_devices
        WHERE user_id = $1
        ORDER BY last_login_at DESC
        `,
        [userId]
      );

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET DEVICES ERROR:', err);
    return NextResponse.json([]);
  }
}

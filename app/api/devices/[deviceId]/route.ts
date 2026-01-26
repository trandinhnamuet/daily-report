import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    // ✅ BẮT BUỘC await
    const { deviceId } = await context.params;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM public.user_devices
      WHERE device_id = $1
      `,
      [deviceId]
    );

    return NextResponse.json({
      success: true,
      deleted: result.rowCount,
    });
  } catch (err) {
    console.error('DELETE DEVICE ERROR:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

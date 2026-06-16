import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const expected = process.env.APP_PASSWORD;

    // Nếu chưa cấu hình mật khẩu thì coi như mở (không khoá)
    if (!expected) return NextResponse.json({ ok: true });

    return NextResponse.json({ ok: typeof password === 'string' && password === expected });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

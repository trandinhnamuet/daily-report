import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  getExpectedPassword,
  isValidPassword,
  isValidToken,
  makeToken,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

// GET: kiểm tra phiên hiện tại bằng cookie — client không cần giữ mật khẩu nữa.
export async function GET(request: NextRequest) {
  const expected = getExpectedPassword();
  if (!expected) return NextResponse.json({ ok: true });

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  return NextResponse.json({ ok: isValidToken(token, expected) });
}

// POST: xác thực mật khẩu, đúng thì cấp cookie dài hạn.
export async function POST(request: NextRequest) {
  const expected = getExpectedPassword();
  if (!expected) return NextResponse.json({ ok: true });

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isValidPassword(password, expected)) {
    const res = NextResponse.json({ ok: false });
    res.cookies.set(AUTH_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return res;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, makeToken(expected), { ...cookieOptions, maxAge: AUTH_MAX_AGE });
  return res;
}

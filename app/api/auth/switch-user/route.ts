import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { id, name } = await req.json();

  const res = NextResponse.json({ success: true });

  res.cookies.set('current_user_id', String(id), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  res.cookies.set('current_user_name', encodeURIComponent(name), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  return res;
}

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  (await cookies()).set('current_user_id', '', { maxAge: 0, path: '/' });
  (await cookies()).set('current_user_name', '', { maxAge: 0, path: '/' });

  return NextResponse.json({ success: true });
}

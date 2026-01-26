'use client'

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json(
        { message: 'Thiếu thông tin đăng nhập' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, name, password FROM daily_report.users WHERE name = $1`,
      [name]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: 'User không tồn tại' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // ⚠️ LẦN ĐẦU: CHƯA CÓ MẬT KHẨU
    if (!user.password) {
      return NextResponse.json(
        { firstTime: true },
        { status: 200 }
      );
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return NextResponse.json(
        { message: 'Mật khẩu sai' },
        { status: 401 }
      );
    }

    // ✅ ĐĂNG NHẬP THÀNH CÔNG → SET COOKIE + TRẢ USER
    const response = NextResponse.json({
      id: user.id,
      name: user.name,
    });

    response.cookies.set('current_user_id', String(user.id), {
      path: '/',
      httpOnly: false, // 👈 frontend đang đọc cookie
      maxAge: 60 * 60 * 24 * 30, // 30 ngày
    });

    response.cookies.set('current_user_name', user.name, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return NextResponse.json(
      { message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

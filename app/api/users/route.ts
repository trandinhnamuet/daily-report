import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { logActivity } from '@/lib/activity';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM daily_report.users ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO daily_report.users (name) VALUES ($1) RETURNING *',
      [name]
    );

    await logActivity({
      action: 'create',
      entityType: 'user',
      entityId: result.rows[0].id,
      summary: `Thêm user "${result.rows[0].name}"`,
      detail: { name: result.rows[0].name },
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'User with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
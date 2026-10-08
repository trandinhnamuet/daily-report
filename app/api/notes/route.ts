import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { excerpt, logActivity } from '@/lib/activity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        id,
        note,
        created_at
      FROM daily_report.notes
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { note, created_at } = await request.json();

    if (!note) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    // Ghi chú viết lúc offline được gửi kèm giờ viết thật; không nhận giờ tương lai
    const writtenAt = typeof created_at === 'string' ? new Date(created_at) : null;
    const createdAt = writtenAt && !isNaN(writtenAt.getTime()) && writtenAt.getTime() <= Date.now()
      ? writtenAt.toISOString()
      : null;

    const result = await pool.query(`
      INSERT INTO daily_report.notes (user_id, note, created_at)
      VALUES (0, $1, COALESCE($2::timestamptz, now()))
      RETURNING id, user_id, note, created_at
    `, [note, createdAt]);

    await logActivity({
      action: 'create',
      entityType: 'note',
      entityId: result.rows[0].id,
      summary: `Thêm ghi chú "${excerpt(note)}"`,
      detail: { note },
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
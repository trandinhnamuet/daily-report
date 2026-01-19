import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * PUT /api/users/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const { name } = await request.json();
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE daily_report.users
      SET name = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, created_at, updated_at
      `,
      [trimmedName, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'User with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const reporterId = request.cookies.get('reporter_id')?.value;

    const result = await pool.query(
      `
      DELETE FROM daily_report.users
      WHERE id = $1
      RETURNING id, name
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      user: result.rows[0],
    });

    // Nếu xoá đúng reporter hiện tại → clear cookie
    if (reporterId === userId.toString()) {
      response.cookies.set('reporter_id', '', { path: '/', maxAge: 0 });
      response.cookies.set('reporter_name', '', { path: '/', maxAge: 0 });
    }

    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

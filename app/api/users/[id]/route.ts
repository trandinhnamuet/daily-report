import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function PUT(request: NextRequest, context: any) {
  try {
    const { name } = await request.json();
    const { id } = context.params;
    console.log('PUT /api/users/[id] - id:', id, 'name:', name);
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name, Number(id)]
    );
    console.log('Update result:', result.rows);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
  const { id } = context.params;
    
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [Number(id)]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
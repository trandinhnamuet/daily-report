import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);

  const result = await pool.query(
    'SELECT id, name FROM daily_report.users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result.rows[0]);
}
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { name } = await req.json();

  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  const { id } = await params;
  const userId = Number(id);

  const result = await pool.query(
    'UPDATE daily_report.users SET name = $1 WHERE id = $2 RETURNING id, name',
    [name, userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    const result = await pool.query(
      'DELETE FROM daily_report.users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE USER ERROR:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

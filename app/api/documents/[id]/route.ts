import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const docId = Number(id);

    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document id' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM daily_report.documents WHERE id = $1 RETURNING id',
      [docId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, logActivity } from '@/lib/activity';

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
      'DELETE FROM daily_report.documents WHERE id = $1 RETURNING id, detail',
      [docId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await logActivity({
      action: 'delete',
      entityType: 'document',
      entityId: docId,
      summary: `Xoá tài liệu "${excerpt(result.rows[0].detail)}"`,
      detail: { detail: result.rows[0].detail },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

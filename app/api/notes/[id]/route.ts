import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { excerpt, logActivity } from '@/lib/activity';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const noteId = Number(id);

    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note id' }, { status: 400 });
    }

    const { note } = await request.json();
    if (typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    const before = await pool.query(
      'SELECT note FROM daily_report.notes WHERE id = $1',
      [noteId]
    );
    if (before.rowCount === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const result = await pool.query(
      'UPDATE daily_report.notes SET note = $1 WHERE id = $2 RETURNING id, note, created_at',
      [note, noteId]
    );

    if (before.rows[0].note !== note) {
      await logActivity({
        action: 'update',
        entityType: 'note',
        entityId: noteId,
        summary: `Sửa ghi chú "${excerpt(note)}"`,
        detail: { before: before.rows[0].note, after: note },
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const noteId = Number(id);

    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note id' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM daily_report.notes WHERE id = $1 RETURNING id, note',
      [noteId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await logActivity({
      action: 'delete',
      entityType: 'note',
      entityId: noteId,
      summary: `Xoá ghi chú "${excerpt(result.rows[0].note)}"`,
      detail: { note: result.rows[0].note },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getActor, logActivity } from '@/lib/activity';
import { fetchReaders, type Reader } from '@/lib/interactions';

/**
 * POST /api/reports/reads  body: { ids: number[] }
 * Đánh dấu đã đọc hàng loạt (client gom các message vừa lướt qua màn hình).
 * Note/task do chính mình tạo thì bỏ qua — chỉ quan tâm ai đọc bài của người khác.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = Array.isArray(body?.ids)
      ? Array.from(
          new Set(
            body.ids
              .map((value: unknown) => Number(value))
              .filter((value: number) => Number.isInteger(value) && value > 0)
          )
        ).slice(0, 200) as number[]
      : [];

    if (!ids.length) return NextResponse.json({});

    const actor = await getActor();
    if (!actor.id) return NextResponse.json({});

    const inserted = await pool.query(
      `INSERT INTO daily_report.report_reads (report_id, user_id)
       SELECT dr.id, $2
       FROM daily_report.daily_report dr
       WHERE dr.id = ANY($1::int[]) AND dr.user_id <> $2
       ON CONFLICT (report_id, user_id) DO NOTHING
       RETURNING report_id`,
      [ids, actor.id]
    );

    // Chỉ ghi nhật ký lần đọc đầu tiên → tối đa 1 dòng cho mỗi (người, note/task)
    for (const row of inserted.rows) {
      await logActivity({
        actor,
        action: 'read',
        entityType: 'report',
        entityId: row.report_id,
        summary: `Đã đọc note/task #${row.report_id}`,
        detail: { report_id: row.report_id },
      });
    }

    const readers = await fetchReaders(ids);
    const payload: Record<number, Reader[]> = {};
    for (const id of ids) payload[id] = readers.get(id) ?? [];

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error marking reports read:', error);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
  }
}

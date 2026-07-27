import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCommentCounts,
  fetchReactions,
  fetchReaders,
  parseIdList,
  type InteractionSummary,
} from '@/lib/interactions';

/**
 * GET /api/reports/interactions?ids=1,2,3
 * Trả về cảm xúc + người đã đọc + số comment cho nhiều note/task trong 1 request,
 * để danh sách 50 message không bắn 50 request lẻ.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = parseIdList(searchParams.get('ids'));

    if (!ids.length) return NextResponse.json({});

    const [reactions, readers, commentCounts] = await Promise.all([
      fetchReactions(ids),
      fetchReaders(ids),
      fetchCommentCounts(ids),
    ]);

    const payload: Record<number, InteractionSummary> = {};
    for (const id of ids) {
      payload[id] = {
        reactions: reactions.get(id) ?? [],
        readers: readers.get(id) ?? [],
        comment_count: commentCounts.get(id) ?? 0,
      };
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}

'use client';

import { useSyncExternalStore } from 'react';

export interface ReactionUser { id: number; name: string; }
export interface ReactionGroup { emoji: string; count: number; users: ReactionUser[]; }
export interface Reader { id: number; name: string; read_at: string; }

export interface InteractionSummary {
  reactions: ReactionGroup[];
  readers: Reader[];
  comment_count: number;
}

export const EMPTY_SUMMARY: InteractionSummary = Object.freeze({
  reactions: [],
  readers: [],
  comment_count: 0,
});

/**
 * Store nhỏ dùng chung cho mọi ChatMessage đang hiển thị.
 * Mỗi message tự đăng ký id của nó, store gom lại thành 1 request duy nhất
 * (thay vì 50 message = 50 request).
 */
const cache = new Map<number, InteractionSummary>();
const listeners = new Map<number, Set<() => void>>();

const pendingFetch = new Set<number>();
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const pendingReads = new Set<number>();
let readTimer: ReturnType<typeof setTimeout> | null = null;

const FETCH_DEBOUNCE_MS = 60;
const READ_DEBOUNCE_MS = 1200;
const CHUNK = 100;

function notify(reportId: number) {
  listeners.get(reportId)?.forEach(cb => cb());
}

function setSummary(reportId: number, summary: InteractionSummary) {
  cache.set(reportId, summary);
  notify(reportId);
}

export function getSummary(reportId: number): InteractionSummary {
  return cache.get(reportId) ?? EMPTY_SUMMARY;
}

function patchSummary(reportId: number, patch: Partial<InteractionSummary>) {
  setSummary(reportId, { ...getSummary(reportId), ...patch });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function flushFetch() {
  fetchTimer = null;
  const ids = [...pendingFetch];
  pendingFetch.clear();
  if (!ids.length) return;

  for (const group of chunk(ids, CHUNK)) {
    try {
      const res = await fetch(`/api/reports/interactions?ids=${group.join(',')}`);
      if (!res.ok) continue;
      const data: Record<string, InteractionSummary> = await res.json();
      for (const id of group) setSummary(id, data[id] ?? EMPTY_SUMMARY);
    } catch { /* giữ nguyên dữ liệu cũ */ }
  }
}

function scheduleFetch() {
  if (fetchTimer) return;
  fetchTimer = setTimeout(flushFetch, FETCH_DEBOUNCE_MS);
}

/** Tải (hoặc tải lại) dữ liệu tương tác của các note/task */
export function refreshInteractions(reportIds: number[]) {
  reportIds.forEach(id => pendingFetch.add(id));
  scheduleFetch();
}

export function subscribeInteractions(reportId: number, cb: () => void): () => void {
  let set = listeners.get(reportId);
  if (!set) {
    set = new Set();
    listeners.set(reportId, set);
  }
  set.add(cb);

  if (!cache.has(reportId)) refreshInteractions([reportId]);

  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(reportId);
  };
}

export function useInteractions(reportId: number): InteractionSummary {
  return useSyncExternalStore(
    cb => subscribeInteractions(reportId, cb),
    () => getSummary(reportId),
    () => EMPTY_SUMMARY
  );
}

/** Thả / gỡ cảm xúc. Trả về emoji hiện tại của mình (null nếu vừa gỡ). */
export async function toggleReaction(reportId: number, emoji: string): Promise<string | null> {
  const res = await fetch(`/api/reports/${reportId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error('reaction failed');

  const data: { reactions: ReactionGroup[]; my_emoji: string | null } = await res.json();
  patchSummary(reportId, { reactions: data.reactions });
  return data.my_emoji;
}

/** Cập nhật số comment tại chỗ sau khi thêm/xoá, khỏi phải fetch lại cả cụm */
export function adjustCommentCount(reportId: number, delta: number) {
  const current = getSummary(reportId).comment_count;
  patchSummary(reportId, { comment_count: Math.max(0, current + delta) });
}

async function flushReads() {
  readTimer = null;
  const ids = [...pendingReads];
  pendingReads.clear();
  if (!ids.length) return;

  try {
    const res = await fetch('/api/reports/reads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return;
    const data: Record<string, Reader[]> = await res.json();
    for (const id of ids) {
      if (data[id]) patchSummary(id, { readers: data[id] });
    }
  } catch { /* lần lướt sau sẽ thử lại */ }
}

/** Đánh dấu đã đọc — gom nhiều message lướt qua trong ~1s thành 1 request */
export function markRead(reportId: number) {
  pendingReads.add(reportId);
  if (readTimer) return;
  readTimer = setTimeout(flushReads, READ_DEBOUNCE_MS);
}

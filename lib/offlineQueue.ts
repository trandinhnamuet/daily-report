'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hàng đợi offline dùng chung cho ghi chú, tài liệu và công việc.
 *
 * Mọi thao tác ghi (tạo/sửa/xoá) được lưu vào outbox trong localStorage rồi
 * mới gửi lên server. Mất mạng thì thao tác nằm chờ, có mạng lại thì tự đẩy
 * lên theo đúng thứ tự. Bản ghi tạo lúc offline mang id âm tạm thời, được đổi
 * sang id thật khi server trả về.
 */
export type Kind = 'note' | 'document' | 'report';

export type Op =
  | { kind: Kind; type: 'create'; id: number; body: Record<string, unknown>; created_at: string }
  | { kind: Kind; type: 'update'; id: number; body: Record<string, unknown> }
  | { kind: Kind; type: 'delete'; id: number };

export const API_BASE: Record<Kind, string> = {
  note: '/api/notes',
  document: '/api/documents',
  report: '/api/reports',
};

const OUTBOX_KEY = 'offline_outbox';
const LEGACY_NOTES_OUTBOX_KEY = 'notes_outbox';
const RETRY_MS = 30_000;

export const readStored = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
};
export const writeStored = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* đầy bộ nhớ / private mode */ }
};

interface State { outbox: Op[]; online: boolean; syncing: boolean; }

let state: State = { outbox: [], online: true, syncing: false };
let initialized = false;
const listeners = new Set<() => void>();
const syncedListeners = new Set<(op: Op, data: unknown) => void>();
const idleListeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('outbox' in patch) writeStored(OUTBOX_KEY, state.outbox);
  listeners.forEach(cb => cb());
}

// Tab khác cũng có thể sửa outbox → luôn đọc lại từ localStorage trước khi đụng vào
const freshOutbox = (): Op[] => readStored<Op[]>(OUTBOX_KEY, state.outbox);

/** Chuyển outbox ghi chú của bản trước sang outbox chung */
function migrateLegacyNotes(): Op[] {
  type LegacyOp =
    | { type: 'create'; id: number; note: string; created_at: string }
    | { type: 'update'; id: number; note: string }
    | { type: 'delete'; id: number };
  const legacy = readStored<LegacyOp[]>(LEGACY_NOTES_OUTBOX_KEY, []);
  try { localStorage.removeItem(LEGACY_NOTES_OUTBOX_KEY); } catch { /* ignore */ }
  return legacy.map((o): Op =>
    o.type === 'create' ? { kind: 'note', type: 'create', id: o.id, body: { note: o.note }, created_at: o.created_at }
    : o.type === 'update' ? { kind: 'note', type: 'update', id: o.id, body: { note: o.note } }
    : { kind: 'note', type: 'delete', id: o.id });
}

export function initOfflineQueue() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const legacy = migrateLegacyNotes();
  state = { outbox: [...readStored<Op[]>(OUTBOX_KEY, []), ...legacy], online: navigator.onLine, syncing: false };
  if (legacy.length) writeStored(OUTBOX_KEY, state.outbox);

  window.addEventListener('online', () => { setState({ online: true }); syncOffline(); });
  window.addEventListener('offline', () => setState({ online: false }));
  window.addEventListener('storage', e => {
    if (e.key === OUTBOX_KEY) setState({ outbox: readStored<Op[]>(OUTBOX_KEY, []) });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncOffline();
  });
  setInterval(() => { if (state.outbox.length) syncOffline(); }, RETRY_MS);
}

export function subscribeQueue(cb: () => void) {
  initOfflineQueue();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Gọi sau mỗi thao tác gửi thành công (create kèm bản ghi server trả về) */
export function onSynced(cb: (op: Op, data: unknown) => void) {
  syncedListeners.add(cb);
  return () => { syncedListeners.delete(cb); };
}

/** Gọi khi outbox đã trống sau một lượt đồng bộ → lúc tải lại danh sách */
export function onIdle(cb: () => void) {
  idleListeners.add(cb);
  return () => { idleListeners.delete(cb); };
}

export const pendingOps = (kind: Kind): Op[] => {
  initOfflineQueue();
  return state.outbox.filter(o => o.kind === kind);
};
/** Tham chiếu outbox hiện tại — đổi tham chiếu khi outbox đổi */
export const getOutbox = (): Op[] => state.outbox;

let tempSeq = 0;
export const tempId = () => -(Date.now() * 100 + (tempSeq++ % 100));

function enqueue(op: Op) {
  initOfflineQueue();
  setState({ outbox: [...freshOutbox(), op] });
  syncOffline();
}

/** Xếp hàng tạo mới, trả về id tạm (âm) */
export function queueCreate(kind: Kind, body: Record<string, unknown>, created_at = new Date().toISOString()) {
  const id = tempId();
  enqueue({ kind, type: 'create', id, body, created_at });
  return id;
}

export function queueUpdate(kind: Kind, id: number, body: Record<string, unknown>) {
  enqueue({ kind, type: 'update', id, body });
}

export function queueDelete(kind: Kind, id: number) {
  enqueue({ kind, type: 'delete', id });
}

type Result = 'done' | 'drop' | 'retry';

async function send(op: Op): Promise<{ result: Result; data?: unknown }> {
  // id âm ở update/delete = bản ghi tạo offline mà lệnh tạo đã bị bỏ → không còn gì để sửa
  if (op.type !== 'create' && op.id < 0) return { result: 'drop' };

  let res: Response;
  try {
    if (op.type === 'create') {
      res = await fetch(API_BASE[op.kind], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...op.body, created_at: op.created_at }),
      });
    } else if (op.type === 'update') {
      res = await fetch(`${API_BASE[op.kind]}/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op.body),
      });
    } else {
      res = await fetch(`${API_BASE[op.kind]}/${op.id}`, { method: 'DELETE' });
    }
  } catch {
    return { result: 'retry' }; // mất mạng
  }
  if (res.ok) {
    return { result: 'done', data: op.type === 'create' ? await res.json() : undefined };
  }
  // 5xx: server lỗi tạm thời, giữ lại thử sau. 4xx (vd. 404 đã bị xoá): bỏ.
  return { result: res.status >= 500 ? 'retry' : 'drop' };
}

async function flush() {
  for (;;) {
    const op = freshOutbox()[0];
    if (!op) break;

    const { result, data } = await send(op);
    if (result === 'retry') break;

    let outbox = freshOutbox();
    const head = outbox[0];
    if (!head || head.kind !== op.kind || head.type !== op.type || head.id !== op.id) break; // tab khác đã xử lý
    outbox = outbox.slice(1);

    if (result === 'done' && op.type === 'create') {
      const realId = (data as { id?: number } | undefined)?.id;
      // Thao tác sau đó nhắm vào id tạm → đổi sang id thật
      if (realId) outbox = outbox.map(o => o.kind === op.kind && o.id === op.id ? { ...o, id: realId } : o);
    }
    setState({ outbox });
    if (result === 'done') syncedListeners.forEach(cb => cb(op, data));
  }
}

let syncing: Promise<void> | null = null;
// Có thao tác mới trong lúc đang đồng bộ → chạy thêm 1 lượt khi xong
let rerun = false;

/** Đẩy outbox lên server; trống outbox thì báo các danh sách tải lại. */
export function syncOffline(): Promise<void> {
  initOfflineQueue();
  if (syncing) { rerun = true; return syncing; }
  rerun = false;
  setState({ syncing: true });

  const run = async () => {
    await flush();
    if (!freshOutbox().length) idleListeners.forEach(cb => cb());
  };

  // Web Locks: nhiều tab cùng mở thì chỉ 1 tab gửi outbox, tránh tạo trùng
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  const task = locks ? locks.request('offline-outbox', () => run()).then(() => {}) : run();

  const current = task
    .catch(err => console.error('syncOffline error:', err))
    .finally(() => {
      syncing = null;
      setState({ syncing: false });
      if (rerun && freshOutbox().length) syncOffline();
    });
  syncing = current;
  return current;
}

const countFor = (kind?: Kind) => kind ? state.outbox.filter(o => o.kind === kind).length : state.outbox.length;

export function useOfflineStatus(kind?: Kind) {
  const online = useSyncExternalStore(subscribeQueue, () => state.online, () => true);
  const pendingCount = useSyncExternalStore(subscribeQueue, () => countFor(kind), () => 0);
  return { online, pendingCount };
}

/** Outbox hiện tại (snapshot ổn định cho useSyncExternalStore) */
export function useOutbox(): Op[] {
  return useSyncExternalStore(subscribeQueue, () => state.outbox, () => EMPTY);
}
const EMPTY: Op[] = [];

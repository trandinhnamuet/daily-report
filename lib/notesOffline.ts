'use client';

import { useSyncExternalStore } from 'react';

export interface Note {
  id: number;
  note: string;
  created_at: string;
  /** Có thay đổi chưa đồng bộ lên server */
  pending?: boolean;
}

/**
 * Ghi chú offline: mọi thao tác (thêm/sửa/xoá) đều được ghi vào hàng đợi
 * (outbox) trong localStorage rồi mới gửi lên server. Mất mạng thì thao tác
 * nằm chờ trong outbox, có mạng lại thì tự đẩy lên theo đúng thứ tự.
 *
 * Danh sách hiển thị = bản server cache gần nhất + áp các thao tác còn chờ.
 * Ghi chú tạo lúc offline mang id âm tạm thời, được đổi sang id thật khi
 * server trả về.
 */
type Op =
  | { type: 'create'; id: number; note: string; created_at: string }
  | { type: 'update'; id: number; note: string }
  | { type: 'delete'; id: number };

interface State {
  server: Note[];
  outbox: Op[];
  online: boolean;
  syncing: boolean;
}

const SERVER_KEY = 'cache_notes';
const OUTBOX_KEY = 'notes_outbox';
const RETRY_MS = 30_000;

const read = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* đầy bộ nhớ / private mode */ }
};

const INITIAL_STATE: State = { server: [], outbox: [], online: true, syncing: false };
let state: State = INITIAL_STATE;
let view: Note[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function applyOutbox(server: Note[], outbox: Op[]): Note[] {
  let notes = server.slice();
  for (const op of outbox) {
    if (op.type === 'create') {
      notes = [{ id: op.id, note: op.note, created_at: op.created_at, pending: true }, ...notes];
    } else if (op.type === 'update') {
      notes = notes.map(n => n.id === op.id ? { ...n, note: op.note, pending: true } : n);
    } else {
      notes = notes.filter(n => n.id !== op.id);
    }
  }
  return notes;
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('server' in patch) write(SERVER_KEY, state.server);
  if ('outbox' in patch) write(OUTBOX_KEY, state.outbox);
  if ('server' in patch || 'outbox' in patch) view = applyOutbox(state.server, state.outbox);
  listeners.forEach(cb => cb());
}

// Tab khác cũng có thể sửa outbox → luôn đọc lại từ localStorage trước khi đụng vào
const freshOutbox = (): Op[] => read<Op[]>(OUTBOX_KEY, state.outbox);

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  state = {
    server: read<Note[]>(SERVER_KEY, []),
    outbox: read<Op[]>(OUTBOX_KEY, []),
    online: navigator.onLine,
    syncing: false,
  };
  view = applyOutbox(state.server, state.outbox);

  window.addEventListener('online', () => { setState({ online: true }); syncNotes(); });
  window.addEventListener('offline', () => setState({ online: false }));
  window.addEventListener('storage', e => {
    if (e.key === SERVER_KEY || e.key === OUTBOX_KEY) {
      setState({ server: read<Note[]>(SERVER_KEY, []), outbox: read<Op[]>(OUTBOX_KEY, []) });
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNotes();
  });
  setInterval(() => { if (state.outbox.length) syncNotes(); }, RETRY_MS);
}

function subscribe(cb: () => void) {
  init();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

let tempSeq = 0;
const tempId = () => -(Date.now() * 100 + (tempSeq++ % 100));

function enqueue(op: Op) {
  setState({ outbox: [...freshOutbox(), op] });
  syncNotes();
}

export function addNote(note: string) {
  init();
  enqueue({ type: 'create', id: tempId(), note, created_at: new Date().toISOString() });
}

export function updateNote(id: number, note: string) {
  init();
  enqueue({ type: 'update', id, note });
}

export function deleteNote(id: number) {
  init();
  enqueue({ type: 'delete', id });
}

type Result = 'done' | 'drop' | 'retry';

async function send(op: Op): Promise<{ result: Result; created?: Note }> {
  let res: Response;
  try {
    if (op.type === 'create') {
      res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: op.note, created_at: op.created_at }),
      });
    } else if (op.type === 'update') {
      // id âm = ghi chú tạo offline mà bản tạo đã bị bỏ → không còn gì để sửa
      if (op.id < 0) return { result: 'drop' };
      res = await fetch(`/api/notes/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: op.note }),
      });
    } else {
      if (op.id < 0) return { result: 'drop' };
      res = await fetch(`/api/notes/${op.id}`, { method: 'DELETE' });
    }
  } catch {
    return { result: 'retry' }; // mất mạng
  }
  if (res.ok) {
    return { result: 'done', created: op.type === 'create' ? await res.json() : undefined };
  }
  // 5xx: server lỗi tạm thời, giữ lại thử sau. 4xx (vd. 404 ghi chú đã bị xoá): bỏ.
  return { result: res.status >= 500 ? 'retry' : 'drop' };
}

async function flush() {
  for (;;) {
    const op = freshOutbox()[0];
    if (!op) break;

    const { result, created } = await send(op);
    if (result === 'retry') break;

    let server = state.server;
    let outbox = freshOutbox();
    if (outbox[0]?.type !== op.type || outbox[0]?.id !== op.id) break; // tab khác đã xử lý
    outbox = outbox.slice(1);

    if (result === 'done') {
      if (op.type === 'create' && created) {
        server = [{ id: created.id, note: created.note, created_at: created.created_at }, ...server];
        // Thao tác sau đó nhắm vào id tạm → đổi sang id thật
        outbox = outbox.map(o => o.id === op.id ? { ...o, id: created.id } : o);
      } else if (op.type === 'update') {
        server = server.map(n => n.id === op.id ? { ...n, note: op.note } : n);
      } else if (op.type === 'delete') {
        server = server.filter(n => n.id !== op.id);
      }
    }
    setState({ server, outbox });
  }
}

let syncing: Promise<void> | null = null;
// Có thao tác mới trong lúc đang đồng bộ → chạy thêm 1 lượt khi xong
let rerun = false;

/** Đẩy outbox lên server rồi tải lại danh sách mới nhất. */
export function syncNotes(): Promise<void> {
  init();
  if (syncing) { rerun = true; return syncing; }
  rerun = false;
  setState({ syncing: true });

  const run = async () => {
    await flush();
    // Còn thao tác chờ (đang offline) thì giữ bản cache, tránh ghi đè
    if (freshOutbox().length) return;
    try {
      const res = await fetch('/api/notes', { cache: 'no-store' });
      if (res.ok && !freshOutbox().length) setState({ server: await res.json() });
    } catch { /* offline: giữ cache */ }
  };

  // Web Locks: nhiều tab cùng mở thì chỉ 1 tab gửi outbox, tránh tạo trùng ghi chú
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  const task = locks ? locks.request('notes-outbox', () => run()).then(() => {}) : run();

  const current = task
    .catch(err => console.error('syncNotes error:', err))
    .finally(() => {
      syncing = null;
      setState({ syncing: false });
      if (rerun) syncNotes();
    });
  syncing = current;
  return current;
}

const getSnapshotNotes = () => view;
const getServerNotes = (): Note[] => [];

export function useNotes() {
  const notes = useSyncExternalStore(subscribe, getSnapshotNotes, getServerNotes);
  const online = useSyncExternalStore(subscribe, () => state.online, () => true);
  const pendingCount = useSyncExternalStore(subscribe, () => state.outbox.length, () => 0);
  const isSyncing = useSyncExternalStore(subscribe, () => state.syncing, () => false);
  return { notes, online, pendingCount, isSyncing };
}

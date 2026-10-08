'use client';

import { useSyncExternalStore } from 'react';
import {
  type Kind, type Op,
  API_BASE, readStored, writeStored, subscribeQueue, getOutbox, onIdle, onSynced, pendingOps,
  queueCreate, queueUpdate, queueDelete, syncOffline, initOfflineQueue,
} from './offlineQueue';

/**
 * Danh sách ghi chú / tài liệu dùng được offline.
 * Hiển thị = bản server cache gần nhất + áp các thao tác còn chờ trong outbox.
 */
export interface OfflineItem {
  id: number;
  created_at: string;
  /** Có thay đổi chưa đồng bộ lên server */
  pending?: boolean;
}

function createListStore<T extends OfflineItem>(kind: Kind, field: keyof T & string, cacheKey: string) {
  let server: T[] = [];
  let view: T[] = [];
  let lastOutbox: Op[] | null = null;
  let initialized = false;
  const listeners = new Set<() => void>();

  const applyOutbox = (): T[] => {
    let items = server.slice();
    for (const op of pendingOps(kind)) {
      if (op.type === 'create') {
        items = [{ id: op.id, created_at: op.created_at, [field]: op.body[field], pending: true } as unknown as T, ...items];
      } else if (op.type === 'update') {
        items = items.map(i => i.id === op.id ? { ...i, ...op.body, pending: true } : i);
      } else {
        items = items.filter(i => i.id !== op.id);
      }
    }
    return items;
  };

  const recompute = () => {
    view = applyOutbox();
    listeners.forEach(cb => cb());
  };

  const setServer = (items: T[]) => {
    server = items;
    writeStored(cacheKey, items);
    recompute();
  };

  async function refresh() {
    init();
    // Còn thao tác chờ thì giữ bản cache, tránh ghi đè bằng dữ liệu cũ hơn outbox
    if (pendingOps(kind).length) return;
    try {
      const res = await fetch(API_BASE[kind], { cache: 'no-store' });
      if (res.ok && !pendingOps(kind).length) setServer(await res.json());
    } catch { /* offline: giữ cache */ }
  }

  function init() {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;
    initOfflineQueue();
    server = readStored<T[]>(cacheKey, []);
    view = applyOutbox();

    // Outbox đổi (thêm thao tác / gửi xong 1 thao tác) → tính lại danh sách
    subscribeQueue(() => {
      const outbox = getOutbox();
      if (outbox === lastOutbox) return;
      lastOutbox = outbox;
      recompute();
    });
    // Gửi xong 1 thao tác → áp luôn vào bản cache, không chờ tải lại danh sách
    onSynced((op, data) => {
      if (op.kind !== kind) return;
      if (op.type === 'create' && data) setServer([data as T, ...server]);
      else if (op.type === 'update') setServer(server.map(i => i.id === op.id ? { ...i, ...op.body } : i));
      else if (op.type === 'delete') setServer(server.filter(i => i.id !== op.id));
    });
    onIdle(refresh);
    window.addEventListener('storage', e => {
      if (e.key === cacheKey) { server = readStored<T[]>(cacheKey, []); recompute(); }
    });
  }

  const subscribe = (cb: () => void) => {
    init();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  };

  const EMPTY: T[] = [];

  return {
    useItems: () => useSyncExternalStore(subscribe, () => view, () => EMPTY),
    /** Đẩy outbox; outbox trống thì onIdle tự tải lại danh sách */
    sync: () => { init(); return syncOffline(); },
    add: (text: string) => { init(); queueCreate(kind, { [field]: text }); },
    update: (id: number, text: string) => { init(); queueUpdate(kind, id, { [field]: text }); },
    remove: (id: number) => { init(); queueDelete(kind, id); },
  };
}

export interface Note extends OfflineItem { note: string; }
export interface DocumentItem extends OfflineItem { detail: string; }

export const notesStore = createListStore<Note>('note', 'note', 'cache_notes');
export const documentsStore = createListStore<DocumentItem>('document', 'detail', 'cache_documents');

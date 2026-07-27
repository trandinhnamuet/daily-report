'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, History, Search } from 'lucide-react';

interface User { id: number; name: string; }

interface ActivityRow {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xoá',
  status_change: 'Đổi trạng thái',
  assignee_change: 'Đổi người nhận',
  deadline_change: 'Đổi deadline',
  comment_create: 'Bình luận',
  comment_delete: 'Xoá bình luận',
  reaction_set: 'Thả cảm xúc',
  reaction_remove: 'Gỡ cảm xúc',
  read: 'Đã đọc',
};

const ACTION_CLS: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-[#0d3320] dark:text-[#4ade80]',
  update: 'bg-blue-100 text-blue-700 dark:bg-[#0d2847] dark:text-[#60a5fa]',
  delete: 'bg-red-100 text-red-700 dark:bg-[#3d1515] dark:text-[#f87171]',
  status_change: 'bg-amber-100 text-amber-700 dark:bg-[#2a1a00] dark:text-[#fbbf24]',
  assignee_change: 'bg-purple-100 text-purple-700 dark:bg-[#2a1f3d] dark:text-[#c084fc]',
  deadline_change: 'bg-orange-100 text-orange-700 dark:bg-[#2a1a00] dark:text-[#fb923c]',
  comment_create: 'bg-sky-100 text-sky-700 dark:bg-[#082f49] dark:text-[#38bdf8]',
  comment_delete: 'bg-red-100 text-red-700 dark:bg-[#3d1515] dark:text-[#f87171]',
  reaction_set: 'bg-pink-100 text-pink-700 dark:bg-[#3d1528] dark:text-[#f472b6]',
  reaction_remove: 'bg-gray-100 text-gray-600 dark:bg-[#3c3c3c] dark:text-[#c5c5c5]',
  read: 'bg-gray-100 text-gray-500 dark:bg-[#2d2d2d] dark:text-[#858585]',
};

const ENTITY_LABEL: Record<string, string> = {
  report: 'Note/Task',
  note: 'Ghi chú',
  document: 'Tài liệu',
  user: 'User',
  comment: 'Bình luận',
  reaction: 'Cảm xúc',
};

const LIMIT = 50;

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const requestRef = useRef(0);

  useEffect(() => {
    fetch('/api/users')
      .then(res => (res.ok ? res.json() : []))
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const buildParams = useCallback((beforeId?: number) => {
    const params = new URLSearchParams({ limit: String(LIMIT) });
    if (filterUserId !== 'all') params.set('user_id', filterUserId);
    if (filterEntity !== 'all') params.set('entity_type', filterEntity);
    if (filterAction !== 'all') params.set('action', filterAction);
    if (filterDate !== 'all') params.set('date', filterDate);
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (beforeId) params.set('before_id', String(beforeId));
    return params;
  }, [filterUserId, filterEntity, filterAction, filterDate, debouncedSearch]);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    fetch(`/api/activity?${buildParams()}`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: ActivityRow[]) => {
        if (requestRef.current !== requestId) return;
        setRows(data);
        setHasMore(data.length === LIMIT);
      })
      .catch(() => {})
      .finally(() => { if (requestRef.current === requestId) setLoading(false); });
  }, [buildParams]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !rows.length) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/activity?${buildParams(rows[rows.length - 1].id)}`);
      if (!res.ok) return;
      const older: ActivityRow[] = await res.json();
      setRows(prev => [...prev, ...older]);
      setHasMore(older.length === LIMIT);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const selectCls =
    'bg-gray-100 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] border border-gray-300 dark:border-[#474747] rounded-lg px-2 py-1.5 text-xs';

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100 dark:bg-[#1e1e1e]">
      {/* Header */}
      <div className="bg-white dark:bg-[#3c3c3c] shadow-sm border-b border-gray-200 dark:border-[#474747] shrink-0">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-[#d4d4d4] truncate">
              Lịch sử hành động
            </h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-[#858585] hover:text-gray-800 dark:hover:text-[#d4d4d4] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Về trang chính
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#252526] border-b border-gray-200 dark:border-[#3c3c3c] px-3 sm:px-4 py-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} className={selectCls} title="Lọc theo người">
            <option value="all">Tất cả mọi người</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className={selectCls} title="Lọc theo đối tượng">
            <option value="all">Tất cả đối tượng</option>
            {Object.entries(ENTITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className={selectCls} title="Lọc theo hành động">
            <option value="all">Tất cả hành động</option>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDate === 'all' ? '' : filterDate}
            onChange={e => setFilterDate(e.target.value || 'all')}
            className={selectCls}
            title="Lọc theo ngày"
          />

          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#858585] pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm trong nội dung..."
              className={`${selectCls} w-full pl-7`}
            />
          </div>

          {(filterUserId !== 'all' || filterEntity !== 'all' || filterAction !== 'all' || filterDate !== 'all' || search) && (
            <button
              onClick={() => {
                setFilterUserId('all'); setFilterEntity('all');
                setFilterAction('all'); setFilterDate('all'); setSearch('');
              }}
              className="text-xs text-red-500 hover:underline px-1"
            >
              Xoá lọc
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="max-w-4xl mx-auto space-y-1.5">
          {loading && (
            <div className="text-center py-10 text-sm text-gray-400 dark:text-[#858585]">Đang tải...</div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500 dark:text-[#858585]">
              Không có hành động nào khớp bộ lọc
            </div>
          )}

          {!loading && rows.map(row => (
            <div
              key={row.id}
              className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg px-2.5 sm:px-3 py-2 flex items-start gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs font-semibold">
                  {row.user_name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-[#d4d4d4]">
                    {row.user_name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ACTION_CLS[row.action] ?? ACTION_CLS.update}`}>
                    {ACTION_LABEL[row.action] ?? row.action}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-[#6b6b6b]">
                    {ENTITY_LABEL[row.entity_type] ?? row.entity_type}
                    {row.entity_id ? ` #${row.entity_id}` : ''}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-[#6b6b6b] ml-auto whitespace-nowrap">
                    {format(new Date(row.created_at), 'HH:mm:ss dd/MM/yyyy')}
                  </span>
                </div>

                {row.summary && (
                  <div className="text-xs text-gray-600 dark:text-[#c5c5c5] mt-0.5 break-words [overflow-wrap:anywhere]">
                    {row.summary}
                  </div>
                )}
              </div>
            </div>
          ))}

          {!loading && hasMore && rows.length > 0 && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-xs text-gray-500 dark:text-[#858585] hover:text-gray-800 dark:hover:text-[#d4d4d4] disabled:opacity-50"
            >
              {loadingMore ? 'Đang tải...' : 'Tải thêm'}
            </button>
          )}

          {!loading && !hasMore && rows.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-400 dark:text-[#858585]">Đã tải hết</div>
          )}
        </div>
      </div>
    </div>
  );
}

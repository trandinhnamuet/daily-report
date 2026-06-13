'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Users, X, Calendar, Sun, Moon, FileText, StickyNote, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { useAutoResize } from '../hooks/useAutoResize';
import UserSelector from '../components/UserSelector';
import ChatMessage, { type Status } from '../components/ChatMessage';
import DocumentPanel from '../components/DocumentPanel';
import NotesPanel from '../components/NotesPanel';

import { useCurrentUser } from '@/app/provider/UserProvider';
import { useTheme } from '@/app/provider/ThemeProvider';

type FilterStatus = 'all' | 'todo' | 'done' | 'note';
type ActiveTab = 'documents' | 'reports' | 'notes';

const FILTER_CYCLE: Record<FilterStatus, FilterStatus> = {
  all: 'todo', todo: 'done', done: 'note', note: 'all',
};
const FILTER_CFG: Record<FilterStatus, { label: string; cls: string }> = {
  all:  { label: 'Tất cả',  cls: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] dark:hover:bg-[#474747]' },
  todo: { label: 'Todo',    cls: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-[#3d1515] dark:text-[#f87171] dark:hover:bg-[#4a1a1a]' },
  done: { label: 'Done',    cls: 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-[#0d3320] dark:text-[#4ade80] dark:hover:bg-[#103d26]' },
  note: { label: 'Ghi chú', cls: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-[#001c3a] dark:text-[#60a5fa] dark:hover:bg-[#002040]' },
};

interface User { id: number; name: string; }
interface Report {
  id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_id: number;
  status: Status;
  assignee_id: number | null;
  assignee_name: string | null;
  deadline: string | null;
}

export default function Home() {
  const REPORTS_CACHE = 'cache_reports';
  const USERS_CACHE   = 'cache_users';

  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window === 'undefined') return [];
    try { const r = sessionStorage.getItem('cache_users'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });
  const [reports, setReports] = useState<Report[]>(() => {
    if (typeof window === 'undefined') return [];
    try { const r = sessionStorage.getItem('cache_reports'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  const DRAFT_KEY = 'draft_report';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(DRAFT_KEY) ?? '';
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);

  const [filterUserId, setFilterUserId] = useState<number | 'all'>('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | 'all'>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [dateError, setDateError] = useState('');

  const [composeAssigneeId, setComposeAssigneeId] = useState<number | ''>('');
  const [composeDeadline, setComposeDeadline] = useState<string>('');

  type FontSize = 'xs' | 'sm' | 'base';
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window === 'undefined') return 'xs';
    return (localStorage.getItem('msg_font_size') as FontSize) ?? 'xs';
  });
  const cycleFontSize = () => setFontSize(prev => {
    const next: FontSize = prev === 'xs' ? 'sm' : prev === 'sm' ? 'base' : 'xs';
    localStorage.setItem('msg_font_size', next);
    return next;
  });
  const fontSizeLabel: Record<FontSize, string> = { xs: 'Nhỏ', sm: 'Vừa', base: 'To' };

  const [activeTab, setActiveTab] = useState<ActiveTab>('reports');

  const today = new Date().toISOString().slice(0, 10);

  const {
    currentUserId, currentUserName, reporterId,
    setReporterId, resetCurrentUser, setCurrentUser,
  } = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  const [filteredReports, setFilteredReports] = useState<Report[] | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<{top: number, bottom: number, left: number, right: number} | null>(null);
  const [reportsFetched, setReportsFetched] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const hasFetchedHighlightRef = useRef(false);
  const messageTextareaRef = useAutoResize(message);

  const displayReports = (filteredReports ?? reports)
    .filter(r => filterStatus === 'all' ? true : (r.status ?? 'note') === filterStatus)
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  useEffect(() => {
    fetchUsers();
    fetchReports();

    channelRef.current = new BroadcastChannel('user-sync');
    channelRef.current.onmessage = event => {
      const { type, payload } = event.data || {};
      if (type === 'user-updated') {
        setUsers(prev => prev.map(u => (u.id === payload.id ? payload : u)));
      }
      if (type === 'user-deleted') {
        setUsers(prev => prev.filter(u => u.id !== payload.id));
        if (payload.id === currentUserId) { resetCurrentUser(); setShowUserModal(true); setHasCheckedUser(true); }
        if (payload.id === reporterId) setReporterId(null);
        if (payload.id === filterUserId) setFilterUserId('all');
      }
    };
    return () => channelRef.current?.close();
  }, [currentUserId, reporterId, filterUserId, resetCurrentUser, setReporterId]);

  useEffect(() => {
    if (!users.length || hasCheckedUser) return;
    const id   = document.cookie.split('; ').find(c => c.startsWith('current_user_id='))?.split('=')[1];
    const name = document.cookie.split('; ').find(c => c.startsWith('current_user_name='))?.split('=')[1];
    if (!id || !users.some(u => u.id === Number(id))) {
      resetCurrentUser(); setShowUserModal(true); setHasCheckedUser(true); return;
    }
    setCurrentUser({ id: Number(id), name: decodeURIComponent(name || '') });
    setShowUserModal(false); setHasCheckedUser(true);
  }, [users, hasCheckedUser, resetCurrentUser, setCurrentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [scrollTrigger]);

  // Status filter: client-side only → scroll ngay
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return; }
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [filterStatus]);

  // User/assignee/date filter: fetch server-side toàn bộ lịch sử
  useEffect(() => {
    const hasServerFilter = filterUserId !== 'all' || filterAssigneeId !== 'all' || filterDate !== 'all';
    if (!hasServerFilter) { setFilteredReports(null); return; }

    setIsFilterLoading(true);
    const params = new URLSearchParams();
    if (filterUserId !== 'all') params.set('user_id', String(filterUserId));
    if (filterAssigneeId !== 'all') params.set('assignee_id', String(filterAssigneeId));
    if (filterDate !== 'all') params.set('date', filterDate);

    fetch(`/api/reports?${params}`)
      .then(r => r.json())
      .then((data: Report[]) => {
        setFilteredReports(data);
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }));
      })
      .catch(() => {})
      .finally(() => setIsFilterLoading(false));
  }, [filterUserId, filterAssigneeId, filterDate]);

  useEffect(() => { localStorage.setItem(DRAFT_KEY, message); }, [message]);

  // Đọc hash khi mount để biết task cần highlight
  useEffect(() => {
    const match = window.location.hash.match(/^#report-(\d+)$/);
    if (match) setHighlightId(parseInt(match[1]));
  }, []);

  // Sau khi reports được tải, nếu target chưa có → auto-load older reports
  useEffect(() => {
    if (!highlightId || !reportsFetched || hasFetchedHighlightRef.current) return;
    hasFetchedHighlightRef.current = true;
    if (reports.some(r => r.id === highlightId)) return;

    let isMounted = true;
    const autoLoadOlder = async () => {
      try {
        // Fetch target report to verify it exists
        const targetRes = await fetch(`/api/reports/${highlightId}`);
        if (!targetRes.ok) return;
        const targetReport = await targetRes.json();

        // Load all older reports than the target in one go
        const oldestId = reports[reports.length - 1]?.id || Number.MAX_SAFE_INTEGER;
        const res = await fetch(`/api/reports?limit=10000&before_id=${oldestId}`);
        const older: Report[] = await res.json();

        if (older.length && isMounted) {
          const updated = [...reports, ...older];
          setReports(updated);
          sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(updated));
        }
      } catch {
        // Silently fail
      }
    };

    autoLoadOlder();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsFetched, highlightId]);

  // Track spotlight rect & scroll to highlight
  useEffect(() => {
    if (!highlightId) { setSpotlightRect(null); return; }

    const updateRect = () => {
      const el = document.getElementById(`report-${highlightId}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setSpotlightRect({
        top: Math.max(0, Math.round(rect.top - padding)),
        bottom: Math.min(window.innerHeight, Math.round(rect.bottom + padding)),
        left: Math.max(0, Math.round(rect.left - padding)),
        right: Math.min(window.innerWidth, Math.round(rect.right + padding))
      });

      // Auto-scroll when element comes into view
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateRect();
    const timer = setInterval(updateRect, 100);
    return () => clearInterval(timer);
  }, [highlightId, reports]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
      sessionStorage.setItem(USERS_CACHE, JSON.stringify(data));
    } catch { /* keep stale data */ }
  };

  const LOAD_LIMIT = 50;

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/reports?limit=${LOAD_LIMIT}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data);
      setHasMore(data.length === LOAD_LIMIT);
      setReportsFetched(true);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(data));
      if (data.length) setReporterId(data[0].user_id);
      setScrollTrigger(n => n + 1);
    } catch { /* keep stale data */ }
  };

  const loadMoreReports = async () => {
    if (isLoadingMore || !hasMore) return;
    const oldestId = reports[reports.length - 1]?.id;
    if (!oldestId) return;

    setIsLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const res = await fetch(`/api/reports?limit=${LOAD_LIMIT}&before_id=${oldestId}`);
      if (!res.ok) throw new Error();
      const older: Report[] = await res.json();
      if (older.length === 0) { setHasMore(false); return; }

      setReports(prev => {
        const next = [...prev, ...older];
        sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
        return next;
      });
      setHasMore(older.length === LOAD_LIMIT);

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop += container.scrollHeight - prevScrollHeight;
        }
      });
    } catch { /* ignore */ }
    finally { setIsLoadingMore(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !message.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          message: message.trim(),
          assignee_id: composeAssigneeId || null,
          deadline: composeDeadline || null,
        }),
      });
      if (res.ok) {
        const newReport = await res.json();
        setReports(prev => {
          const next = [newReport, ...prev];
          sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
          return next;
        });
        setReporterId(newReport.user_id);
        setMessage('');
        setComposeAssigneeId('');
        setComposeDeadline('');
        localStorage.removeItem(DRAFT_KEY);
        setScrollTrigger(n => n + 1);
      }
    } finally { setIsLoading(false); }
  };

  const handleDeleteReport = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(prev => {
          const next = prev.filter(r => r.id !== id);
          sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
          return next;
        });
        setFilteredReports(prev => prev ? prev.filter(r => r.id !== id) : null);
      }
    } catch (err) { console.error('deleteReport error:', err); }
  };

  const handleStatusChange = async (id: number, status: Status) => {
    setReports(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status } : r);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
      return next;
    });
    setFilteredReports(prev => prev ? prev.map(r => r.id === id ? { ...r, status } : r) : null);
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) { console.error('updateStatus error:', err); }
  };

  const handleAssigneeChange = (id: number, assignee_id: number | null, assignee_name: string | null) => {
    setReports(prev => {
      const next = prev.map(r => r.id === id ? { ...r, assignee_id, assignee_name } : r);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
      return next;
    });
  };

  const handleDeadlineChange = (id: number, deadline: string | null) => {
    setReports(prev => {
      const next = prev.map(r => r.id === id ? { ...r, deadline } : r);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
      return next;
    });
  };

  const isReadOnly = !currentUserId;

  /* ────────── Tab nav helper ────────── */
  const tabCls = (tab: ActiveTab) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
      activeTab === tab
        ? tab === 'notes'
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-blue-600 dark:text-blue-400'
        : 'text-gray-500 dark:text-[#858585]'
    }`;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100 dark:bg-[#1e1e1e]">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-[#3c3c3c] shadow-sm border-b border-gray-200 dark:border-[#474747] shrink-0">
        <div className="px-3 sm:px-4 py-1.5 sm:py-3 flex justify-between items-center">
          <h1 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-[#d4d4d4] leading-tight">
            Task Notes
          </h1>
          <div className="flex items-center gap-1">
            {/* Font size toggle — mobile only */}
            <button
              onClick={cycleFontSize}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-[#cccccc] hover:bg-gray-100 dark:hover:bg-[#4e4e4e] transition-colors flex flex-col items-center leading-none"
              title={`Cỡ chữ: ${fontSizeLabel[fontSize]}`}
            >
              <span className={`font-bold leading-none ${fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : 'text-base'}`}>A</span>
              <span className="text-[8px] leading-none mt-0.5 opacity-70">{fontSizeLabel[fontSize]}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-[#cccccc] hover:bg-gray-100 dark:hover:bg-[#4e4e4e] transition-colors"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <Link
              href="/users"
              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Quản lý Users</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content (flex-1, three columns on lg, single tab on mobile) ── */}
      <div className="flex-1 flex min-h-0">

        {/* Documents panel */}
        <div className={`
          border-r border-gray-200 dark:border-[#3c3c3c]
          ${activeTab === 'documents' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}
          lg:flex lg:flex-col lg:w-80 lg:shrink-0 lg:min-h-0
        `}>
          <DocumentPanel />
        </div>

        {/* Center: Reports */}
        <div className={`
          flex flex-col bg-white dark:bg-[#1e1e1e] min-w-0
          ${activeTab === 'reports' ? 'flex-1 min-h-0' : 'hidden'}
          lg:flex lg:flex-1 lg:min-h-0
        `}>
          {/* Messages list */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-2 sm:px-4 py-1.5 sm:py-4"
            onScroll={e => {
              if (!filteredReports && (e.currentTarget as HTMLDivElement).scrollTop < 80) loadMoreReports();
            }}
          >
            {isFilterLoading && (
              <div className="flex justify-center py-2 text-xs text-gray-400 dark:text-[#858585]">Đang lọc...</div>
            )}
            {!filteredReports && isLoadingMore && (
              <div className="flex justify-center py-2 text-xs text-gray-400 dark:text-[#858585]">Đang tải...</div>
            )}
            {!filteredReports && !hasMore && reports.length > 0 && (
              <div className="flex justify-center py-2 text-xs text-gray-400 dark:text-[#858585]">Đã tải hết</div>
            )}
            {displayReports.length ? (
              displayReports.map(r => (
                <ChatMessage
                  key={r.id}
                  report={r}
                  users={users}
                  status={r.status ?? 'note'}
                  fontSize={fontSize}
                  isHighlighted={r.id === highlightId}
                  onDelete={handleDeleteReport}
                  onStatusChange={handleStatusChange}
                  onAssigneeChange={handleAssigneeChange}
                  onDeadlineChange={handleDeadlineChange}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-[#858585] text-sm">
                Không có mục nào
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose + filters */}
          <div className="border-t border-gray-200 dark:border-[#3c3c3c] p-2 sm:p-3 lg:p-4 shrink-0">
            {/* Row 1: user info */}
            <div className="flex flex-wrap justify-between items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-[#858585] mb-1.5 sm:mb-2">
              {currentUserId ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">
                    User: <b className="text-gray-800 dark:text-[#d4d4d4]">{currentUserName}</b>
                  </span>
                  <button
                    onClick={() => { resetCurrentUser(); setShowUserModal(true); }}
                    className="shrink-0 text-red-500 hover:underline"
                  >
                    Đổi
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Chọn user để bắt đầu
                </button>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter */}
                <button
                  onClick={() => setFilterStatus(s => FILTER_CYCLE[s])}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${FILTER_CFG[filterStatus].cls}`}
                  title="Lọc trạng thái"
                >
                  {FILTER_CFG[filterStatus].label}
                </button>

                {/* User filter */}
                <select
                  value={filterUserId}
                  onChange={e => setFilterUserId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-gray-100 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] border border-gray-300 dark:border-[#474747] rounded-lg px-2.5 py-1.5 text-xs max-w-[130px]"
                  title="Lọc người tạo"
                >
                  <option value="all">Tất cả (tạo bởi)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                {/* Assignee filter */}
                <select
                  value={filterAssigneeId}
                  onChange={e => setFilterAssigneeId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-purple-50 dark:bg-[#2a1f3d] dark:text-[#c084fc] border border-purple-200 dark:border-[#6b3fa0] rounded-lg px-2.5 py-1.5 text-xs max-w-[130px]"
                  title="Lọc người nhận"
                >
                  <option value="all">Tất cả (nhận bởi)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                {/* Date filter */}
                <div className="flex flex-col">
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#858585] pointer-events-none" />
                    <input
                      type="date"
                      max={today}
                      value={filterDate === 'all' ? '' : filterDate}
                      onChange={e => {
                        if (e.target.value > today) { setDateError('Chưa đến ngày'); setFilterDate('all'); }
                        else { setDateError(''); setFilterDate(e.target.value || 'all'); }
                      }}
                      className="pl-7 pr-2 py-1.5 border border-gray-300 dark:border-[#474747] rounded-lg text-xs bg-gray-100 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] w-[130px]"
                    />
                  </div>
                  {dateError && <span className="text-xs text-red-500 mt-0.5">{dateError}</span>}
                </div>
              </div>
            </div>

            {/* Compose form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 sm:gap-2">
              {/* Assignee + deadline row */}
              <div className="flex gap-1.5 sm:gap-2">
                <select
                  value={composeAssigneeId}
                  onChange={e => setComposeAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isReadOnly || isLoading}
                  className="flex-1 border border-purple-200 dark:border-[#6b3fa0] rounded-lg px-2.5 py-1.5 bg-purple-50 dark:bg-[#2a1f3d] text-gray-900 dark:text-[#c084fc] text-xs disabled:opacity-50"
                >
                  <option value="">Người nhận (tuỳ chọn)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={composeDeadline}
                  onChange={e => setComposeDeadline(e.target.value)}
                  disabled={isReadOnly || isLoading}
                  className="border border-orange-200 dark:border-[#7c4a00] rounded-lg px-2.5 py-1.5 bg-orange-50 dark:bg-[#2a1a00] text-gray-900 dark:text-[#fb923c] text-xs w-[130px] disabled:opacity-50"
                  title="Deadline"
                />
              </div>
              {/* Message + send row */}
              <div className="flex gap-1.5 sm:gap-2">
                <textarea
                  ref={messageTextareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={isReadOnly ? 'Chưa chọn user' : 'Nhập công việc hoặc ghi chú...'}
                  rows={1}
                  className="flex-1 border border-gray-300 dark:border-[#474747] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 resize-none bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] placeholder-gray-400 dark:placeholder-[#858585] text-xs sm:text-sm overflow-y-auto"
                  disabled={isReadOnly || isLoading}
                />
                <button
                  type="submit"
                  disabled={isReadOnly || !message.trim() || isLoading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Notes panel */}
        <div className={`
          border-l border-gray-200 dark:border-[#3c3c3c]
          ${activeTab === 'notes' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}
          lg:flex lg:flex-col lg:w-80 lg:shrink-0 lg:min-h-0
        `}>
          <NotesPanel />
        </div>
      </div>

      {/* ── Bottom tab nav (mobile only) ── */}
      <div className="lg:hidden shrink-0 safe-area-pb bg-white dark:bg-[#252526] border-t border-gray-200 dark:border-[#3c3c3c]">
        <div className="flex h-12 sm:h-14">
          <button onClick={() => setActiveTab('documents')} className={tabCls('documents')}>
            <FileText className="w-5 h-5" />
            Tài liệu
          </button>
          <button onClick={() => setActiveTab('reports')} className={tabCls('reports')}>
            <MessageSquare className="w-5 h-5" />
            Công việc
          </button>
          <button onClick={() => setActiveTab('notes')} className={tabCls('notes')}>
            <StickyNote className="w-5 h-5" />
            Ghi chú
          </button>
        </div>
      </div>

      {/* ── User selection modal ── */}
      {showUserModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              ref={modalRef}
              className="bg-white dark:bg-[#252526] p-5 sm:p-6 rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm space-y-4 border-t sm:border border-gray-200 dark:border-[#3c3c3c]"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-[#d4d4d4]">Bạn là ai?</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-500 dark:text-[#858585] hover:text-gray-700 dark:hover:text-[#d4d4d4] p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <UserSelector
                users={users}
                onSelected={user => {
                  document.cookie = `current_user_id=${user.id}; path=/`;
                  document.cookie = `current_user_name=${encodeURIComponent(user.name)}; path=/`;
                  setCurrentUser(user);
                  setShowUserModal(false);
                  setHasCheckedUser(true);
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {highlightId && spotlightRect && createPortal(
        <>
          <div className="spotlight-rect" style={{top: 0, left: 0, right: 0, height: `${spotlightRect.top}px`}} />
          <div className="spotlight-rect" style={{top: `${spotlightRect.bottom}px`, left: 0, right: 0, bottom: 0}} />
          <div className="spotlight-rect" style={{top: `${spotlightRect.top}px`, left: 0, width: `${spotlightRect.left}px`, height: `${spotlightRect.bottom - spotlightRect.top}px`}} />
          <div className="spotlight-rect" style={{top: `${spotlightRect.top}px`, left: `${spotlightRect.right}px`, right: 0, height: `${spotlightRect.bottom - spotlightRect.top}px`}} />
        </>,
        document.body
      )}
    </div>
  );
}

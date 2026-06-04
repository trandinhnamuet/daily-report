'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Users, X, Calendar, Sun, Moon, FileText, StickyNote, MessageSquare } from 'lucide-react';
import Link from 'next/link';

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
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [dateError, setDateError] = useState('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('reports');

  const today = new Date().toISOString().slice(0, 10);

  const {
    currentUserId, currentUserName, reporterId,
    setReporterId, resetCurrentUser, setCurrentUser,
  } = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  const [scrollTrigger, setScrollTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const displayReports = reports
    .filter(r => {
      const byUser   = filterUserId === 'all' ? true : r.user_id === filterUserId;
      const byDate   = filterDate   === 'all' ? true : r.created_at.slice(0, 10) === filterDate;
      const byStatus = filterStatus === 'all' ? true : (r.status ?? 'note') === filterStatus;
      return byUser && byDate && byStatus;
    })
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

  useEffect(() => { localStorage.setItem(DRAFT_KEY, message); }, [message]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
      sessionStorage.setItem(USERS_CACHE, JSON.stringify(data));
    } catch { /* keep stale data */ }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(data));
      if (data.length) setReporterId(data[0].user_id);
      setScrollTrigger(n => n + 1);
    } catch { /* keep stale data */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !message.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, message: message.trim() }),
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
      }
    } catch (err) { console.error('deleteReport error:', err); }
  };

  const handleStatusChange = async (id: number, status: Status) => {
    setReports(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status } : r);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(next));
      return next;
    });
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) { console.error('updateStatus error:', err); }
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
        <div className="px-3 sm:px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-[#d4d4d4] leading-tight">
            Daily Report
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-[#cccccc] hover:bg-gray-100 dark:hover:bg-[#4e4e4e] transition-colors"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Link
              href="/users"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Users className="w-4 h-4 shrink-0" />
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
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4">
            {displayReports.length ? (
              displayReports.map(r => (
                <ChatMessage
                  key={r.id}
                  report={r}
                  users={users}
                  status={r.status ?? 'note'}
                  onDelete={handleDeleteReport}
                  onStatusChange={handleStatusChange}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-[#858585] text-sm">
                Không có báo cáo
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose + filters */}
          <div className="border-t border-gray-200 dark:border-[#3c3c3c] p-3 sm:p-4 shrink-0">
            {/* Row 1: user info */}
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm text-gray-600 dark:text-[#858585] mb-2">
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
                  Chọn user để gửi báo cáo
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
                >
                  <option value="all">Tất cả</option>
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
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={isReadOnly ? 'Bạn đang xem (chưa chọn user)' : 'Nhập báo cáo...'}
                rows={2}
                className="flex-1 border border-gray-300 dark:border-[#474747] rounded-lg px-3 py-2 resize-none bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] placeholder-gray-400 dark:placeholder-[#858585] text-sm"
                disabled={isReadOnly || isLoading}
              />
              <button
                type="submit"
                disabled={isReadOnly || !message.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
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
        <div className="flex h-14">
          <button onClick={() => setActiveTab('documents')} className={tabCls('documents')}>
            <FileText className="w-5 h-5" />
            Tài liệu
          </button>
          <button onClick={() => setActiveTab('reports')} className={tabCls('reports')}>
            <MessageSquare className="w-5 h-5" />
            Báo cáo
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
    </div>
  );
}

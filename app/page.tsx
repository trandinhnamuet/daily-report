'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Users, X, Calendar, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

import UserSelector from '../components/UserSelector';
import ChatMessage, { type Status } from '../components/ChatMessage';

type FilterStatus = 'all' | 'todo' | 'done' | 'note';
const FILTER_CYCLE: Record<FilterStatus, FilterStatus> = {
  all: 'todo', todo: 'done', done: 'note', note: 'all',
};
const FILTER_CFG: Record<FilterStatus, { label: string; cls: string }> = {
  all:  { label: 'Tất cả',  cls: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] dark:hover:bg-[#474747]' },
  todo: { label: 'Todo',    cls: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-[#3d1515] dark:text-[#f87171] dark:hover:bg-[#4a1a1a]' },
  done: { label: 'Done',    cls: 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-[#0d3320] dark:text-[#4ade80] dark:hover:bg-[#103d26]' },
  note: { label: 'Ghi chú', cls: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-[#001c3a] dark:text-[#60a5fa] dark:hover:bg-[#002040]' },
};
import DocumentPanel from '../components/DocumentPanel';
import NotesPanel from '../components/NotesPanel';

import { useCurrentUser } from '@/app/provider/UserProvider';
import { useTheme } from '@/app/provider/ThemeProvider';

interface User {
  id: number;
  name: string;
}

interface Report {
  id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_id: number;
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
  const [reportStatuses, setReportStatuses] = useState<Record<number, Status>>({});
  const DRAFT_KEY = 'draft_report';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);

  const [filterUserId, setFilterUserId] = useState<number | 'all'>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [dateError, setDateError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const {
    currentUserId,
    currentUserName,
    reporterId,
    setReporterId,
    resetCurrentUser,
    setCurrentUser,
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
      const byStatus = filterStatus === 'all' ? true : (reportStatuses[r.id] ?? 'note') === filterStatus;
      return byUser && byDate && byStatus;
    })
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

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

        if (payload.id === currentUserId) {
          resetCurrentUser();
          setShowUserModal(true);
          setHasCheckedUser(true);
        }

        if (payload.id === reporterId) setReporterId(null);
        if (payload.id === filterUserId) setFilterUserId('all');
      }
    };

    return () => channelRef.current?.close();
  }, [currentUserId, reporterId, filterUserId, resetCurrentUser, setReporterId]);

  useEffect(() => {
    if (!users.length || hasCheckedUser) return;

    const id = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_id='))
      ?.split('=')[1];

    const name = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_name='))
      ?.split('=')[1];

    if (!id || !users.some(u => u.id === Number(id))) {
      resetCurrentUser();
      setShowUserModal(true);
      setHasCheckedUser(true);
      return;
    }

    setCurrentUser({
      id: Number(id),
      name: decodeURIComponent(name || ''),
    });

    setShowUserModal(false);
    setHasCheckedUser(true);
  }, [users, hasCheckedUser, resetCurrentUser, setCurrentUser]);

  // Chỉ scroll khi có report mới hoặc load lần đầu — không scroll khi đổi status/theme
  useEffect(() => {
    if (scrollTrigger === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scrollTrigger]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, message);
  }, [message]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('fetch users failed');
      const data = await res.json();
      setUsers(data);
      sessionStorage.setItem(USERS_CACHE, JSON.stringify(data));
    } catch (err) {
      console.error('fetchUsers error:', err);
      // Giữ data cũ, không clear
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('fetch reports failed');
      const data = await res.json();
      setReports(data);
      sessionStorage.setItem(REPORTS_CACHE, JSON.stringify(data));
      if (data.length) setReporterId(data[0].user_id);
      setScrollTrigger(n => n + 1); // scroll xuống cuối sau khi load xong
    } catch (err) {
      console.error('fetchReports error:', err);
      // Giữ data cũ, không clear
    }
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
        localStorage.removeItem(DRAFT_KEY);
        setScrollTrigger(n => n + 1); // scroll xuống report mới gửi
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
        setReportStatuses(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (err) {
      console.error('deleteReport error:', err);
    }
  };

  const handleStatusChange = (id: number, status: Status) => {
    setReportStatuses(prev => ({ ...prev, [id]: status }));
  };

  const isReadOnly = !currentUserId;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-[#1e1e1e]">
      {/* Header */}
      <div className="bg-white dark:bg-[#3c3c3c] shadow-sm border-b border-gray-200 dark:border-[#474747]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#d4d4d4]">Daily Report Chat</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-[#cccccc] hover:bg-gray-100 dark:hover:bg-[#4e4e4e] transition-colors"
              title={theme === 'light' ? 'Chuyển sang dark mode' : 'Chuyển sang light mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Link
              href="/users"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Quản lý Users
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: Documents */}
        <div className="w-80 bg-white dark:bg-[#252526] border-r border-gray-200 dark:border-[#3c3c3c]">
          <DocumentPanel />
        </div>

        {/* Center: Reports */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1e1e1e]">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {displayReports.length ? (
              displayReports.map(r => (
                <ChatMessage
                  key={r.id}
                  report={r}
                  users={users}
                  status={reportStatuses[r.id] ?? 'note'}
                  onDelete={handleDeleteReport}
                  onStatusChange={handleStatusChange}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-[#858585]">
                Không có báo cáo
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-[#3c3c3c] p-4">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-[#858585] mb-3 gap-4">
              {currentUserId ? (
                <div className="flex items-center gap-2">
                  <span>
                    Đang dùng user: <b className="text-gray-800 dark:text-[#d4d4d4]">{currentUserName}</b>
                  </span>
                  <button
                    onClick={() => {
                      resetCurrentUser();
                      setShowUserModal(true);
                    }}
                    className="text-red-500 hover:underline"
                  >
                    Đổi user
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

              <div className="flex items-center gap-3">
                {/* Status filter */}
                <button
                  onClick={() => setFilterStatus(s => FILTER_CYCLE[s])}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${FILTER_CFG[filterStatus].cls}`}
                  title="Lọc theo trạng thái (click để chuyển)"
                >
                  {FILTER_CFG[filterStatus].label}
                </button>

                <select
                  value={filterUserId}
                  onChange={e =>
                    setFilterUserId(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  className="bg-gray-100 dark:bg-[#3c3c3c] dark:text-[#d4d4d4] border border-gray-300 dark:border-[#474747] rounded-xl px-4 py-2 text-sm"
                >
                  <option value="all">Tất cả người dùng</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <div className="flex flex-col items-end">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#858585]" />
                    <input
                      type="date"
                      max={today}
                      value={filterDate === 'all' ? '' : filterDate}
                      onChange={e => {
                        if (e.target.value > today) {
                          setDateError('Chưa đến ngày báo cáo');
                          setFilterDate('all');
                        } else {
                          setDateError('');
                          setFilterDate(e.target.value ? e.target.value : 'all');
                        }
                      }}
                      className="pl-9 pr-3 py-2 border border-gray-300 dark:border-[#474747] rounded-xl text-sm bg-gray-100 dark:bg-[#3c3c3c] dark:text-[#d4d4d4]"
                    />
                  </div>
                  {dateError && (
                    <span className="text-xs text-red-500 mt-1">{dateError}</span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={
                  isReadOnly
                    ? 'Bạn đang xem (chưa chọn user)'
                    : 'Nhập báo cáo công việc...'
                }
                rows={3}
                className="flex-1 border border-gray-300 dark:border-[#474747] rounded-lg px-4 py-2 resize-none bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] placeholder-gray-400 dark:placeholder-[#858585]"
                disabled={isReadOnly || isLoading}
              />
              <button
                type="submit"
                disabled={isReadOnly || !message.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: Notes */}
        <div className="w-80 bg-white dark:bg-[#252526] border-l border-gray-200 dark:border-[#3c3c3c]">
          <NotesPanel />
        </div>
      </div>

      {/* User selection modal */}
      {showUserModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
            <div
              ref={modalRef}
              className="bg-white dark:bg-[#252526] p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4 border border-gray-200 dark:border-[#3c3c3c]"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-[#d4d4d4]">Bạn là ai?</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-500 dark:text-[#858585] hover:text-gray-700 dark:hover:text-[#d4d4d4]"
                >
                  <X className="w-4 h-4" />
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

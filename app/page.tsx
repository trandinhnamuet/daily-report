'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Users, X, Calendar, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

import UserSelector from '../components/UserSelector';
import ChatMessage from '../components/ChatMessage';
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
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const displayReports = reports
    .filter(r => {
      const byUser = filterUserId === 'all' ? true : r.user_id === filterUserId;
      const byDate =
        filterDate === 'all' ? true : r.created_at.slice(0, 10) === filterDate;
      return byUser && byDate;
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayReports]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, message);
  }, [message]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('fetch users failed');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('fetchUsers error:', err);
      setUsers([]);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('fetch reports failed');
      const data = await res.json();
      setReports(data);
      if (data.length) setReporterId(data[0].user_id);
    } catch (err) {
      console.error('fetchReports error:', err);
      setReports([]);
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
        setReports(prev => [newReport, ...prev]);
        setReporterId(newReport.user_id);
        setMessage('');
        localStorage.removeItem(DRAFT_KEY);
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
      }
    } catch (err) {
      console.error('deleteReport error:', err);
    }
  };

  const isReadOnly = !currentUserId;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Report Chat</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
        <div className="w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          <DocumentPanel />
        </div>

        {/* Center: Reports */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {displayReports.length ? (
              displayReports.map(r => (
                <ChatMessage
                  key={r.id}
                  report={r}
                  users={users}
                  onDelete={handleDeleteReport}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Không có báo cáo
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-3 gap-4">
              {currentUserId ? (
                <div className="flex items-center gap-2">
                  <span>
                    Đang dùng user: <b className="text-gray-800 dark:text-gray-200">{currentUserName}</b>
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
                <select
                  value={filterUserId}
                  onChange={e =>
                    setFilterUserId(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  className="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm"
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
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
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
                      className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
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
                className="flex-1 border dark:border-gray-600 rounded-lg px-4 py-2 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
        <div className="w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700">
          <NotesPanel />
        </div>
      </div>

      {/* User selection modal */}
      {showUserModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
            <div
              ref={modalRef}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full max-w-sm space-y-4"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bạn là ai?</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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

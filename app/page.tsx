'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Users } from 'lucide-react';
import Link from 'next/link';

import UserSelector from '../components/UserSelector';
import ChatMessage from '../components/ChatMessage';
import DocumentPanel from '../components/DocumentPanel';
import NotesPanel from '../components/NotesPanel';

import { useCurrentUser } from '@/app/provider/UserProvider';

/* =========================
   DEVICE UTILS
========================= */
function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

async function logDevice(userId: number) {
  try {
    await fetch('/api/device-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: getDeviceId(),
        user_id: userId,
      }),
    });
  } catch {}
}

/* ========================= */

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
  const [message, setMessage] = useState('');

  const [showUserModal, setShowUserModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changeError, setChangeError] = useState('');

  const [remember, setRemember] = useState(true);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);

  const [filterUserId, setFilterUserId] = useState<number | 'all'>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [dateError, setDateError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const {
    currentUserId,
    currentUserName,
    resetCurrentUser,
    setCurrentUser,
  } = useCurrentUser();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
    fetchReports();
  }, []);

  useEffect(() => {
    if (!users.length || hasCheckedUser) return;

    const id = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_id='))
      ?.split('=')[1];

    if (id) {
      const user = users.find(u => u.id === Number(id));
      if (user) {
        setCurrentUser(user);
        logDevice(user.id);
        setHasCheckedUser(true);
        return;
      }
    }

    resetCurrentUser();
    setShowUserModal(true);
    setHasCheckedUser(true);
  }, [users, hasCheckedUser, setCurrentUser, resetCurrentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reports]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      setUsers(await res.json());
    } catch {
      setUsers([]);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      setReports(await res.json());
    } catch {
      setReports([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !message.trim()) return;

    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUserId,
        message: message.trim(),
      }),
    });

    setMessage('');
    fetchReports();
  };

  const displayReports = reports
    .filter(r => {
      const byUser =
        filterUserId === 'all'
          ? true
          : r.user_id === filterUserId;

      const byDate =
        filterDate === 'all'
          ? true
          : r.created_at.slice(0, 10) === filterDate;

      return byUser && byDate;
    })
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

  const isReadOnly = !currentUserId;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b px-4 py-4 flex justify-between">
        <h1 className="text-2xl font-bold">Daily Report Chat</h1>
        <Link
          href="/users"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <Users className="w-4 h-4" />
          Quản lý Users
        </Link>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 bg-white border-r">
          <DocumentPanel />
        </div>

        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b px-4 py-3 flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white">
              {currentUserId ? (
                <>
                  <span>
                    Đang dùng user: <b>{currentUserName}</b>
                  </span>
                  <button
                    className="text-red-400 ml-2"
                    onClick={() => {
                      resetCurrentUser();
                      setShowUserModal(true);
                    }}
                  >
                    Đổi user
                  </button>
                  <button
                    className="text-blue-400 ml-3"
                    onClick={() => {
                      setOldPassword('');
                      setNewPassword('');
                      setChangeError('');
                      setShowChangePassword(true);
                    }}
                  >
                    Đổi mật khẩu
                  </button>
                </>
              ) : (
                <button
                  className="text-blue-400"
                  onClick={() => setShowUserModal(true)}
                >
                  Chọn user
                </button>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <select
                value={filterUserId}
                onChange={e =>
                  setFilterUserId(
                    e.target.value === 'all'
                      ? 'all'
                      : Number(e.target.value)
                  )
                }
                className="bg-transparent text-white outline-none text-sm"
              >
                <option value="all">Tất cả người dùng</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
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
                    setFilterDate(
                      e.target.value ? e.target.value : 'all'
                    );
                  }
                }}
                className="bg-transparent text-white outline-none text-sm"
              />
            </div>
          </div>

          {dateError && (
            <span className="block text-xs text-red-500 px-4 mt-1">
              {dateError}
            </span>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {displayReports.map(r => (
              <ChatMessage key={r.id} report={r} users={users} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                disabled={isReadOnly}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="flex-1 border rounded p-2"
              />
              <button
                disabled={isReadOnly || !message.trim()}
                className="bg-blue-600 text-white px-4 rounded"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="w-80 bg-white border-l">
          <NotesPanel />
        </div>
      </div>

      {/* POPUP: CHỌN USER */}
      {showUserModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
              <h2 className="font-bold text-lg">Bạn là ai?</h2>
              <UserSelector
                users={users}
                onSelected={user => {
                  setSelectedUser(user);
                  setPassword('');
                  setLoginError('');
                  setShowUserModal(false);
                  setShowLoginModal(true);
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {/* POPUP: LOGIN */}
      {showLoginModal && selectedUser &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
              <h2 className="font-bold text-lg">
                Đăng nhập – {selectedUser.name}
              </h2>

              <input
                type="password"
                placeholder="Mật khẩu (có thể bỏ trống)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />

              {loginError && (
                <p className="text-red-500 text-sm">{loginError}</p>
              )}

              <button
                className="w-full bg-blue-600 text-white py-2 rounded"
                onClick={async () => {
                  setLoginError('');

                  const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: selectedUser.id,
                      password,
                      device_id: getDeviceId(),
                      remember,
                    }),
                  });

                  if (!res.ok) {
                    setLoginError('Sai mật khẩu');
                    return;
                  }

                  setCurrentUser(selectedUser);
                  logDevice(selectedUser.id);
                  setShowLoginModal(false);
                  setHasCheckedUser(true);
                }}
              >
                Đăng nhập
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* POPUP: CHANGE PASSWORD */}
      {showChangePassword &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4">
              <h2 className="font-bold text-lg">Đổi mật khẩu</h2>

              <input
                type="password"
                placeholder="Mật khẩu cũ (nếu có)"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />

              <input
                type="password"
                placeholder="Mật khẩu mới (có thể bỏ trống)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />

              {changeError && (
                <p className="text-red-500 text-sm">{changeError}</p>
              )}

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-gray-300 py-2 rounded"
                  onClick={() => setShowChangePassword(false)}
                >
                  Huỷ
                </button>

                <button
                  className="flex-1 bg-blue-600 text-white py-2 rounded"
                  onClick={async () => {
                    setChangeError('');

                    const res = await fetch('/api/change-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_id: currentUserId,
                        old_password: oldPassword,
                        new_password: newPassword,
                      }),
                    });

                    if (!res.ok) {
                      setChangeError('Không đổi được mật khẩu');
                      return;
                    }

                    setShowChangePassword(false);
                  }}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Save,
  X,
  Monitor
} from 'lucide-react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Device {
  device_id: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  /** 🔽 DEVICE STATE */
  const [openDevicesUserId, setOpenDevicesUserId] = useState<number | null>(null);
  const [devicesMap, setDevicesMap] = useState<Record<number, Device[]>>({});

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    fetchUsers();
    channelRef.current = new BroadcastChannel('user-sync');
    return () => channelRef.current?.close();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  };

  /* ================= ADD USER ================= */
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim() }),
      });

      if (res.ok) {
        const user = await res.json();
        setUsers(prev => [...prev, user]);
        setNewUserName('');
        setShowAddForm(false);

        channelRef.current?.postMessage({
          type: 'user-created',
          payload: user,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= EDIT USER ================= */
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserName.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers(prev =>
          prev.map(u => (u.id === updated.id ? updated : u))
        );

        channelRef.current?.postMessage({
          type: 'user-updated',
          payload: updated,
        });

        setEditingUser(null);
        setEditUserName('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= DELETE USER ================= */
  const handleDeleteUser = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));

        channelRef.current?.postMessage({
          type: 'user-deleted',
          payload: { id },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

const toggleDevices = async (userId: number) => {
  // đóng nếu đang mở
  if (openDevicesUserId === userId) {
    setOpenDevicesUserId(null);
    return;
  }

  setOpenDevicesUserId(userId);

  // đã load rồi thì không fetch lại
  if (devicesMap[userId]) return;

  try {
    const res = await fetch(`/api/users/${userId}/devices`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    setDevicesMap(prev => ({
      ...prev,
      [userId]: data,
    }));
  } catch (err) {
    console.error('Load devices failed:', err);

    // để UI không bị treo
    setDevicesMap(prev => ({
      ...prev,
      [userId]: [],
    }));
  }
};


  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Chat
            </Link>
            <h1 className="text-2xl font-bold">Quản lý Users</h1>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm User
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {showAddForm && (
          <form
            onSubmit={handleAddUser}
            className="bg-white border rounded-lg p-6 mb-6 flex gap-4"
          >
            <input
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2"
              placeholder="Nhập tên user..."
              disabled={isLoading}
              autoFocus
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="bg-white border rounded-lg divide-y">
          {users.map(user => (
            <div key={user.id} className="px-6 py-4">
              {editingUser?.id === user.id ? (
                <form onSubmit={handleEditUser} className="flex gap-3">
                  <input
                    autoFocus
                    value={editUserName}
                    onChange={e => setEditUserName(e.target.value)}
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <button className="px-3 py-2 bg-blue-600 text-white rounded">
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-2 border rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{user.name}</div>

                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => toggleDevices(user.id)}
                        className="text-blue-600 text-sm flex items-center gap-1"
                      >
                        <Monitor className="w-4 h-4" />
                        Thiết bị đã đăng nhập
                      </button>

                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditUserName(user.name);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* 🔽 DEVICE LIST */}
                  {openDevicesUserId === user.id && (
                    <div className="mt-3 bg-gray-50 border rounded-lg p-3 space-y-2">
                      {devicesMap[user.id]?.length ? (
                        devicesMap[user.id].map((d, index) => {
                          const shortId = d.device_id.slice(0, 8);

                          return (
                            <div
                              key={d.device_id}
                              className="text-sm border-b last:border-b-0 pb-2"
                            >
                              <div className="font-medium text-gray-800 mb-1">
                                Thiết bị {index + 1} · ID: <span className="font-mono">{shortId}</span>
                              </div>

                              <div>
                                <b>Lần đầu:</b>{' '}
                                {d.first_seen_at
                                  ? new Date(d.first_seen_at).toLocaleString('vi-VN')
                                  : '—'}
                              </div>

                              <div>
                                <b>Gần nhất:</b>{' '}
                                {d.last_seen_at
                                  ? new Date(d.last_seen_at).toLocaleString('vi-VN')
                                  : '—'}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-gray-500">
                          Chưa có thiết bị nào
                        </div>
                      )}

                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

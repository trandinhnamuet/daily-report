'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

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
        channelRef.current?.postMessage({ type: 'user-created', payload: user });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        const { user: updated } = await res.json();
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        channelRef.current?.postMessage({ type: 'user-updated', payload: updated });
        setEditingUser(null);
        setEditUserName('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        channelRef.current?.postMessage({ type: 'user-deleted', payload: { id } });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1e1e1e]">
      <div className="bg-white dark:bg-[#3c3c3c] border-b border-gray-200 dark:border-[#474747]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="flex items-center shrink-0 text-gray-600 dark:text-[#cccccc] hover:text-gray-900 dark:hover:text-[#d4d4d4]"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Quay lại</span>
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-[#d4d4d4] truncate">Quản lý Users</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Thêm User</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {showAddForm && (
          <form
            onSubmit={handleAddUser}
            className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg p-6 mb-6 flex gap-4"
          >
            <input
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-[#474747] rounded-lg px-4 py-2 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] placeholder-gray-400 dark:placeholder-[#858585]"
              placeholder="Nhập tên user..."
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-[#474747] rounded-lg text-gray-700 dark:text-[#d4d4d4] hover:bg-gray-50 dark:hover:bg-[#2a2d2e]"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg divide-y divide-gray-100 dark:divide-[#3c3c3c]">
          {users.map(user => (
            <div key={user.id} className="px-6 py-4">
              {editingUser?.id === user.id ? (
                <form onSubmit={handleEditUser} className="flex gap-3">
                  <input
                    autoFocus
                    value={editUserName}
                    onChange={e => setEditUserName(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-[#474747] rounded px-3 py-2 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4]"
                  />
                  <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-2 border border-gray-300 dark:border-[#474747] rounded text-gray-700 dark:text-[#d4d4d4] hover:bg-gray-50 dark:hover:bg-[#2a2d2e]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="text-gray-900 dark:text-[#d4d4d4]">{user.name}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setEditUserName(user.name);
                      }}
                      className="p-1 text-gray-500 dark:text-[#858585] hover:text-gray-700 dark:hover:text-[#d4d4d4]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

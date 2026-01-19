'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchUsers();
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
        const updated = await res.json();
        setUsers(prev =>
          prev.map(u => (u.id === updated.id ? updated : u))
        );
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
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
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
          <form onSubmit={handleAddUser} className="bg-white border rounded-lg p-6 mb-6 flex gap-4">
            <input
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2"
              placeholder="Nhập tên user..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!newUserName.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewUserName('');
              }}
              className="px-4 py-2 border rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b font-semibold">
            Danh sách Users ({users.length})
          </div>

          <div className="divide-y divide-gray-200">
            {users.map(user => (
              <div key={user.id} className="px-6 py-4">
                {editingUser?.id === user.id ? (
                  <form onSubmit={handleEditUser} className="flex gap-3">
                    <input
                      value={editUserName}
                      onChange={e => setEditUserName(e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                      disabled={isLoading}
                    />
                    <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">
                      <Save className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setEditingUser(null)} className="px-3 py-2 border rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        ID: {user.id} • Tạo: {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingUser(user); setEditUserName(user.name); }}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {users.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                Chưa có user nào. Hãy thêm user đầu tiên!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

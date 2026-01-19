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

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserName, setEditUserName] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newUserName.trim()) return;

  setIsLoading(true);
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName.trim() }),
    });

    if (!response.ok) {
      let message = 'Failed to add user';

      try {
        const error = await response.json();
        message = error?.error || message;
      } catch {
      }

      alert(message);
      return;
    }
    const newUser = await response.json();

    if (typeof newUser?.id !== 'number') {
      console.error('Invalid user returned from backend:', newUser);
      alert('Dữ liệu user không hợp lệ.');
      return;
    }

    setUsers(prev => [...prev, newUser]);

    setNewUserName('');
    setShowAddForm(false);
  } catch (error) {
    console.error('Error adding user:', error);
    alert('Failed to add user');
  } finally {
    setIsLoading(false);
  }
};


  const handleEditUser = async (id: number) => {
    if (!editUserName.trim()) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserName.trim() }),
      });

      if (response.status === 404) {
        alert('Người dùng không tồn tại hoặc đã bị xoá.');
        return;
      }

      if (!response.ok) {
        alert('Không thể cập nhật người dùng.');
        return;
      }

      const updatedUser = await response.json();

      setUsers(prev =>
        prev.map(u => (u.id === id ? updatedUser : u))
      );

      setEditingUserId(null);
      setEditUserName('');
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Có lỗi xảy ra khi cập nhật.');
    }
  };

const handleDeleteUser = async (id: number) => {
  if (!confirm('Bạn có chắc muốn xoá người dùng này?')) return;

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (response.status === 404) {
      alert('Người dùng không tồn tại hoặc đã bị xoá.');
      return;
    }

    if (!response.ok) {
      alert('Không thể xoá người dùng.');
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== id));
  } catch (err) {
    console.error('Error deleting user:', err);
    alert('Có lỗi xảy ra khi xoá.');
  }
  setUsers(prev => prev.filter(u => u.id !== id));
};


  const cancelEdit = () => {
    setEditingUserId(null);
    setEditUserName('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại Chat
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Users</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm User
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Thêm User Mới</h2>
            <form onSubmit={handleAddUser} className="flex space-x-4">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nhập tên user..."
                className="flex-1 px-4 py-2 border rounded-lg"
                disabled={isLoading}
              />
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                <Save className="w-4 h-4 mr-2 inline" />
                Lưu
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
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border divide-y">
          {users.map((user) => (
            <div key={user.id} className="px-6 py-4">
              {editingUserId === user.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditUser(user.id);
                  }}
                  className="flex items-center space-x-4"
                >
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
                    <Save className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={cancelEdit} className="px-4 py-2 border rounded-md">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-500">ID: {user.id}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditUserName(user.name);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
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
  );
}

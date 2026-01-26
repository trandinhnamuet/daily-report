'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

/* ================= INTERFACES ================= */
interface User {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Device {
  id: number;
  device_id: string;
  device_name: string;
  last_login_at: string;
}

/* ================= TIME HELPER ================= */
function parseUtc(dateString: string) {
  return new Date(
    dateString.endsWith('Z') ? dateString : `${dateString}Z`
  );
}

/* ================= SUB COMPONENTS ================= */
function EmptyState() {
  return (
    <div className="text-sm text-gray-400 text-center py-4">
      Chưa có thiết bị nào đăng nhập
    </div>
  );
}

function DeviceList({
  devices,
  onLogout,
}: {
  devices: Device[];
  onLogout: (deviceId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {devices.map((d, index) => (
        <div
          key={d.device_id ?? `device-${index}`}
          className="border rounded-lg p-3 flex justify-between items-center"
        >
          <div>
            <div className="text-sm font-medium">
              {d.device_name || 'Không xác định'}
            </div>
            <div className="text-xs text-gray-500">
              Lần đăng nhập cuối:{' '}
              {parseUtc(d.last_login_at).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
              })}
            </div>
          </div>

          <button
            onClick={() => onLogout(d.device_id)}
            className="text-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================= PAGE ================= */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  /* ===== EDIT USER ===== */
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editOldPassword, setEditOldPassword] = useState(''); // ✅ thêm

  /* ===== THIẾT BỊ ===== */
  const [devices, setDevices] = useState<Device[]>([]);
  const [showDevicesUser, setShowDevicesUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
    channelRef.current = new BroadcastChannel('user-sync');
    return () => channelRef.current?.close();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  };

  const fetchDevices = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/devices`);
      if (!res.ok) {
        setDevices([]);
        return;
      }
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setDevices([]);
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!showDevicesUser) return;
    await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
    fetchDevices(showDevicesUser.id);
  };

  /* ================= DELETE USER ================= */
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
      {/* ===== HEADER ===== */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Chat
            </Link>
            <h1 className="text-2xl font-bold">Quản lý Users</h1>
          </div>

          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm user
          </button>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-lg divide-y">
          {users.map(user => (
            <div key={user.id} className="px-6 py-4">
              <div className="flex justify-between items-center">
                <div>{user.name}</div>

                <div className="flex gap-2 items-center">
                  {/* ✏️ EDIT */}
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setEditName(user.name);
                      setEditPassword('');
                      setEditOldPassword(''); // ✅ reset
                    }}
                    className="p-2 hover:bg-blue-100 rounded"
                  >
                    ✏️
                  </button>

                  {/* 🖥️ THIẾT BỊ */}
                  <button
                    onClick={() => {
                      setShowDevicesUser(user);
                      fetchDevices(user.id);
                    }}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    🖥️
                  </button>

                  {/* 🗑️ XOÁ */}
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL EDIT USER ================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
          <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">Chỉnh sửa user</h2>
              <button onClick={() => setEditingUser(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TÊN */}
            <div>
              <label className="text-sm">Tên</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            {/* MẬT KHẨU CŨ */}
            <div>
              <label className="text-sm">
                Mật khẩu cũ (chỉ nhập nếu muốn đổi mật khẩu)
              </label>
              <input
                type="password"
                value={editOldPassword}
                onChange={e => setEditOldPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            {/* MẬT KHẨU MỚI */}
            <div>
              <label className="text-sm">
                Mật khẩu mới (để trống nếu không đổi)
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            <button
              onClick={async () => {
                const payload: any = {};

                if (editName && editName !== editingUser.name) {
                  payload.name = editName;
                }

                if (editPassword) {
                  if (!editOldPassword) {
                    alert('Vui lòng nhập mật khẩu cũ');
                    return;
                  }
                  payload.oldPassword = editOldPassword;
                  payload.password = editPassword; // ✅ FIX Ở ĐÂY
                }

                if (Object.keys(payload).length === 0) {
                  alert('Không có thông tin nào được thay đổi');
                  return;
                }

                const res = await fetch(`/api/users/${editingUser.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                if (!res.ok) {
                  const err = await res.json();
                  alert(err.error || 'Cập nhật thất bại');
                  return;
                }

                setEditingUser(null);
                setEditOldPassword('');
                setEditPassword('');
                fetchUsers();
              }}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL ADD USER ================= */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
          <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">Thêm user mới</h2>
              <button onClick={() => setShowAddUser(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              placeholder="Tên user"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <input
              type="password"
              placeholder="Mật khẩu"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <button
              onClick={async () => {
                await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                  name: editName || undefined,
                  password: editPassword || undefined,
                  oldPassword: editOldPassword || undefined
                  }),
                });

                setEditName('');
                setEditPassword('');
                setShowAddUser(false);
                fetchUsers();
              }}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Tạo user
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

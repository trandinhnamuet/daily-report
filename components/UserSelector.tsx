'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Lock } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface UserSelectorProps {
  users: User[];
  onSelected: (user: User) => void;
}

export default function UserSelector({ users, onSelected }: UserSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // modal login
  const [showLogin, setShowLogin] = useState(true);

  // chỉ để xác định lần đầu hay user cũ
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ================= SELECT USER ================= */
  const selectUser = async (user: User) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
    setSearchTerm('');
    setPassword('');
    setError('');
    setHasPassword(null);

    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Không kiểm tra được mật khẩu');
        return;
      }

      setHasPassword(data.hasPassword);
    } catch {
      setError('Không kết nối được server');
    }
  };

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    if (!selectedUser || !password || loading) return;

    setLoading(true);
    setError('');

    try {
      // 🔥 LẦN ĐẦU → TẠO MẬT KHẨU
      if (hasPassword === false) {
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Tạo mật khẩu thất bại');
          return;
        }

        // ✅ coi như đăng nhập thành công
        onSelected(selectedUser);
        setShowLogin(false);
        return;
      }

      // 🔐 USER CŨ → LOGIN
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedUser.name,
          password,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setError(data?.error || 'Sai mật khẩu');
        return;
      }

      // ✅ SET USER CHO TOÀN APP
      const loggedUser = {
        id: data.user.id,
        name: data.user.name,
      };

      setSelectedUser(loggedUser);
      onSelected(loggedUser);
      setShowLogin(false);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  if (!showLogin) return null;

  return (
    <div className="space-y-3" ref={wrapperRef}>
      {/* ===== USER DROPDOWN ===== */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(p => !p)}
          className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <span>
              {selectedUser ? selectedUser.name : 'Chọn người báo cáo'}
            </span>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm người dùng..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== PASSWORD ===== */}
      {selectedUser && (
        <>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={
                hasPassword === false
                  ? 'Tạo mật khẩu mới'
                  : 'Nhập mật khẩu'
              }
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          {hasPassword === false && (
            <div className="text-sm text-blue-600">
              Lần đầu đăng nhập – vui lòng tạo mật khẩu
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}

          <button
            onClick={handleLogin}
            disabled={!password || loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading
              ? 'Đang xử lý...'
              : hasPassword === false
              ? 'Tạo mật khẩu'
              : 'Đăng nhập'}
          </button>
        </>
      )}
    </div>
  );
}

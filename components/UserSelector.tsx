'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

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
  const [selectedId, setSelectedId] = useState<string>('');

  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedUser =
    selectedId ? users.find(u => u.id.toString() === selectedId) ?? null : null;

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= SYNC COOKIE + USERS ================= */
  useEffect(() => {
    if (!users.length) return;

    const cookieId = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_id='))
      ?.split('=')[1];

    if (!cookieId) {
      setSelectedId('');
      return;
    }

    const exists = users.some(u => u.id.toString() === cookieId);
    setSelectedId(exists ? cookieId : '');
  }, [users]);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ================= REALTIME USER CHANGE ================= */
  useEffect(() => {
    if (!selectedId) return;

    const exists = users.some(u => u.id.toString() === selectedId);
    if (!exists) setSelectedId('');
  }, [users, selectedId]);

  /* ================= CHỌN USER ================= */
  const selectUser = (user: User) => {
    setSelectedId(user.id.toString());
    setSearchTerm('');
    setIsDropdownOpen(false);
    onSelected(user);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(p => !p)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span>{selectedUser ? selectedUser.name : 'Chọn người báo cáo'}</span>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {isDropdownOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg">
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
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                  selectedId === user.id.toString()
                    ? 'bg-blue-50 font-medium'
                    : ''
                }`}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

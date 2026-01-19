'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface UserSelectorProps {
  users: User[];
  onSelected?: () => void;
}

export default function UserSelector({ users, onSelected }: UserSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [forcePopup, setForcePopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedUser =
    selectedId ? users.find(u => u.id.toString() === selectedId) ?? null : null;

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔧 Check cookie khi vào
  useEffect(() => {
    const reporterId =
      document.cookie
        .split('; ')
        .find(c => c.startsWith('reporter_id='))
        ?.split('=')[1];

    if (reporterId) {
      setSelectedId(reporterId);
    } else {
      setForcePopup(true);
    }
  }, []);

  // close dropdown when click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectUser = async (user: User) => {
    setSelectedId(user.id.toString());

    await fetch('/api/reporter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
      }),
    });

    setSearchTerm('');
    setIsDropdownOpen(false);
    setForcePopup(false);
    onSelected?.();
  };

  /* ================= NORMAL SELECTOR ================= */
  const selectorUI = (
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
                className={`w-full px-4 py-2 text-left hover:bg-gray-100
                  ${selectedId === user.id.toString() ? 'bg-blue-50 font-medium' : ''}
                `}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ================= FORCE POPUP ================= */
  if (forcePopup) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-center mb-4">
            Bạn là ai?
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm người dùng..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50"
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return selectorUI;
}

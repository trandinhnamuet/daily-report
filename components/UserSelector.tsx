'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface UserSelectorProps {
  users: User[];
  defaultReporterId?: string | number;
  onSelected?: () => void;
}

export default function UserSelector({
  users,
  defaultReporterId,
  onSelected,
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string>(
    defaultReporterId ? String(defaultReporterId) : ''
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedUser =
    selectedId ? users.find(u => u.id.toString() === selectedId) ?? null : null;

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔧 SYNC COOKIE → STATE (BẮT BUỘC)
  useEffect(() => {
    const reporterId =
      document.cookie
        .split('; ')
        .find(c => c.startsWith('reporter_id='))
        ?.split('=')[1];

    if (reporterId) {
      setSelectedId(reporterId);
    }
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = async (user: User) => {
    try {
      setSelectedId(user.id.toString());

      await fetch('/api/reporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
        }),
      });

      onSelected?.();
      setIsOpen(false);
      setSearchTerm('');
    } catch {
      alert('Không thể chọn người báo cáo. Vui lòng thử lại.');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-900">
            {selectedUser ? selectedUser.name : 'Chọn người báo cáo'}
          </span>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500">
                Không tìm thấy người dùng
              </div>
            )}

            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none
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
}

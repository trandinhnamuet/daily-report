'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface UserSelectorProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
}

const STORAGE_KEY = 'currentUser';

export default function UserSelector({
  users,
  selectedUser,
  onUserSelect,
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    if (selectedUser) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const savedUser: User = JSON.parse(saved);

      const validUser = users.find(u => u.id === savedUser.id);
      if (validUser) {
        onUserSelect(validUser);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [users, selectedUser, onUserSelect]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleSelectUser = async (user: User) => {
  await fetch('/api/users/select', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', 
    body: JSON.stringify({ userId: user.id }),
  });

  onUserSelect(user);
  setIsOpen(false);
};


  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="px-4 py-2 text-gray-500 text-sm">
                Không tìm thấy người dùng
              </div>
            )}

            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
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

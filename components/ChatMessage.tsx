'use client';

import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
}

interface Report {
  id: number;
  message: string;
  created_at: string;
  user_id: number;
}

interface ChatMessageProps {
  report: Report;
  users: User[];
  onDelete: (id: number) => void;
}

export default function ChatMessage({ report, users, onDelete }: ChatMessageProps) {
  const formattedTime = format(new Date(report.created_at), 'HH:mm dd/MM/yyyy');
  const user = users.find(u => u.id === report.user_id);
  const displayName = user ? user.name : 'Người dùng đã bị xoá';
  const avatarChar = user ? user.name.charAt(0).toUpperCase() : '?';
  const colorIdx = report.id % 10;

  return (
    <div className={`flex flex-col space-y-1 p-4 rounded-lg mb-2 group msg-color-${colorIdx}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">{avatarChar}</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{displayName}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{formattedTime}</span>
        </div>
        <button
          onClick={() => onDelete(report.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
          title="Xóa báo cáo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="ml-10 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
        {report.message}
      </div>
    </div>
  );
}

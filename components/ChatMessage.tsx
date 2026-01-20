'use client';

import { format } from 'date-fns';

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
}

export default function ChatMessage({ report, users }: ChatMessageProps) {
  const formattedTime = format(
    new Date(report.created_at),
    'HH:mm dd/MM/yyyy'
  );

  const user = users.find(u => u.id === report.user_id);

  const displayName = user ? user.name : 'Người dùng đã bị xoá';
  const avatarChar = user ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col space-y-1 p-4 hover:bg-gray-50">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {avatarChar}
          </span>
        </div>

        <span className="font-medium text-gray-900">
          {displayName}
        </span>

        <span className="text-sm text-gray-500">
          {formattedTime}
        </span>
      </div>

      <div className="ml-10 text-gray-700 whitespace-pre-wrap">
        {report.message}
      </div>
    </div>
  );
}

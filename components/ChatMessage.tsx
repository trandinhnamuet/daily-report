'use client';

import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Trash2, MoreHorizontal, StickyNote, Clock, CheckCircle2 } from 'lucide-react';

export type Status = 'note' | 'todo' | 'done';

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
  status: Status;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Status) => void;
}

const CYCLE: Record<Status, Status> = { note: 'todo', todo: 'done', done: 'note' };

const STATUS_CFG = {
  note: {
    label: 'Ghi chú',
    Icon: StickyNote,
    card:   'bg-white border-gray-200 dark:bg-[#1e1e1e] dark:border-[#3c3c3c]',
    btn:    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-[#2d2d30] dark:text-[#858585] dark:hover:bg-[#37373d]',
  },
  todo: {
    label: 'Todo',
    Icon: Clock,
    card:   'bg-red-50 border-red-200 dark:bg-[#2a0f0f] dark:border-[#7f1d1d]',
    btn:    'bg-red-500 text-white hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600',
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    card:   'bg-green-50 border-green-200 dark:bg-[#0a1f14] dark:border-[#166534]',
    btn:    'bg-green-500 text-white hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-600',
  },
} as const;

export default function ChatMessage({ report, users, status, onDelete, onStatusChange }: ChatMessageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const formattedTime = format(new Date(report.created_at), 'HH:mm dd/MM/yyyy');
  const user = users.find(u => u.id === report.user_id);
  const displayName = user ? user.name : 'Người dùng đã bị xoá';
  const avatarChar = user ? user.name.charAt(0).toUpperCase() : '?';

  const cfg = STATUS_CFG[status];
  const StatusIcon = cfg.Icon;

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  return (
    <div className={`flex flex-col p-4 rounded-lg mb-2 border ${cfg.card}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">{avatarChar}</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-[#d4d4d4] truncate">{displayName}</span>
          <span className="text-sm text-gray-500 dark:text-[#858585] whitespace-nowrap">{formattedTime}</span>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0 ml-2" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#2a2d2e] text-gray-400 dark:text-[#858585] hover:text-gray-600 dark:hover:text-[#d4d4d4] transition-colors"
            title="Tùy chọn"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onDelete(report.id); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-[#2d1010] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xóa báo cáo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message body */}
      <div className="ml-10 mt-1 text-gray-700 dark:text-[#d4d4d4] whitespace-pre-wrap">
        {report.message}
      </div>

      {/* Status cycling button */}
      <div className="ml-10 mt-3">
        <button
          onClick={() => onStatusChange(report.id, CYCLE[status])}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 ${cfg.btn}`}
        >
          <StatusIcon className="w-4 h-4" />
          {cfg.label}
        </button>
      </div>
    </div>
  );
}

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
    card:    'border-gray-200 dark:border-[#3c3c3c]',
    content: 'bg-white dark:bg-[#1e1e1e]',
    strip:   'bg-gray-100 text-gray-400 border-l border-l-gray-200 hover:bg-gray-200 dark:bg-[#252525] dark:text-[#6b6b6b] dark:border-l-[#3c3c3c] dark:hover:bg-[#2a2d2e]',
  },
  todo: {
    label: 'Todo',
    Icon: Clock,
    card:    'border-red-300 dark:border-[#7f1d1d]',
    content: 'bg-red-50 dark:bg-[#2a0f0f]',
    strip:   'bg-red-500 text-white border-l border-l-red-400 hover:bg-red-600 dark:bg-[#7f1d1d] dark:border-l-[#991b1b] dark:hover:bg-[#991b1b]',
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    card:    'border-green-300 dark:border-[#166534]',
    content: 'bg-green-50 dark:bg-[#0a1f14]',
    strip:   'bg-green-500 text-white border-l border-l-green-400 hover:bg-green-600 dark:bg-[#14532d] dark:border-l-[#166534] dark:hover:bg-[#166534]',
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
    <div className={`flex mb-1 sm:mb-2 rounded-lg border overflow-hidden ${cfg.card}`}>

      {/* Left: message content */}
      <div className={`flex-1 p-2.5 sm:p-4 min-w-0 ${cfg.content}`}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs sm:text-sm font-semibold">{avatarChar}</span>
            </div>
            <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-[#d4d4d4] truncate">{displayName}</span>
            <span className="text-xs text-gray-500 dark:text-[#858585] whitespace-nowrap">{formattedTime}</span>
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0 ml-2" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 dark:text-[#858585] hover:text-gray-600 dark:hover:text-[#d4d4d4] transition-colors"
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
        <div className="ml-7 sm:ml-10 mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-700 dark:text-[#d4d4d4] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {report.message}
        </div>
      </div>

      {/* Right: status strip */}
      <button
        onClick={() => onStatusChange(report.id, CYCLE[status])}
        className={`w-9 sm:w-12 shrink-0 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-colors ${cfg.strip}`}
        title={`${cfg.label} — click để chuyển trạng thái`}
      >
        <StatusIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        <span className="[writing-mode:vertical-lr] text-[8px] sm:text-[10px] font-semibold leading-none">
          {cfg.label}
        </span>
      </button>

    </div>
  );
}

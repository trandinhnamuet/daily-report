'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Trash2, MoreHorizontal, StickyNote, Clock, CheckCircle2, UserCheck, CalendarClock, Link2 } from 'lucide-react';

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
  assignee_id: number | null;
  assignee_name: string | null;
  deadline: string | null;
}

type FontSize = 'xs' | 'sm' | 'base';

interface ChatMessageProps {
  report: Report;
  users: User[];
  status: Status;
  fontSize?: FontSize;
  isHighlighted?: boolean;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Status) => void;
  onAssigneeChange: (id: number, assignee_id: number | null, assignee_name: string | null) => void;
  onDeadlineChange: (id: number, deadline: string | null) => void;
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

const FONT_CLS: Record<FontSize, string> = {
  xs:   'text-xs  sm:text-sm',
  sm:   'text-sm  sm:text-sm',
  base: 'text-base sm:text-sm',
};

export default function ChatMessage({ report, users, status, fontSize = 'xs', isHighlighted, onDelete, onStatusChange, onAssigneeChange, onDeadlineChange }: ChatMessageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || !isHighlighted) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [isHighlighted]);

  const formattedTime = format(new Date(report.created_at), 'HH:mm dd/MM/yyyy');
  const user = users.find(u => u.id === report.user_id);
  const displayName = user ? user.name : 'Người dùng đã bị xoá';
  const avatarChar = user ? user.name.charAt(0).toUpperCase() : '?';

  const cfg = STATUS_CFG[status];
  const StatusIcon = cfg.Icon;

  const handleAssigneeChange = async (assigneeId: number | null) => {
    setEditingAssignee(false);
    const assigneeName = assigneeId ? (users.find(u => u.id === assigneeId)?.name ?? null) : null;
    onAssigneeChange(report.id, assigneeId, assigneeName);
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
    } catch { /* optimistic update already applied */ }
  };

  const handleDeadlineChange = async (deadline: string) => {
    setEditingDeadline(false);
    onDeadlineChange(report.id, deadline || null);
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadline || null }),
      });
    } catch { /* optimistic update already applied */ }
  };

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

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#report-${report.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setMenuOpen(false); }, 1500);
    }).catch(() => {});
  };

  return (
    <div
      id={`report-${report.id}`}
      ref={rootRef}
      className={`flex mb-1 sm:mb-2 rounded-lg border overflow-hidden ${cfg.card} ${isHighlighted ? 'highlight-report' : ''}`}
    >

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
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 dark:text-[#d4d4d4] hover:bg-gray-50 dark:hover:bg-[#2a2d2e] transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  {copied ? 'Đã copy!' : 'Lấy link'}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(report.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-[#2d1010] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa mục này
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Message body */}
        <div className={`ml-7 sm:ml-10 mt-0.5 sm:mt-1 text-gray-700 dark:text-[#d4d4d4] whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${FONT_CLS[fontSize]}`}>
          {report.message}
        </div>

        {/* Assignee + deadline row */}
        <div className="ml-7 sm:ml-10 mt-1.5 flex flex-wrap items-center gap-2">
          {/* Assignee */}
          {editingAssignee ? (
            <select
              autoFocus
              defaultValue={report.assignee_id ?? ''}
              onBlur={e => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
              onChange={e => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
              className="text-xs border border-purple-300 dark:border-[#6b3fa0] rounded px-1.5 py-0.5 bg-white dark:bg-[#2a1f3d] text-gray-900 dark:text-[#c084fc]"
            >
              <option value="">Không có người nhận</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          ) : (
            <button
              onClick={() => setEditingAssignee(true)}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                report.assignee_id
                  ? 'bg-purple-100 text-purple-700 dark:bg-[#2a1f3d] dark:text-[#c084fc] hover:bg-purple-200 dark:hover:bg-[#3a2a55]'
                  : 'bg-gray-100 text-gray-400 dark:bg-[#2d2d2d] dark:text-[#6b6b6b] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
              title="Gán người nhận"
            >
              <UserCheck className="w-3 h-3" />
              {report.assignee_name ?? 'Gán người nhận'}
            </button>
          )}

          {/* Deadline */}
          {editingDeadline ? (
            <input
              type="date"
              autoFocus
              defaultValue={report.deadline?.slice(0, 10) ?? ''}
              onBlur={e => handleDeadlineChange(e.target.value)}
              onChange={e => handleDeadlineChange(e.target.value)}
              className="text-xs border border-orange-300 dark:border-[#7c4a00] rounded px-1.5 py-0.5 bg-white dark:bg-[#2a1a00] text-gray-900 dark:text-[#fb923c]"
            />
          ) : (
            <button
              onClick={() => setEditingDeadline(true)}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                report.deadline
                  ? 'bg-orange-100 text-orange-700 dark:bg-[#2a1a00] dark:text-[#fb923c] hover:bg-orange-200 dark:hover:bg-[#3a2500]'
                  : 'bg-gray-100 text-gray-400 dark:bg-[#2d2d2d] dark:text-[#6b6b6b] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
              title="Đặt deadline"
            >
              <CalendarClock className="w-3 h-3" />
              {report.deadline ? format(new Date(report.deadline), 'dd/MM/yyyy') : 'Deadline'}
            </button>
          )}
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

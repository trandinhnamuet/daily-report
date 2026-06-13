'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, StickyNote, Clock, CheckCircle2, UserCheck, CalendarClock,
} from 'lucide-react';

type Status = 'note' | 'todo' | 'done';

interface Report {
  id: number;
  message: string;
  created_at: string;
  status: Status;
  user_id: number;
  user_name: string;
  assignee_id: number | null;
  assignee_name: string | null;
  deadline: string | null;
}

const STATUS_CFG: Record<Status, { label: string; Icon: typeof StickyNote; card: string; badge: string }> = {
  note: {
    label: 'Ghi chú',
    Icon: StickyNote,
    card:  'border-gray-200 dark:border-[#3c3c3c] bg-white dark:bg-[#1e1e1e]',
    badge: 'bg-gray-100 text-gray-500 dark:bg-[#252525] dark:text-[#9b9b9b]',
  },
  todo: {
    label: 'Todo',
    Icon: Clock,
    card:  'border-red-300 dark:border-[#7f1d1d] bg-red-50 dark:bg-[#2a0f0f]',
    badge: 'bg-red-500 text-white dark:bg-[#7f1d1d]',
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    card:  'border-green-300 dark:border-[#166534] bg-green-50 dark:bg-[#0a1f14]',
    badge: 'bg-green-500 text-white dark:bg-[#14532d]',
  },
};

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let mounted = true;
    fetch(`/api/reports/${id}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Report) => { if (mounted) { setReport(data); setState('ready'); } })
      .catch(() => { if (mounted) setState('notfound'); });
    return () => { mounted = false; };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1e1e1e] flex flex-col items-center px-4 py-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#858585] hover:text-gray-800 dark:hover:text-[#d4d4d4] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Về trang chính
        </Link>

        {state === 'loading' && (
          <div className="text-center py-20 text-gray-400 dark:text-[#858585] text-sm">Đang tải...</div>
        )}

        {state === 'notfound' && (
          <div className="text-center py-20 text-gray-500 dark:text-[#858585]">
            <p className="text-base font-medium mb-1">Không tìm thấy task</p>
            <p className="text-sm">Task này có thể đã bị xoá.</p>
          </div>
        )}

        {state === 'ready' && report && (() => {
          const cfg = STATUS_CFG[report.status ?? 'note'];
          const StatusIcon = cfg.Icon;
          const avatarChar = report.user_name ? report.user_name.charAt(0).toUpperCase() : '?';
          return (
            <div className={`rounded-xl border p-5 sm:p-7 ${cfg.card}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">{avatarChar}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-[#d4d4d4] truncate">
                      {report.user_name ?? 'Người dùng đã bị xoá'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-[#858585]">
                      {format(new Date(report.created_at), 'HH:mm dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
              </div>

              {/* Message */}
              <div className="text-gray-800 dark:text-[#d4d4d4] whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm sm:text-base leading-relaxed">
                {report.message}
              </div>

              {/* Assignee + deadline */}
              {(report.assignee_name || report.deadline) && (
                <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center gap-2">
                  {report.assignee_name && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-[#2a1f3d] dark:text-[#c084fc]">
                      <UserCheck className="w-3.5 h-3.5" />
                      {report.assignee_name}
                    </span>
                  )}
                  {report.deadline && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-[#2a1a00] dark:text-[#fb923c]">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {format(new Date(report.deadline), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

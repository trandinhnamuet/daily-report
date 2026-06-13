'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft, StickyNote, Clock, CheckCircle2, UserCheck, CalendarClock, Trash2,
} from 'lucide-react';

type Status = 'note' | 'todo' | 'done';

interface User { id: number; name: string; }

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

const STATUS_CFG: Record<Status, { label: string; Icon: typeof StickyNote; card: string; active: string }> = {
  note: {
    label: 'Ghi chú',
    Icon: StickyNote,
    card:   'border-gray-200 dark:border-[#3c3c3c] bg-white dark:bg-[#1e1e1e]',
    active: 'bg-gray-500 text-white border-gray-500',
  },
  todo: {
    label: 'Todo',
    Icon: Clock,
    card:   'border-red-300 dark:border-[#7f1d1d] bg-red-50 dark:bg-[#2a0f0f]',
    active: 'bg-red-500 text-white border-red-500',
  },
  done: {
    label: 'Done',
    Icon: CheckCircle2,
    card:   'border-green-300 dark:border-[#166534] bg-green-50 dark:bg-[#0a1f14]',
    active: 'bg-green-500 text-white border-green-500',
  },
};

const STATUS_ORDER: Status[] = ['note', 'todo', 'done'];

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch(`/api/reports/${id}`).then(res => { if (!res.ok) throw new Error(); return res.json(); }),
      fetch('/api/users').then(res => res.ok ? res.json() : []).catch(() => []),
    ])
      .then(([reportData, usersData]: [Report, User[]]) => {
        if (!mounted) return;
        setReport(reportData);
        setUsers(usersData);
        setState('ready');
      })
      .catch(() => { if (mounted) setState('notfound'); });
    return () => { mounted = false; };
  }, [id]);

  const handleStatusChange = async (status: Status) => {
    if (!report || report.status === status) return;
    setReport({ ...report, status });
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch { /* optimistic */ }
  };

  const handleAssigneeChange = async (assigneeId: number | null) => {
    if (!report) return;
    const assigneeName = assigneeId ? (users.find(u => u.id === assigneeId)?.name ?? null) : null;
    setReport({ ...report, assignee_id: assigneeId, assignee_name: assigneeName });
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
    } catch { /* optimistic */ }
  };

  const handleDeadlineChange = async (deadline: string) => {
    if (!report) return;
    setReport({ ...report, deadline: deadline || null });
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadline || null }),
      });
    } catch { /* optimistic */ }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm('Xoá task này?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) { router.push('/'); return; }
    } catch { /* fall through */ }
    setDeleting(false);
  };

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
          const avatarChar = report.user_name ? report.user_name.charAt(0).toUpperCase() : '?';
          return (
            <div className={`rounded-xl border p-5 sm:p-7 ${cfg.card}`}>
              {/* Header */}
              <div className="flex items-center gap-2.5 min-w-0 mb-4">
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

              {/* Message */}
              <div className="text-gray-800 dark:text-[#d4d4d4] whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm sm:text-base leading-relaxed">
                {report.message}
              </div>

              {/* Controls */}
              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 space-y-4">
                {/* Status */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-[#858585] mb-1.5">Trạng thái</div>
                  <div className="flex gap-2">
                    {STATUS_ORDER.map(s => {
                      const sc = STATUS_CFG[s];
                      const SIcon = sc.Icon;
                      const isActive = report.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            isActive
                              ? sc.active
                              : 'border-gray-200 dark:border-[#3c3c3c] text-gray-600 dark:text-[#d4d4d4] hover:bg-gray-100 dark:hover:bg-[#2a2d2e]'
                          }`}
                        >
                          <SIcon className="w-3.5 h-3.5" />
                          {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-[#858585] mb-1.5">Người nhận</div>
                  <div className="relative inline-block">
                    <UserCheck className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                    <select
                      value={report.assignee_id ?? ''}
                      onChange={e => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-purple-200 dark:border-[#6b3fa0] rounded-lg bg-purple-50 dark:bg-[#2a1f3d] text-gray-900 dark:text-[#c084fc]"
                    >
                      <option value="">Không có người nhận</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-[#858585] mb-1.5">Deadline</div>
                  <div className="relative inline-block">
                    <CalendarClock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                    <input
                      type="date"
                      value={report.deadline?.slice(0, 10) ?? ''}
                      onChange={e => handleDeadlineChange(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-orange-200 dark:border-[#7c4a00] rounded-lg bg-orange-50 dark:bg-[#2a1a00] text-gray-900 dark:text-[#fb923c]"
                    />
                  </div>
                </div>

                {/* Delete */}
                <div className="pt-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-[#2d1010] transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Đang xoá...' : 'Xoá task này'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

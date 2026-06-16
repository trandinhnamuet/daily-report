'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import ChatMessage, { type Status } from '@/components/ChatMessage';

interface User { id: number; name: string; }

interface Report {
  id: number;
  public_id: string;
  message: string;
  created_at: string;
  status: Status;
  user_id: number;
  user_name: string;
  assignee_id: number | null;
  assignee_name: string | null;
  deadline: string | null;
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: publicId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch(`/api/reports/by-public/${publicId}`).then(res => { if (!res.ok) throw new Error(); return res.json(); }),
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
  }, [publicId]);

  const handleStatusChange = async (rid: number, status: Status) => {
    setReport(prev => prev ? { ...prev, status } : prev);
    try {
      await fetch(`/api/reports/${rid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch { /* optimistic */ }
  };

  const handleAssigneeChange = (_rid: number, assignee_id: number | null, assignee_name: string | null) => {
    setReport(prev => prev ? { ...prev, assignee_id, assignee_name } : prev);
  };

  const handleDeadlineChange = (_rid: number, deadline: string | null) => {
    setReport(prev => prev ? { ...prev, deadline } : prev);
  };

  const handleDelete = async (rid: number) => {
    try {
      const res = await fetch(`/api/reports/${rid}`, { method: 'DELETE' });
      if (res.ok) { router.push('/'); return; }
    } catch { /* ignore */ }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gray-50 dark:bg-[#1e1e1e] flex flex-col items-center px-4 py-6 sm:py-12">
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

        {state === 'ready' && report && (
          <ChatMessage
            report={report}
            users={users}
            status={report.status ?? 'note'}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onDeadlineChange={handleDeadlineChange}
          />
        )}
      </div>
    </div>
  );
}

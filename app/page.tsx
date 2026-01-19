'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Users } from 'lucide-react';
import Link from 'next/link';
import UserSelector from '../components/UserSelector';
import ChatMessage from '../components/ChatMessage';
import DocumentPanel from '../components/DocumentPanel';
import NotesPanel from '../components/NotesPanel';

interface User {
  id: number;
  name: string;
}

interface Report {
  id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_id: number;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reporterId, setReporterId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchUsers();
    fetchReports();

    const id = document.cookie
      .split('; ')
      .find(c => c.startsWith('reporter_id='))
      ?.split('=')[1];

    if (id) setReporterId(Number(id));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [reports]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch {}
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const id = document.cookie
      .split('; ')
      .find(c => c.startsWith('reporter_id='))
      ?.split('=')[1];

    if (!id || !message.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(id),
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports(prev => [newReport, ...prev]);
        setMessage('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-white shadow-sm border-b z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Daily Report Chat</h1>
          <Link
            href="/users"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Quản lý Users
          </Link>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 bg-white border-r flex flex-col min-h-0">
          <DocumentPanel />
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {reports.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {(() => {
                  return reports.slice().reverse().map(report => (
                    <ChatMessage key={report.id} report={report} />
                  ));
                })()}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Chưa có báo cáo nào
              </div>
            )}
          </div>

          <div className="border-t p-4 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="w-full max-w-xs">
                <UserSelector
                  users={users}
                    defaultReporterId={reporterId ?? undefined}
/>
              </div>

              <div className="flex space-x-2">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Nhập báo cáo công việc..."
                  rows={3}
                  className="flex-1 px-4 py-2 border rounded-lg resize-none"
                  disabled={!reporterId || isLoading}
                />
                <button
                  type="submit"
                  disabled={!reporterId || !message.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="w-80 bg-white border-l flex flex-col min-h-0">
          <NotesPanel />
        </div>
      </div>
    </div>
  );
}

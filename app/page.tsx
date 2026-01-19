'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchUsers();
    fetchReports();
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
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
      //h
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !message.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports(prev => [newReport, ...prev]);
        setMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header - Fixed height */}
      <div className="bg-white shadow-sm border-b z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Daily Report Chat</h1>
            <Link
              href="/users"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Users className="w-4 h-4 mr-2" />
              Quản lý Users
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout: 3 Columns - Full height remaining */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - DocumentPanel */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col min-h-0">
          <DocumentPanel />
        </div>

        {/* Center - Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {reports.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {(() => {
                  let lastDate = '';
                  return reports.slice().reverse().map((report, idx, arr) => {
                    const currentDate = new Date(report.created_at).toISOString().slice(0, 10);
                    const showDivider = idx === 0 || currentDate !== new Date(arr[idx - 1].created_at).toISOString().slice(0, 10);
                    return (
                      <div key={report.id}>
                        {showDivider && (
                          <div className="w-full flex items-center my-4">
                            <div className="flex-grow border-t border-gray-300" />
                            <span className="mx-4 text-xs text-gray-400 font-medium">
                              {new Date(report.created_at).toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </span>
                            <div className="flex-grow border-t border-gray-300" />
                          </div>
                        )}
                        <ChatMessage report={report} />
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Chưa có báo cáo nào. Hãy bắt đầu báo cáo công việc!
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4 shrink-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="w-full max-w-xs">
                <UserSelector
                  users={users}
                  selectedUser={selectedUser}
                  onUserSelect={setSelectedUser}
                />
              </div>
              <div className="flex space-x-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập báo cáo công việc của bạn..."
                  rows={3}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-400"
                  disabled={!selectedUser || isLoading}
                />
                <button
                  type="submit"
                  disabled={!selectedUser || !message.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Sidebar - NotesPanel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col min-h-0">
          <NotesPanel />
        </div>
      </div>
    </div>
  );
}
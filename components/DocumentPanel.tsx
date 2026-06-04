'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: number;
  detail: string;
  created_at: string;
}

export default function DocumentPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const DRAFT_KEY = 'draft_document';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('docpanel_expanded');
    return saved === null ? true : saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, message);
  }, [message]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detail: message.trim() }),
      });

      if (response.ok) {
        const newDocument = await response.json();
        setDocuments(prev => [newDocument, ...prev]);
        setMessage('');
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (error) {
      console.error('Error sending document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full bg-white dark:bg-[#252526] flex flex-col h-full transition-all duration-200 ${expanded ? '' : 'h-[56px] min-h-0 overflow-hidden'}`}>
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200 dark:border-[#3c3c3c] flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(v => {
          const next = !v;
          localStorage.setItem('docpanel_expanded', String(next));
          return next;
        })}
      >
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#d4d4d4]">Tài liệu</h2>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-[#858585]" />
          : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-[#858585]" />}
      </div>

      {expanded && (
        <>
          {/* Documents List */}
          <div className="flex-1 overflow-y-auto">
            {documents.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-[#3c3c3c]">
                {documents.slice().reverse().map(doc => (
                  <div key={doc.id} className="p-3 hover:bg-gray-50 dark:hover:bg-[#2a2d2e] relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500 dark:text-[#858585] mb-1">
                          {format(new Date(doc.created_at), 'HH:mm dd/MM/yyyy')}
                        </div>
                        <div className="text-gray-800 dark:text-[#d4d4d4] text-sm whitespace-pre-wrap break-words">
                          {doc.detail}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-[#2d1010] text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity mt-0.5"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-[#858585] text-sm">
                Chưa có tài liệu nào
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-4 border-t border-gray-200 dark:border-[#3c3c3c]">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Nhập tên tài liệu và link..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#474747] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-[#d4d4d4] bg-white dark:bg-[#2d2d30] placeholder-gray-400 dark:placeholder-[#858585]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Thêm tài liệu
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

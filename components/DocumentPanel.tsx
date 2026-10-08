'use client';

import { useState, useEffect, useRef } from 'react';
import { useAutoResize } from '../hooks/useAutoResize';
import { Send, FileText, ChevronDown, ChevronUp, Trash2, CloudUpload } from 'lucide-react';
import { format } from 'date-fns';
import OfflineBadge from './OfflineBadge';
import { documentsStore } from '@/lib/offlineLists';

export default function DocumentPanel() {
  const documents = documentsStore.useItems();
  const DRAFT_KEY = 'draft_document';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('docpanel_expanded');
    return saved === null ? true : saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageTextareaRef = useAutoResize(message);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, message);
  }, [message]);

  useEffect(() => {
    documentsStore.sync();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [documents]);

  // Thêm/xoá đều đi qua hàng đợi offline → mất mạng vẫn ghi được, có mạng tự đồng bộ
  const handleDelete = (id: number) => documentsStore.remove(id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    documentsStore.add(message.trim());
    setMessage('');
    localStorage.removeItem(DRAFT_KEY);
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
          <OfflineBadge kind="document" />
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
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#858585] mb-1">
                          {format(new Date(doc.created_at), 'HH:mm dd/MM/yyyy')}
                          {doc.pending && (
                            <span title="Chưa đồng bộ lên server">
                              <CloudUpload className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                        {/* overflow-wrap:anywhere: link dài không có dấu cách vẫn xuống dòng, không đẩy vỡ khung trên mobile */}
                        <div className="text-gray-800 dark:text-[#d4d4d4] text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
                ref={messageTextareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Nhập tên tài liệu và link..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#474747] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-[#d4d4d4] bg-white dark:bg-[#2d2d30] placeholder-gray-400 dark:placeholder-[#858585] overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!message.trim()}
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

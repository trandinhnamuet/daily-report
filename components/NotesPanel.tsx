'use client';

import { useState, useEffect, useRef } from 'react';
import { useAutoResize } from '../hooks/useAutoResize';
import { Send, StickyNote, ChevronDown, ChevronUp, Trash2, CloudOff, Clock } from 'lucide-react';
import { format } from 'date-fns';
import MarkdownMessage from './MarkdownMessage';
import { useNotes, syncNotes, addNote, updateNote, deleteNote } from '@/lib/notesOffline';

export default function NotesPanel() {
  const { notes, online, pendingCount } = useNotes();
  const DRAFT_KEY = 'draft_note';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('notespanel_expanded');
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
    syncNotes();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [notes]);

  // Thêm/sửa/xoá đều đi qua hàng đợi offline → mất mạng vẫn ghi được, có mạng tự đồng bộ
  const handleDelete = (id: number) => deleteNote(id);

  // Tick/untick checkbox trong ghi chú → lưu nguyên văn mới
  const handleTaskToggle = (id: number, newNote: string) => updateNote(id, newNote);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    addNote(message.trim());
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
          localStorage.setItem('notespanel_expanded', String(next));
          return next;
        })}
      >
        <div className="flex items-center space-x-2">
          <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#d4d4d4]">Ghi chú</h2>
          {!online && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500" title="Đang offline — ghi chú được lưu trên máy">
              <CloudOff className="w-3.5 h-3.5" />
              Offline
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-[#858585]" title="Số thay đổi chờ đồng bộ">
              {pendingCount} chờ đồng bộ
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-[#858585]" />
          : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-[#858585]" />}
      </div>

      {expanded && (
        <>
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {notes.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-[#3c3c3c]">
                {notes.slice().reverse().map(note => (
                  <div key={note.id} className="p-3 hover:bg-gray-50 dark:hover:bg-[#2a2d2e] relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#858585] mb-1">
                          {format(new Date(note.created_at), 'HH:mm dd/MM/yyyy')}
                          {note.pending && (
                            <span title="Chưa đồng bộ lên server">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="text-gray-800 dark:text-[#d4d4d4] text-sm whitespace-pre-wrap break-words">
                          <MarkdownMessage text={note.note} onToggleTask={t => handleTaskToggle(note.id, t)} />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-[#2d1010] text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity mt-0.5"
                        title="Xóa ghi chú"
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
                Chưa có ghi chú nào
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
                placeholder="Nhập ghi chú..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#474747] rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none text-gray-900 dark:text-[#d4d4d4] bg-white dark:bg-[#2d2d30] placeholder-gray-400 dark:placeholder-[#858585] overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="w-full px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Thêm ghi chú
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

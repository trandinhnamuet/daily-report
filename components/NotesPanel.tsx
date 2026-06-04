'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, StickyNote, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: number;
  note: string;
  created_at: string;
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const DRAFT_KEY = 'draft_note';
  const [message, setMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('notespanel_expanded');
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
    fetchNotes();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [notes]);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: message.trim() }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes(prev => [newNote, ...prev]);
        setMessage('');
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (error) {
      console.error('Error sending note:', error);
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
          localStorage.setItem('notespanel_expanded', String(next));
          return next;
        })}
      >
        <div className="flex items-center space-x-2">
          <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#d4d4d4]">Ghi chú</h2>
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
                        <div className="text-sm text-gray-500 dark:text-[#858585] mb-1">
                          {format(new Date(note.created_at), 'HH:mm dd/MM/yyyy')}
                        </div>
                        <div className="text-gray-800 dark:text-[#d4d4d4] text-sm whitespace-pre-wrap break-words">
                          {note.note}
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
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Nhập ghi chú..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#474747] rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none text-gray-900 dark:text-[#d4d4d4] bg-white dark:bg-[#2d2d30] placeholder-gray-400 dark:placeholder-[#858585]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
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

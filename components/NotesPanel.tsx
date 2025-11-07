'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: number;
  note: string;
  created_at: string;
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: message.trim(),
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes(prev => [newNote, ...prev]);
        setMessage('');
      } else {
        console.error('Failed to send note');
      }
    } catch (error) {
      console.error('Error sending note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-80 bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-200 ${expanded ? '' : 'h-[56px] min-h-0 overflow-hidden'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center space-x-2">
          <StickyNote className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">Ghi chú</h2>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>
      {expanded && (
        <>
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {notes.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notes.slice().reverse().map((note) => (
                  <div key={note.id} className="p-3 hover:bg-gray-50">
                    <div className="text-sm text-gray-500 mb-1">
                      {format(new Date(note.created_at), 'HH:mm dd/MM/yyyy')}
                    </div>
                    <div className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                      {note.note}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Chưa có ghi chú nào
              </div>
            )}
          </div>
          {/* Input Form */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập ghi chú..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none text-gray-900 placeholder-gray-400"
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
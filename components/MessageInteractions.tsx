'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Eye, MessageCircle, Send, SmilePlus, Trash2, Pencil, Check, X } from 'lucide-react';

import { useCurrentUser } from '@/app/provider/UserProvider';
import {
  adjustCommentCount,
  markRead,
  toggleReaction,
  useInteractions,
} from '@/lib/interactionsStore';

/** Giống thanh cảm xúc Messenger — phải khớp ALLOWED_EMOJIS ở lib/interactions.ts */
const EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '😡'];

interface Comment {
  id: number;
  report_id: number;
  user_id: number | null;
  user_name: string;
  content: string;
  created_at: string;
}

interface MessageInteractionsProps {
  reportId: number;
  /** Người tạo note/task — không tự đánh dấu đã đọc bài của chính mình */
  authorId: number;
}

export default function MessageInteractions({ reportId, authorId }: MessageInteractionsProps) {
  const { currentUserId } = useCurrentUser();
  const { reactions, readers, comment_count } = useInteractions(reportId);

  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [showReaders, setShowReaders] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const myEmoji = currentUserId
    ? reactions.find(g => g.users.some(u => u.id === currentUserId))?.emoji ?? null
    : null;

  /* ── Đã đọc: message nằm trong khung nhìn ≥1s thì tính là đã đọc ── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !currentUserId || currentUserId === authorId) return;
    if (readers.some(r => r.id === currentUserId)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (visible && !timer) {
          timer = setTimeout(() => { markRead(reportId); observer.disconnect(); }, 1000);
        } else if (!visible && timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => { if (timer) clearTimeout(timer); observer.disconnect(); };
  }, [reportId, authorId, currentUserId, readers]);

  /* ── Picker cảm xúc (portal vì thẻ message có overflow-hidden) ── */
  const updatePickerPos = useCallback(() => {
    const rect = pickerBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 232;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPickerPos({ top: rect.top - 46, left });
  }, []);

  useEffect(() => {
    if (!pickerPos) return;
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerBtnRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      setPickerPos(null);
    };
    const close = () => setPickerPos(null);
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pickerPos]);

  const handleReact = async (emoji: string) => {
    setPickerPos(null);
    if (!currentUserId) return;
    try { await toggleReaction(reportId, emoji); }
    catch { /* giữ nguyên trạng thái cũ */ }
  };

  const readOnly = !currentUserId;

  return (
    <div ref={rootRef} className="ml-7 sm:ml-10 mt-1.5">
      {/* ── Hàng cảm xúc + comment + đã đọc ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {reactions.map(group => {
          const mine = currentUserId ? group.users.some(u => u.id === currentUserId) : false;
          return (
            <button
              key={group.emoji}
              onClick={() => handleReact(group.emoji)}
              disabled={readOnly}
              title={group.users.map(u => u.name).join(', ')}
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors disabled:cursor-default ${
                mine
                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-[#0d2847] dark:border-[#1d4ed8] dark:text-[#60a5fa]'
                  : 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-[#2d2d2d] dark:border-[#3c3c3c] dark:text-[#c5c5c5] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              <span className="leading-none">{group.emoji}</span>
              <span className="font-medium leading-none">{group.count}</span>
            </button>
          );
        })}

        {/* Thả cảm xúc */}
        <button
          ref={pickerBtnRef}
          onClick={() => (pickerPos ? setPickerPos(null) : updatePickerPos())}
          disabled={readOnly}
          className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors disabled:opacity-40 disabled:cursor-default ${
            myEmoji
              ? 'text-blue-600 dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-[#0d2847]'
              : 'text-gray-400 dark:text-[#6b6b6b] hover:bg-gray-100 dark:hover:bg-[#2d2d2d] hover:text-gray-600 dark:hover:text-[#c5c5c5]'
          }`}
          title={readOnly ? 'Chọn user để thả cảm xúc' : 'Thả cảm xúc'}
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowComments(v => !v)}
          className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
            comment_count > 0
              ? 'text-blue-600 dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-[#0d2847]'
              : 'text-gray-400 dark:text-[#6b6b6b] hover:bg-gray-100 dark:hover:bg-[#2d2d2d] hover:text-gray-600 dark:hover:text-[#c5c5c5]'
          }`}
          title="Bình luận"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {comment_count > 0 && <span className="font-medium leading-none">{comment_count}</span>}
        </button>

        {/* Đã đọc */}
        {readers.length > 0 && (
          <button
            onClick={() => setShowReaders(v => !v)}
            title={readers.map(r => r.name).join(', ')}
            className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-gray-400 dark:text-[#6b6b6b] hover:bg-gray-100 dark:hover:bg-[#2d2d2d] hover:text-gray-600 dark:hover:text-[#c5c5c5] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="font-medium leading-none">{readers.length}</span>
          </button>
        )}
      </div>

      {showReaders && readers.length > 0 && (
        <div className="mt-1 text-[11px] text-gray-500 dark:text-[#858585]">
          Đã đọc: {readers.map(r => r.name).join(', ')}
        </div>
      )}

      {showComments && <CommentThread reportId={reportId} />}

      {pickerPos && createPortal(
        <div
          ref={pickerRef}
          style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left }}
          className="flex items-center gap-1 bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-full shadow-lg px-2 py-1.5 z-50"
        >
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`w-8 h-8 flex items-center justify-center text-lg rounded-full transition-transform hover:scale-125 ${
                myEmoji === emoji ? 'bg-blue-100 dark:bg-[#0d2847]' : ''
              }`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ═══════════════ Comment thread ═══════════════ */

function CommentThread({ reportId }: { reportId: number }) {
  const { currentUserId } = useCurrentUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`/api/reports/${reportId}/comments`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: Comment[]) => { if (mounted) setComments(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reportId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Không gửi được bình luận');
        return;
      }
      const created: Comment = await res.json();
      setComments(prev => [...prev, created]);
      adjustCommentCount(reportId, 1);
      setDraft('');
    } catch {
      setError('Không gửi được bình luận');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setComments(prev => prev.filter(c => c.id !== id));
      adjustCommentCount(reportId, -1);
    } catch { /* ignore */ }
  };

  const handleSaveEdit = async (id: number) => {
    const content = editDraft.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const updated: Comment = await res.json();
      setComments(prev => prev.map(c => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch { /* ignore */ }
  };

  return (
    <div className="mt-2 border-l-2 border-gray-200 dark:border-[#3c3c3c] pl-2.5 space-y-2">
      {loading && <div className="text-[11px] text-gray-400 dark:text-[#6b6b6b]">Đang tải bình luận...</div>}

      {!loading && comments.length === 0 && (
        <div className="text-[11px] text-gray-400 dark:text-[#6b6b6b]">Chưa có bình luận nào</div>
      )}

      {comments.map(comment => {
        const mine = currentUserId != null && comment.user_id === currentUserId;
        return (
          <div key={comment.id} className="group flex items-start gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-[#4e4e4e] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-semibold">
                {comment.user_name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-medium text-gray-800 dark:text-[#d4d4d4]">
                  {comment.user_name}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-[#6b6b6b]">
                  {format(new Date(comment.created_at), 'HH:mm dd/MM')}
                </span>
              </div>

              {editingId === comment.id ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    autoFocus
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(comment.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 min-w-0 text-xs border border-gray-300 dark:border-[#474747] rounded px-1.5 py-0.5 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4]"
                  />
                  <button onClick={() => handleSaveEdit(comment.id)} className="p-0.5 text-green-600 hover:text-green-700" title="Lưu">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-0.5 text-gray-400 hover:text-gray-600" title="Huỷ">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-700 dark:text-[#c5c5c5] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {comment.content}
                </div>
              )}
            </div>

            {mine && editingId !== comment.id && (
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingId(comment.id); setEditDraft(comment.content); }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-[#d4d4d4]"
                  title="Sửa"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                  title="Xoá"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {error && <div className="text-[11px] text-red-500">{error}</div>}

      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={currentUserId ? 'Viết bình luận...' : 'Chọn user để bình luận'}
          disabled={!currentUserId || sending}
          className="flex-1 min-w-0 text-xs border border-gray-300 dark:border-[#474747] rounded-full px-2.5 py-1 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] placeholder-gray-400 dark:placeholder-[#6b6b6b] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!currentUserId || !draft.trim() || sending}
          className="p-1 rounded-full text-blue-600 dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-[#0d2847] disabled:opacity-40 disabled:hover:bg-transparent"
          title="Gửi"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

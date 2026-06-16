'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Lock } from 'lucide-react';

const STORAGE_KEY = 'app_password';

async function verify(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Khi mount: thử mật khẩu đã lưu. Đúng → mở luôn; sai/không có → khoá.
  useEffect(() => {
    let mounted = true;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!saved) { setStatus('locked'); return; }
    verify(saved).then(ok => {
      if (!mounted) return;
      if (ok) {
        setStatus('unlocked');
      } else {
        localStorage.removeItem(STORAGE_KEY); // pass đã đổi → xoá pass cũ
        setStatus('locked');
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !input) return;
    setSubmitting(true);
    setError(false);
    const ok = await verify(input);
    setSubmitting(false);
    if (ok) {
      localStorage.setItem(STORAGE_KEY, input);
      setStatus('unlocked');
    } else {
      setError(true);
    }
  };

  if (status === 'unlocked') return <>{children}</>;

  if (status === 'checking') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-[#1e1e1e] text-gray-400 dark:text-[#858585] text-sm">
        Đang kiểm tra...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-[#1e1e1e] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#3c3c3c] rounded-xl shadow-lg p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-gray-900 dark:text-[#d4d4d4]">
          <Lock className="w-5 h-5" />
          <h1 className="text-lg font-bold">Nhập mật khẩu</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-[#858585]">
          Cần mật khẩu để xem toàn bộ công việc.
        </p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          placeholder="Mật khẩu"
          className="w-full border border-gray-300 dark:border-[#474747] rounded-lg px-3 py-2 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-sm text-red-500">Mật khẩu không đúng.</p>}
        <button
          type="submit"
          disabled={submitting || !input}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Đang kiểm tra...' : 'Vào'}
        </button>
      </form>
    </div>
  );
}

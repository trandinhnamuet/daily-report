'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Lock } from 'lucide-react';

// Cờ local chỉ để mở khoá ngay khi mở app (tránh nháy màn "Đang kiểm tra")
// và để không khoá người dùng khi offline. Nguồn sự thật là cookie httpOnly.
const UNLOCKED_KEY = 'app_unlocked';
// Bản cũ lưu thẳng mật khẩu ở localStorage — đọc 1 lần để đổi lấy cookie rồi xoá.
const LEGACY_PASSWORD_KEY = 'app_password';

type Verdict = 'ok' | 'denied' | 'unknown';

const readFlag = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeFlag = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
};
const clearFlag = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* private mode */ }
};

// 'unknown' = không hỏi được server (mất mạng, 5xx, cold start lỗi).
// Phân biệt với 'denied' là điểm mấu chốt: trước đây mọi lỗi đều bị coi là sai
// mật khẩu nên chỉ cần rớt mạng một nhịp là user phải nhập lại.
async function checkSession(): Promise<Verdict> {
  try {
    const res = await fetch('/api/auth/verify', { cache: 'no-store' });
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data.ok ? 'ok' : 'denied';
  } catch {
    return 'unknown';
  }
}

async function submitPassword(password: string): Promise<Verdict> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data.ok ? 'ok' : 'denied';
  } catch {
    return 'unknown';
  }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [input, setInput] = useState('');
  const [error, setError] = useState<'wrong' | 'network' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const wasUnlocked = readFlag(UNLOCKED_KEY) === 'true';
      // Từng mở khoá trên máy này → cho vào ngay, vẫn xác thực lại ở nền.
      if (wasUnlocked) setStatus('unlocked');

      let verdict = await checkSession();

      // Không có cookie nhưng còn mật khẩu bản cũ → tự đổi lấy cookie, khỏi bắt nhập lại.
      if (verdict === 'denied') {
        const legacy = readFlag(LEGACY_PASSWORD_KEY);
        if (legacy) {
          verdict = await submitPassword(legacy);
          if (verdict === 'ok') clearFlag(LEGACY_PASSWORD_KEY);
        }
      }

      if (!mounted) return;

      if (verdict === 'ok') {
        writeFlag(UNLOCKED_KEY, 'true');
        setStatus('unlocked');
        return;
      }

      // Chỉ khoá lại khi server khẳng định không hợp lệ.
      if (verdict === 'denied') {
        clearFlag(UNLOCKED_KEY);
        clearFlag(LEGACY_PASSWORD_KEY);
        setStatus('locked');
        return;
      }

      // 'unknown': giữ nguyên trạng thái cũ, tuyệt đối không xoá cờ đã mở khoá.
      setStatus(wasUnlocked ? 'unlocked' : 'locked');
    })();

    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !input) return;
    setSubmitting(true);
    setError(null);
    const verdict = await submitPassword(input);
    setSubmitting(false);
    if (verdict === 'ok') {
      writeFlag(UNLOCKED_KEY, 'true');
      setStatus('unlocked');
    } else {
      setError(verdict === 'denied' ? 'wrong' : 'network');
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
          onChange={e => { setInput(e.target.value); setError(null); }}
          placeholder="Mật khẩu"
          className="w-full border border-gray-300 dark:border-[#474747] rounded-lg px-3 py-2 bg-white dark:bg-[#2d2d30] text-gray-900 dark:text-[#d4d4d4] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error === 'wrong' && <p className="text-sm text-red-500">Mật khẩu không đúng.</p>}
        {error === 'network' && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Không kết nối được máy chủ. Thử lại nhé.
          </p>
        )}
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

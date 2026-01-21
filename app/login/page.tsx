'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // bước 1: kiểm tra user
  const checkUser = async () => {
    setError('');
    const res = await fetch('/api/login/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      setError('Không tìm thấy user');
      return;
    }

    const data = await res.json();
    setUserId(data.id);
    setHasPassword(data.hasPassword);
  };

  // bước 2: login
  const login = async () => {
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        password,
        device_id: getDeviceId(),
      }),
    });

    if (!res.ok) {
      setError('Sai mật khẩu');
      return;
    }

    router.push('/');
  };

  return (
    <div style={{ maxWidth: 320, margin: '100px auto' }}>
      <h2>Đăng nhập</h2>

      {!userId && (
        <>
          <input
            placeholder="Tên user"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <button onClick={checkUser}>Tiếp tục</button>
        </>
      )}

      {userId && (
        <>
          {hasPassword ? (
            <p>Nhập mật khẩu</p>
          ) : (
            <p>Bạn có thể đặt mật khẩu (hoặc bỏ trống)</p>
          )}

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button onClick={login}>Đăng nhập</button>
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

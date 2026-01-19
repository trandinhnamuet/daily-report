'use client';

import { useEffect, useState } from 'react';
import UserSelector from '@/components/UserSelector';

interface User {
  id: number;
  name: string;
}

export default function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load users
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then((data: User[]) => setUsers(data))
      .catch(err => {
        console.error('Load users failed', err);
      });
  }, []);

  // Load current reporter (từ cookie / server)
 useEffect(() => {
  const reporterId =
    document.cookie
      .split('; ')
      .find(c => c.startsWith('reporter_id='))
      ?.split('=')[1] ?? null;

  if (reporterId) {
    setCurrentUserId(reporterId);
    setOpen(false);
  } else {
    setOpen(true);
  }
}, []); [];

  return (
    <>
      {children}

      {open && users.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">
              Bạn là ai?
            </h2>

            <UserSelector
              users={users}
            />
          </div>
        </div>
      )}
    </>
  );
}

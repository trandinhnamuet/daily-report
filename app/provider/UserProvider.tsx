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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => {
        console.error('Load users failed', err);
      });
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/users/current', {
          credentials: 'same-origin',
        });

        if (res.status === 204) {
          setOpen(true);
          return;
        }
        if (!res.ok) {
          console.error('Failed to load current user', res.status);
          setOpen(true);
          return;
        }

        const user = await res.json();

        if (user) {
          setCurrentUser(user);
          setOpen(false);

          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      } catch (err) {
        console.error('loadCurrentUser error', err);
        setOpen(true);
      }
    }

    loadCurrentUser();
  }, []);

  const handleSelectUser = async (user: User) => {
    try {
      await fetch('/api/users/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: user.id }),
      });

      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setOpen(false);
    } catch (err) {
      console.error('Select user failed', err);
    }
  };

  return (
    <>
      {children}

      {open && users.length > 0 && (
        <UserSelector
          users={users}
          selectedUser={currentUser}
          onUserSelect={handleSelectUser}
        />
      )}
    </>
  );
}

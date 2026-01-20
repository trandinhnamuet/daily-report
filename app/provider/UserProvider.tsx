'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface CurrentUser {
  id: number | null;
  name: string;
}

interface UserContextType {
  currentUserId: number | null;
  currentUserName: string;
  reporterId: number | null;
  setReporterId: (id: number | null) => void;
  setCurrentUser: (user: { id: number; name: string }) => void;
  resetCurrentUser: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

/* ================= PROVIDER ================= */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [reporterId, setReporterId] = useState<number | null>(null);

  /* ===== load current user from cookie (1 lần) ===== */
  useEffect(() => {
    const id = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_id='))
      ?.split('=')[1];

    const name = document.cookie
      .split('; ')
      .find(c => c.startsWith('current_user_name='))
      ?.split('=')[1];

    if (id) {
      setCurrentUserId(Number(id));
      setCurrentUserName(decodeURIComponent(name || ''));
    }
  }, []);

  /* ===== actions ===== */
  const setCurrentUser = (user: { id: number; name: string }) => {
    document.cookie = `current_user_id=${user.id}; path=/`;
    document.cookie = `current_user_name=${encodeURIComponent(user.name)}; path=/`;
    setCurrentUserId(user.id);
    setCurrentUserName(user.name);
  };

 const resetCurrentUser = () => {
  document.cookie = 'current_user_id=; Max-Age=0; path=/';
  document.cookie = 'current_user_name=; Max-Age=0; path=/';
  setCurrentUserId(null);
  setCurrentUserName('');
};


  return (
    <UserContext.Provider
      value={{
        currentUserId,
        currentUserName,
        reporterId,
        setReporterId,
        setCurrentUser,
        resetCurrentUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/* ================= HOOK ================= */
export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used inside UserProvider');
  }
  return ctx;
}

'use client';

import { createContext, useContext, useState } from 'react';

/* ================= TYPES ================= */
interface User {
  id: number;
  name: string;
}

interface UserContextType {
  currentUserId: number | null;
  currentUserName: string;
  reporterId: number | null;
  setReporterId: (id: number | null) => void;
  setCurrentUser: (user: User) => void;
  resetCurrentUser: () => void;
}

/* ================= CONTEXT ================= */
const UserContext = createContext<UserContextType | null>(null);

/* ================= PROVIDER ================= */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [reporterId, setReporterId] = useState<number | null>(null);

  const setCurrentUser = (user: User) => {
    document.cookie = `current_user_id=${user.id}; path=/`;
    document.cookie = `current_user_name=${encodeURIComponent(
      user.name
    )}; path=/`;

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

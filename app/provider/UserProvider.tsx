'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';

interface User {
  id: number;
  name: string;
}

interface UserContextType {
  currentUserId: number | null;
  currentUserName: string | null;

  reporterId: number | null;
  setReporterId: (id: number | null) => void;

  loading: boolean;

  setCurrentUser: (user: User) => void;
  resetCurrentUser: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [reporterId, setReporterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔒 CHỐNG DOUBLE EFFECT (CỰC KỲ QUAN TRỌNG)
  const validatedRef = useRef(false);

  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    const validateUser = async () => {
      try {
        const res = await fetch('/api/auth/me');

        if (!res.ok) {
          resetCurrentUser();
          return;
        }

        const user = await res.json();
        setCurrentUser(user);
      } catch {
        resetCurrentUser();
      } finally {
        setLoading(false);
      }
    };

    validateUser();
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
    setCurrentUserName(user.name);
  };

  const resetCurrentUser = () => {
    setCurrentUserId(null);
    setCurrentUserName(null);
    setReporterId(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUserId,
        currentUserName,
        reporterId,
        setReporterId,
        loading,
        setCurrentUser,
        resetCurrentUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used inside UserProvider');
  }
  return ctx;
}

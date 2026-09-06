'use client';
// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserData } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  displayName: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  displayName: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    user: null,
    role: null,
    displayName: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, displayName: null, loading: false });
        return;
      }
      // Timeout fallback: if Firestore read hangs (e.g. rules issue / network),
      // unblock the UI after 8s so the app doesn't freeze on loading screen.
      const timeout = setTimeout(() => {
        setState({ user, role: null, displayName: user.displayName, loading: false });
      }, 8000);

      try {
        const data = await getUserData(user.uid);
        clearTimeout(timeout);
        setState({
          user,
          role: (data?.role as UserRole) ?? null,
          displayName: data?.displayName ?? user.displayName,
          loading: false,
        });
      } catch {
        clearTimeout(timeout);
        setState({ user, role: null, displayName: user.displayName, loading: false });
      }
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

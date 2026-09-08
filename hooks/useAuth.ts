'use client';
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserData } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  displayName: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    displayName: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, displayName: null, loading: false, error: null });
        return;
      }

      try {
        const data = await getUserData(user.uid);
        setState({
          user,
          role: (data?.role as UserRole) ?? null,
          displayName: data?.displayName ?? user.displayName,
          loading: false,
          error: null,
        });
      } catch {
        setState({ user, role: null, displayName: user.displayName, loading: false, error: 'Failed to load user data' });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}

export function useRequireRole(allowedRoles: UserRole[]) {
  const auth = useAuth();

  const isAllowed = !auth.loading && auth.role !== null && allowedRoles.includes(auth.role);
  const isDenied = !auth.loading && (!auth.user || !allowedRoles.includes(auth.role!));

  return { ...auth, isAllowed, isDenied };
}

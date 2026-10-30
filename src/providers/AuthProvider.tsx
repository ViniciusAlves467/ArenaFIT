import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { api, type Session } from '@/api';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, loading: true });
  const lastUser = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const apply = (session: Session | null) => {
      if (!mounted) return;
      // Trocou de usuário (ou saiu): nenhum dado do anterior pode sobreviver no cache.
      const userId = session?.userId ?? null;
      if (userId !== lastUser.current) queryClient.clear();
      lastUser.current = userId;
      setState({ session, loading: false });
    };
    api.auth.getSession().then(apply).catch(() => apply(null));
    const unsubscribe = api.auth.onChange(apply);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

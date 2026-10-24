import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { getErrorMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }
      setSession(data.session);
    } catch (sessionError) {
      setError(getErrorMessage(sessionError, 'Your session could not be restored.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setError(null);
        setLoading(false);
      }
    });

    async function restoreSession(authClient: NonNullable<typeof supabase>) {
      try {
        const { data, error: sessionError } = await authClient.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (active) {
          setSession(data.session);
          setError(null);
        }
      } catch (sessionError) {
        if (active) {
          setError(getErrorMessage(sessionError, 'Your session could not be restored.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void restoreSession(client);
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error('Connect Supabase before signing out.');
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw signOutError;
    }
  }, []);

  const value = useMemo(
    () => ({ session, loading, error, refreshSession, signOut }),
    [session, loading, error, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Record<string, unknown> | null;
  isLoading: boolean;
  isProfileLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const navigate = useNavigate();
  
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetching = useRef<boolean>(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async (userId: string) => {
      if (isFetching.current) return;

      isFetching.current = true;
      setIsProfileLoading(true);
      lastFetchedUserId.current = userId;

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
          );

          const { data, error } = await Promise.race([
            supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
            timeoutPromise,
          ]) as { data: Record<string, unknown> | null; error: unknown };

          if (error) throw error;

          if (data) {
            if (!cancelled) setProfile(data);
            break;
          }
        } catch (err) {
          console.error(`[SessionContext] Profile fetch attempt ${attempt}/${maxAttempts} failed:`, err);
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 2000));
          } else {
            lastFetchedUserId.current = null;
          }
        }
      }

      isFetching.current = false;
      if (!cancelled) setIsProfileLoading(false);
    };

    const clearAuthHash = () => {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (cancelled) return;
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        setIsLoading(false);
        await fetchProfile(initialSession.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(err => {
      if (cancelled) return;
      console.error('[SessionContext] getSession error:', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (cancelled) return;
      const newUser = currentSession?.user || null;
      setSession(currentSession);
      setUser(newUser);
      setIsLoading(false);
      
      if (newUser) {
        if (newUser.id !== lastFetchedUserId.current || !profileRef.current) {
          await fetchProfile(newUser.id);
        }
      } else {
        setProfile(null);
        lastFetchedUserId.current = null;
        setIsProfileLoading(false);
      }

      if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/old/login')) {
        clearAuthHash();
        const target = window.location.pathname.startsWith('/old') ? '/old' : '/';
        navigate(target);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading, isProfileLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};
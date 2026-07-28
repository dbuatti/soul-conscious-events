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
    const fetchProfile = async (userId: string, attempt = 1): Promise<boolean> => {
      if (isFetching.current && attempt === 1) {
        return false;
      }

      if (attempt === 1) {
        isFetching.current = true;
        setIsProfileLoading(true);
        lastFetchedUserId.current = userId;
      }
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 20000)
      );

      try {
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as { data: Record<string, unknown> | null; error: unknown };
        
        if (error) {
          console.error('[SessionContext] Error fetching profile:', error);
        } else if (data) {
          setProfile(data);
          return true;
        }
      } catch (err) {
        console.error(`[SessionContext] Profile fetch attempt ${attempt} failed:`, err);
      }

      // Retry up to 2 more times with backoff
      if (attempt < 3) {
        const delay = attempt * 2000;
        await new Promise((r) => setTimeout(r, delay));
        return fetchProfile(userId, attempt + 1);
      }

      // All retries exhausted — allow future re-fetches
      lastFetchedUserId.current = null;
      return false;
    };

    const clearAuthHash = () => {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchProfile(initialSession.user.id);
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('[SessionContext] getSession error:', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      const newUser = currentSession?.user || null;
      setSession(currentSession);
      setUser(newUser);
      
      if (newUser) {
        if (newUser.id !== lastFetchedUserId.current || !profileRef.current) {
          await fetchProfile(newUser.id);
        }
      } else {
        setProfile(null);
        lastFetchedUserId.current = null;
      }

      setIsLoading(false);
      setIsProfileLoading(false);

      if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/old/login')) {
        clearAuthHash();
        const target = window.location.pathname.startsWith('/old') ? '/old' : '/';
        navigate(target);
      }
    });

    return () => {
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
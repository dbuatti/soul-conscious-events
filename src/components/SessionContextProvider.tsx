import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialized = useRef(false);

  const fetchProfile = async (userId: string) => {
    console.log('[SessionContext] Fetching profile for user:', userId);
    
    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
    );

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('[SessionContext] Error fetching profile:', error);
      } else if (data) {
        console.log('[SessionContext] Profile fetched successfully. Role:', data.role);
        setProfile(data);
      } else {
        console.log('[SessionContext] No profile found for user.');
      }
    } catch (err) {
      console.error('[SessionContext] Profile fetch failed or timed out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[SessionContext] Provider mounted');
    
    const clearAuthHash = () => {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        console.log('[SessionContext] Clearing auth hash from URL');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[SessionContext] Initial session check complete:', initialSession?.user?.email || 'No session');
      setSession(initialSession);
      setUser(initialSession?.user || null);
      
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(err => {
      console.error('[SessionContext] getSession error:', err);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[SessionContext] Auth event:', event, currentSession?.user?.email || 'No user');
      
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }

      if (currentSession && (window.location.pathname === '/login' || window.location.pathname === '/old/login')) {
        clearAuthHash();
        const target = window.location.pathname.startsWith('/old') ? '/old' : '/';
        console.log('[SessionContext] Redirecting to:', target);
        navigate(target);
      }
    });

    return () => {
      console.log('[SessionContext] Provider unmounting');
      subscription.unsubscribe();
    };
  }, [navigate]); // Only run on mount/navigate change

  // Safety timeout to ensure app never stays stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('[SessionContext] Global safety timeout reached. Forcing loading to false.');
        setIsLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <SessionContext.Provider value={{ session, user, profile, isLoading }}>
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
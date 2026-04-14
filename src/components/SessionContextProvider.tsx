import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchProfile = async (userId: string) => {
    console.log('[SessionContext] Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[SessionContext] Error fetching profile:', error);
      } else if (data) {
        console.log('[SessionContext] Profile fetched successfully:', data.role);
        setProfile(data);
      }
    } catch (err) {
      console.error('[SessionContext] Unexpected error in fetchProfile:', err);
    }
  };

  useEffect(() => {
    console.log('[SessionContext] Initializing session provider...');
    
    // Safety timeout: ensure loading state clears after 10 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[SessionContext] Safety timeout reached. Forcing isLoading to false.');
        setIsLoading(false);
      }
    }, 10000);

    const clearAuthHash = () => {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        console.log('[SessionContext] Clearing auth hash from URL');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[SessionContext] Auth state changed:', event, currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);

      if (currentSession) {
        clearAuthHash();
        if (location.pathname === '/login' || location.pathname === '/old/login') {
          console.log('[SessionContext] Authenticated user on login page, redirecting...');
          navigate(location.pathname.startsWith('/old') ? '/old' : '/');
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log('[SessionContext] Initial session check:', currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
      
      if (currentSession) {
        clearAuthHash();
        if (location.pathname === '/login' || location.pathname === '/old/login') {
          navigate(location.pathname.startsWith('/old') ? '/old' : '/');
        }
      }
    }).catch(err => {
      console.error('[SessionContext] Error in getSession:', err);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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
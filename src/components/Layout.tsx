import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer component
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user } = useSession();

  useEffect(() => {
    // Log page visit
    const logPageView = async () => {
      const { error } = await supabase.from('page_visit_logs').insert([
        {
          user_id: user?.id || null,
          page_path: location.pathname,
          action_type: 'visit',
        },
      ]);
      if (error) {
        console.error('Error logging page view:', error);
      }
    };
    logPageView();
  }, [location.pathname, user?.id]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background"> {/* Changed background to a solid color */}
      <Header />
      <main className="flex-grow w-full px-2 flex flex-col items-center py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
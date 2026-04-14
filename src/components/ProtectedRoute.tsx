import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedEmail?: string; // Optional email to restrict access
  requireAdmin?: boolean; // Optional flag to require admin role
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedEmail, requireAdmin }) => {
  const { user, profile, isLoading } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      console.log('[ProtectedRoute] Access check:', {
        path: location.pathname,
        isAuthenticated: !!user,
        userEmail: user?.email,
        userRole: profile?.role,
        requireAdmin
      });
    }
  }, [isLoading, user, profile, requireAdmin, location.pathname]);

  if (isLoading) {
    console.log('[ProtectedRoute] Session is loading, showing skeleton...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
        <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.warn('[ProtectedRoute] User not authenticated, redirecting to login');
    toast.error('You need to be logged in to access this page.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = profile?.role === 'admin' || user.email === 'daniele.buatti@gmail.com';

  if (requireAdmin && !isAdmin) {
    console.error('[ProtectedRoute] Admin access denied for user:', user.email);
    toast.error('You do not have permission to access this page.');
    return <Navigate to="/" replace />;
  }

  if (allowedEmail && user.email !== allowedEmail && !isAdmin) {
    console.error('[ProtectedRoute] Email restriction access denied for user:', user.email);
    toast.error('You do not have permission to access this page.');
    return <Navigate to="/" replace />;
  }

  console.log('[ProtectedRoute] Access granted for:', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
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
  const { user, profile, isLoading, isProfileLoading } = useSession();
  const location = useLocation();

  // We are "loading" if the session is loading OR if we need an admin role and the profile is still loading
  const isActuallyLoading = isLoading || (requireAdmin && isProfileLoading);

  useEffect(() => {
    if (!isActuallyLoading) {
      console.log('[ProtectedRoute] Access check:', {
        path: location.pathname,
        isAuthenticated: !!user,
        userEmail: user?.email,
        userRole: profile?.role,
        requireAdmin
      });
    }
  }, [isActuallyLoading, user, profile, requireAdmin, location.pathname]);

  if (isActuallyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-2xl p-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4 rounded-2xl" />
            <Skeleton className="h-6 w-1/2 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-[2rem]" />
            <Skeleton className="h-32 w-full rounded-[2rem]" />
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

  return <>{children}</>;
};

export default ProtectedRoute;
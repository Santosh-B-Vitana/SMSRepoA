import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredModule?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredModule,
  requireAuth = true,
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { isModuleEnabled } = usePermissions();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (requireAuth && (!isAuthenticated || !user)) {
    // Store the attempted URL for redirect after login
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardRoutes: Record<UserRole, string> = {
      super_admin: '/super-admin-dashboard',
      admin: '/admin-dashboard',
      staff: '/staff-dashboard',
      parent: '/parent-dashboard',
    };
    
    const userDashboard = dashboardRoutes[user.role] || '/dashboard';
    return <Navigate to={userDashboard} replace />;
  }

  // Check module-based access
  if (requiredModule && !isModuleEnabled(requiredModule as any)) {
    // Show access denied or redirect to dashboard
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this module. Please contact your administrator.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Higher-order component for protecting routes
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    allowedRoles?: UserRole[];
    requiredModule?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute
        allowedRoles={options?.allowedRoles}
        requiredModule={options?.requiredModule}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;

import { ReactNode } from 'react';
import { usePermissions, ModuleName, PermissionLevel } from '@/contexts/PermissionsContext';

export interface PermissionGateProps {
  children: ReactNode;
  module?: ModuleName;
  permission?: PermissionLevel;
  fallback?: ReactNode;
  showFallback?: boolean;
}

/**
 * Permission-based UI wrapper component
 * Shows content only if user has required permissions
 */
export function PermissionGate({
  children,
  module,
  permission,
  fallback = null,
  showFallback = false,
}: PermissionGateProps) {
  const { hasPermission, isModuleEnabled } = usePermissions();

  // If no module specified, show content
  if (!module) {
    return <>{children}</>;
  }

  // Check if module is enabled
  if (!isModuleEnabled(module)) {
    return showFallback ? <>{fallback}</> : null;
  }

  // If permission specified, check it
  if (permission) {
    const allowed = hasPermission(module, permission);
    if (allowed) return <>{children}</>;
    return showFallback ? <>{fallback}</> : null;
  }

  // Module enabled, no specific permission required
  return <>{children}</>;
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  module: ModuleName,
  permission?: PermissionLevel,
  options?: {
    fallback?: ReactNode;
  }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate
        module={module}
        permission={permission}
        fallback={options?.fallback}
        showFallback={!!options?.fallback}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook for permission-based conditional rendering
 */
export function usePermissionGate(
  module: ModuleName,
  permission?: PermissionLevel
): boolean {
  const { hasPermission, isModuleEnabled } = usePermissions();

  if (!isModuleEnabled(module)) {
    return false;
  }

  if (permission) {
    return hasPermission(module, permission);
  }

  return true;
}

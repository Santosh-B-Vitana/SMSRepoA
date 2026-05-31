import { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';

export type RbacAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'Approve' | 'Export';

/**
 * Fine-grained Role-Management permission hook.
 *
 * Mirrors the backend enforcement: returns true when the current user is allowed to
 * perform `action` on `module`. Admin / super-admin and users that were never
 * role-managed fall back to permissive behaviour (handled inside hasUserPermission),
 * so existing roles keep working.
 *
 * Example: const canEdit = useCan('Students', 'Edit');
 */
export function useCan(module: string, action: RbacAction): boolean {
  const { hasUserPermission } = usePermissions();
  return hasUserPermission(module, action);
}

interface CanProps {
  module: string;
  action: RbacAction;
  children: ReactNode;
  /** Rendered when the permission is denied (defaults to nothing). */
  fallback?: ReactNode;
}

/**
 * Declarative guard for a single Role-Management permission.
 *
 * <Can module="Students" action="Edit">
 *   <Button>Edit</Button>
 * </Can>
 */
export function Can({ module, action, children, fallback = null }: CanProps) {
  const allowed = useCan(module, action);
  return <>{allowed ? children : fallback}</>;
}

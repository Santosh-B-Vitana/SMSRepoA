import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activityLogger, ActivityLog } from '@/utils/securityUtils';

type ActionType = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'print'
  | 'login'
  | 'logout'
  | 'search'
  | 'filter'
  | 'bulk_action';

interface LogOptions {
  details?: string;
  success?: boolean;
}

export function useActivityLog(module: string) {
  const { user } = useAuth();

  const logActivity = useCallback(
    (action: ActionType, options: LogOptions = {}) => {
      if (!user) return;

      activityLogger.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action,
        module,
        details: options.details,
        success: options.success ?? true,
        userAgent: navigator.userAgent,
      });
    },
    [user, module]
  );

  const logView = useCallback(
    (entityId?: string) => {
      logActivity('view', { 
        details: entityId ? `Viewed ${module} #${entityId}` : `Accessed ${module}` 
      });
    },
    [logActivity, module]
  );

  const logCreate = useCallback(
    (entityId: string, entityName?: string) => {
      logActivity('create', { 
        details: `Created ${entityName || entityId}` 
      });
    },
    [logActivity]
  );

  const logUpdate = useCallback(
    (entityId: string, changes?: string) => {
      logActivity('update', { 
        details: changes || `Updated #${entityId}` 
      });
    },
    [logActivity]
  );

  const logDelete = useCallback(
    (entityId: string, entityName?: string) => {
      logActivity('delete', { 
        details: `Deleted ${entityName || entityId}` 
      });
    },
    [logActivity]
  );

  const logExport = useCallback(
    (format: string, count?: number) => {
      logActivity('export', { 
        details: `Exported ${count || 'all'} records as ${format}` 
      });
    },
    [logActivity]
  );

  const logImport = useCallback(
    (count: number, success: boolean) => {
      logActivity('import', { 
        details: `Imported ${count} records`,
        success 
      });
    },
    [logActivity]
  );

  const logBulkAction = useCallback(
    (action: string, count: number) => {
      logActivity('bulk_action', { 
        details: `${action} on ${count} records` 
      });
    },
    [logActivity]
  );

  const logError = useCallback(
    (action: string, error: string) => {
      logActivity(action as ActionType, { 
        details: `Error: ${error}`,
        success: false 
      });
    },
    [logActivity]
  );

  return {
    logActivity,
    logView,
    logCreate,
    logUpdate,
    logDelete,
    logExport,
    logImport,
    logBulkAction,
    logError,
  };
}

// Get recent activity logs (for admin dashboard)
export function getRecentActivityLogs(limit = 50): ActivityLog[] {
  return activityLogger.getRecentLogs(limit);
}

// Get failed activities (for security monitoring)
export function getFailedActivities(limit = 50): ActivityLog[] {
  return activityLogger.getFailedAttempts(limit);
}

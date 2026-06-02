import React from "react";
import { usePermissions, ModuleName } from "@/contexts/PermissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ModuleRestricted } from "./ModuleRestricted";
import { Loader2 } from "lucide-react";

interface ModuleGuardProps {
  /** The module key to check, e.g. "health", "transport" */
  module: ModuleName;
  children: React.ReactNode;
}

// Modules that don't have corresponding role-permission entries — skip role check
const MODULES_WITHOUT_ROLE_PERMS = new Set<ModuleName>(['documents', 'store', 'wallet']);

/**
 * Wraps a page/route and:
 * 1. Shows a "feature restricted" (Pro) message if the super-admin has disabled the module.
 * 2. Shows an "access restricted" message if the staff user's role lacks View permission.
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { isModuleEnabled, loading, permissionsLoaded, hasUserPermission } = usePermissions();
  const { user } = useAuth();

  // While permissions are loading, show a neutral loader
  if (loading || !permissionsLoaded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Layer 1: super-admin module toggle
  if (!isModuleEnabled(module)) {
    return <ModuleRestricted moduleName={module} restrictedBy="module" />;
  }

  // Layer 2: role-based View permission (staff only, skip admin/super_admin)
  if (user?.role === 'staff' && !MODULES_WITHOUT_ROLE_PERMS.has(module)) {
    const permModule = module.charAt(0).toUpperCase() + module.slice(1);
    if (!hasUserPermission(permModule, 'View')) {
      return <ModuleRestricted moduleName={module} restrictedBy="role" />;
    }
  }

  return <>{children}</>;
}

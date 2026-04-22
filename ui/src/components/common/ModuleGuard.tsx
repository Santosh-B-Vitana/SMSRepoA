import React from "react";
import { usePermissions, ModuleName } from "@/contexts/PermissionsContext";
import { ModuleRestricted } from "./ModuleRestricted";
import { Loader2 } from "lucide-react";

interface ModuleGuardProps {
  /** The module key to check, e.g. "health", "transport" */
  module: ModuleName;
  children: React.ReactNode;
}

/**
 * Wraps a page/route and shows a "feature restricted" message if the module
 * has been disabled for this school by a super admin.
 *
 * While permissions are still loading a minimal spinner is shown so the
 * user never sees a false-positive restriction flash.
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { isModuleEnabled, loading } = usePermissions();

  // While permissions are loading, show a neutral loader
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isModuleEnabled(module)) {
    return <ModuleRestricted moduleName={module} />;
  }

  return <>{children}</>;
}

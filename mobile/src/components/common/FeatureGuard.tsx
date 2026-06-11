import type { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the given feature flag is enabled.
 * Renders `fallback` (default: nothing) when the flag is disabled or config not yet loaded.
 *
 * @example
 * // Hide entirely when disabled:
 * <FeatureGuard feature="library">
 *   <LibrarySection />
 * </FeatureGuard>
 *
 * // Show locked card when disabled:
 * <FeatureGuard feature="transport" fallback={<LockedModuleCard name="Transport" />}>
 *   <TransportSection />
 * </FeatureGuard>
 */
export function FeatureGuard({ feature, children, fallback = null }: FeatureGuardProps) {
  const isEnabled = useFeatureFlag(feature);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

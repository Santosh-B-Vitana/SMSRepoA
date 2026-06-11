import { useSchoolStore } from '@/stores/schoolStore';

/**
 * Returns true if the given feature flag is enabled for the current school/user.
 *
 * Resolution order (most granular wins):
 *   1. mobileFeatureFlags — fine-grained mobile-specific flags (e.g. "mobile.fees.online_payment")
 *   2. moduleFlags        — module-level on/off (e.g. "library", "transport")
 *
 * Returns `defaultValue` (false) while app config has not yet loaded.
 *
 * @param featureKey   e.g. 'library', 'mobile.fees.online_payment'
 * @param defaultValue fallback when config not yet loaded (default: false)
 */
export function useFeatureFlag(featureKey: string, defaultValue = false): boolean {
  const mobileFeatureFlags = useSchoolStore((s) => s.mobileFeatureFlags);
  const moduleFlags = useSchoolStore((s) => s.moduleFlags);
  const isConfigLoaded = useSchoolStore((s) => s.isConfigLoaded);

  if (!isConfigLoaded) return defaultValue;

  if (mobileFeatureFlags !== null && featureKey in mobileFeatureFlags) {
    return mobileFeatureFlags[featureKey] ?? defaultValue;
  }

  if (moduleFlags !== null && featureKey in moduleFlags) {
    return moduleFlags[featureKey] ?? defaultValue;
  }

  return defaultValue;
}

/**
 * Non-hook variant — reads from store state directly.
 * Safe to call outside React components (e.g. navigation guards, API interceptors).
 */
export function getFeatureFlag(featureKey: string, defaultValue = false): boolean {
  const { mobileFeatureFlags, moduleFlags, isConfigLoaded } = useSchoolStore.getState();

  if (!isConfigLoaded) return defaultValue;

  if (mobileFeatureFlags !== null && featureKey in mobileFeatureFlags) {
    return mobileFeatureFlags[featureKey] ?? defaultValue;
  }

  if (moduleFlags !== null && featureKey in moduleFlags) {
    return moduleFlags[featureKey] ?? defaultValue;
  }

  return defaultValue;
}

/**
 * useFeatureFlag / getFeatureFlag unit tests.
 *
 * Since Zustand stores are plain state containers, hooks that read store state
 * via selectors can be tested by calling them directly after seeding the store.
 * This matches the existing test pattern used in this project.
 */
import { useSchoolStore } from '@/stores/schoolStore';
import { getFeatureFlag } from '../useFeatureFlag';

function setStoreState(
  partial: Partial<{
    isConfigLoaded: boolean;
    moduleFlags: Record<string, boolean> | null;
    mobileFeatureFlags: Record<string, boolean> | null;
  }>,
) {
  useSchoolStore.setState(partial as Parameters<typeof useSchoolStore.setState>[0]);
}

afterEach(() => {
  setStoreState({ isConfigLoaded: false, moduleFlags: null, mobileFeatureFlags: null });
});

describe('getFeatureFlag (non-hook, reads store via getState)', () => {
  it('returns false for unknown key when config loaded', () => {
    setStoreState({ isConfigLoaded: true, moduleFlags: {}, mobileFeatureFlags: {} });
    expect(getFeatureFlag('unknown.key')).toBe(false);
  });

  it('returns false (defaultValue) when config is not yet loaded', () => {
    setStoreState({ isConfigLoaded: false, moduleFlags: { library: true }, mobileFeatureFlags: {} });
    expect(getFeatureFlag('library')).toBe(false);
  });

  it('returns custom defaultValue when config not loaded', () => {
    setStoreState({ isConfigLoaded: false, moduleFlags: {}, mobileFeatureFlags: {} });
    expect(getFeatureFlag('unknown', true)).toBe(true);
  });

  it('returns module-level flag when enabled', () => {
    setStoreState({ isConfigLoaded: true, moduleFlags: { library: true }, mobileFeatureFlags: {} });
    expect(getFeatureFlag('library')).toBe(true);
  });

  it('returns module-level flag when disabled', () => {
    setStoreState({ isConfigLoaded: true, moduleFlags: { library: false }, mobileFeatureFlags: {} });
    expect(getFeatureFlag('library')).toBe(false);
  });

  it('mobileFeatureFlags take precedence over moduleFlags for the same key', () => {
    setStoreState({
      isConfigLoaded: true,
      moduleFlags: { 'mobile.fees.online_payment': false },
      mobileFeatureFlags: { 'mobile.fees.online_payment': true },
    });
    expect(getFeatureFlag('mobile.fees.online_payment')).toBe(true);
  });

  it('falls through to moduleFlags when key not in mobileFeatureFlags', () => {
    setStoreState({
      isConfigLoaded: true,
      moduleFlags: { transport: true },
      mobileFeatureFlags: { 'mobile.attendance.offline': true },
    });
    expect(getFeatureFlag('transport')).toBe(true);
  });

  it('handles null flags gracefully', () => {
    setStoreState({ isConfigLoaded: true, moduleFlags: null, mobileFeatureFlags: null });
    expect(getFeatureFlag('library')).toBe(false);
  });

  it('returns module flag value (hostel enabled)', () => {
    setStoreState({ isConfigLoaded: true, moduleFlags: { hostel: true }, mobileFeatureFlags: {} });
    expect(getFeatureFlag('hostel')).toBe(true);
  });

  it('mobile.attendance.biometric override: module=false, mobile=true → true', () => {
    setStoreState({
      isConfigLoaded: true,
      moduleFlags: { 'mobile.attendance.biometric': false },
      mobileFeatureFlags: { 'mobile.attendance.biometric': true },
    });
    expect(getFeatureFlag('mobile.attendance.biometric')).toBe(true);
  });
});

describe('useFeatureFlag — resolution logic verified via getFeatureFlag (same code path)', () => {
  it('mobileFeatureFlags override moduleFlags', () => {
    setStoreState({
      isConfigLoaded: true,
      moduleFlags: { 'mobile.fees.wallet': false },
      mobileFeatureFlags: { 'mobile.fees.wallet': true },
    });
    expect(getFeatureFlag('mobile.fees.wallet')).toBe(true);
  });

  it('returns false when both flags are false', () => {
    setStoreState({
      isConfigLoaded: true,
      moduleFlags: { hostel: false },
      mobileFeatureFlags: {},
    });
    expect(getFeatureFlag('hostel')).toBe(false);
  });
});

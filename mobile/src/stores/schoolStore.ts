import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  MobileAppConfig,
  SchoolBranding,
  VersionRequirements,
  BrandingColors,
} from '@vitana/shared-types';

interface PublicBranding {
  schoolName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor?: string;
}

interface SchoolState {
  branding: SchoolBranding | null;
  mobileFeatureFlags: Record<string, boolean> | null;
  moduleFlags: Record<string, boolean> | null;
  versionRequirements: VersionRequirements | null;
  academicYear: string | null;
  isConfigLoaded: boolean;
  setAppConfig: (config: MobileAppConfig) => void;
  setBranding: (partial: PublicBranding) => void;
  resetBranding: () => void;
}

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set) => ({
      branding: null,
      mobileFeatureFlags: null,
      moduleFlags: null,
      versionRequirements: null,
      academicYear: null,
      isConfigLoaded: false,

      setAppConfig: (config: MobileAppConfig) =>
        set({
          branding: {
            schoolId: config.schoolId,
            schoolName: config.branding.schoolName,
            appName: config.branding.schoolName,
            primaryColor: config.branding.primaryColor ?? '#1a6fd8',
            accentColor: config.branding.accentColor ?? '#17a2b8',
            logoUrl: config.branding.logoUrl ?? undefined,
            appIconUrl: config.branding.appIconUrl ?? undefined,
            splashScreenUrl: config.branding.splashScreenUrl ?? undefined,
            colors: {
              primary: config.branding.primaryColor ?? '#1a6fd8',
              accent: config.branding.accentColor ?? '#17a2b8',
              background: '#ffffff',
              surface: '#f5f7fa',
              text: '#1a1a2e',
              textSecondary: '#6b7280',
            } as BrandingColors,
          },
          mobileFeatureFlags: config.mobileFeatures,
          moduleFlags: config.modules,
          versionRequirements: config.versionRequirements,
          academicYear: config.academicYear,
          isConfigLoaded: true,
        }),

      setBranding: (b: PublicBranding) =>
        set({
          branding: {
            schoolId: '',
            schoolName: b.schoolName,
            appName: b.schoolName,
            primaryColor: b.primaryColor,
            accentColor: b.accentColor ?? '#17a2b8',
            logoUrl: b.logoUrl ?? undefined,
            colors: {
              primary: b.primaryColor,
              accent: b.accentColor ?? '#17a2b8',
              background: '#ffffff',
              surface: '#f5f7fa',
              text: '#1a1a2e',
              textSecondary: '#6b7280',
            } as BrandingColors,
          },
        }),

      resetBranding: () =>
        set({
          branding: null,
          mobileFeatureFlags: null,
          moduleFlags: null,
          versionRequirements: null,
          academicYear: null,
          isConfigLoaded: false,
        }),
    }),
    {
      name: 'vitana-school',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        branding: state.branding,
      }),
    },
  ),
);

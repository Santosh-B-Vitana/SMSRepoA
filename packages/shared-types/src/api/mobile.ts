export interface BrandingColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface BrandingFonts {
  heading: string;
  body: string;
}

export interface DarkModeBranding {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

export interface SchoolBranding {
  schoolId: string;
  schoolName: string;
  appName: string;
  shortTagline?: string;
  logoUrl?: string;
  appIconUrl?: string;
  splashScreenUrl?: string;
  primaryColor: string;
  accentColor: string;
  colors: BrandingColors;
  darkMode?: DarkModeBranding;
  fonts?: BrandingFonts;
}

/** Branding shape returned by GET /api/mobile/app-config */
export interface AppBranding {
  schoolName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  splashScreenUrl?: string | null;
  appIconUrl?: string | null;
}

export interface VersionRequirements {
  minVersion: string;
  recommendedVersion: string;
  forceUpdateVersion?: string | null;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
}

export interface RolePermissions {
  canMarkAttendance: boolean;
  canEnterMarks: boolean;
  canViewFinance: boolean;
  canApproveLeave: boolean;
  canManageAnnouncements: boolean;
  canViewStudentProfiles: boolean;
  canInitiatePayments: boolean;
}

export interface RemoteConfig {
  attendanceGracePeriodMinutes: number;
  maxOfflineQueueSize: number;
  syncIntervalMinutes: number;
  featureAnnouncements: string[];
}

/** Full app config returned by GET /api/mobile/app-config */
export interface MobileAppConfig {
  schoolId: string;
  academicYear: string;
  branding: AppBranding;
  modules: Record<string, boolean>;
  mobileFeatures: Record<string, boolean>;
  rolePermissions: RolePermissions;
  remoteConfig: RemoteConfig;
  versionRequirements: VersionRequirements;
}

/** @deprecated Use MobileAppConfig instead */
export interface FeatureFlags {
  enableBiometricLogin: boolean;
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableAnalytics: boolean;
  enableWhatsApp: boolean;
  enableCashfreePayments: boolean;
  enableDocumentScanning: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

/** @deprecated Use MobileAppConfig instead */
export interface ModuleFlags {
  attendance: boolean;
  fees: boolean;
  examinations: boolean;
  announcements: boolean;
  timetable: boolean;
  assignments: boolean;
  diary: boolean;
  leaves: boolean;
  messaging: boolean;
  documents: boolean;
  transport: boolean;
  hostel: boolean;
  library: boolean;
  store: boolean;
  health: boolean;
}

export interface StoreMetadata {
  shortDescription?: string;
  category?: string;
  contactEmail?: string;
  privacyPolicyUrl?: string;
  websiteUrl?: string;
}

/** Alias for backward compatibility */
export type AppConfig = MobileAppConfig;

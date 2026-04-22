// Module visibility configuration
// Set to false to hide modules from UI while keeping functionality intact

export interface ModuleVisibilityConfig {
  hostel: boolean;
  health: boolean;
  library: boolean;
  transport: boolean;
  fees: boolean;
  students: boolean;
  staff: boolean;
  attendance: boolean;
  examinations: boolean;
  timetable: boolean;
  announcements: boolean;
  reports: boolean;
  documents: boolean;
  admissions: boolean;
  communication: boolean;
  analytics: boolean;
  settings: boolean;
}

// Default visibility settings
export const MODULE_VISIBILITY: ModuleVisibilityConfig = {
  hostel: false,        // Hidden by default (use ?dev=true to view)
  health: false,        // Hidden by default (use ?dev=true to view)
  library: true,
  transport: true,      // Visible
  fees: true,
  students: true,
  staff: true,
  attendance: true,
  examinations: true,
  timetable: true,
  announcements: true,
  reports: true,
  documents: true,
  admissions: true,
  communication: true,
  analytics: true,
  settings: true,
};

// Helper to check if module is visible
export const isModuleVisible = (moduleName: keyof ModuleVisibilityConfig): boolean => {
  return MODULE_VISIBILITY[moduleName];
};

// Developer mode: Add ?dev=true to URL to see all modules
export const isDeveloperMode = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === 'true';
};

export const shouldShowModule = (moduleName: keyof ModuleVisibilityConfig): boolean => {
  return isDeveloperMode() || isModuleVisible(moduleName);
};

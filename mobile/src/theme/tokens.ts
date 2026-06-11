export const VITANA_COLORS = {
  primary: '#1a6fd8',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  accent: '#17a2b8',
  accentLight: '#22d3ee',
  accentDark: '#0891b2',

  background: '#ffffff',
  backgroundDark: '#0d1117',
  surface: '#f5f7fa',
  surfaceDark: '#161b22',

  text: '#1a1a2e',
  textDark: '#f0f6fc',
  textSecondary: '#6b7280',
  textSecondaryDark: '#8b949e',

  border: '#e5e7eb',
  borderDark: '#30363d',

  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  sidebar: '#1e293b',
  sidebarBorder: '#334155',
  sidebarActive: '#1a6fd8',
  sidebarText: '#f8fafc',
} as const;

export const VITANA_FONTS = {
  heading: 'Poppins',
  body: 'Inter',
  mono: 'SpaceMono',
} as const;

export const VITANA_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const VITANA_BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const VITANA_FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export type VitanaColors = typeof VITANA_COLORS;
export type VitanaFonts = typeof VITANA_FONTS;
export type VitanaSpacing = typeof VITANA_SPACING;

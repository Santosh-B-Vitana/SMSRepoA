/**
 * Theme barrel — import everything theme-related from here.
 *
 * Primary hook  : useAppTheme()       — full theme object with derived colors
 * Legacy hook   : useTheme()          — alias for useAppTheme(), kept for backwards compat
 * Provider      : SchoolThemeProvider — must wrap the root layout
 */

// Re-export the authoritative provider and hook
export {
  SchoolThemeProvider,
  useAppTheme,
  lightenColor,
  darkenColor,
} from './SchoolThemeProvider';
export type { AppTheme } from './SchoolThemeProvider';

// Backwards-compatible alias: existing callers using useTheme() continue to work
export { useAppTheme as useTheme } from './SchoolThemeProvider';

// Design tokens
export {
  VITANA_COLORS,
  VITANA_FONTS,
  VITANA_SPACING,
  VITANA_BORDER_RADIUS,
  VITANA_FONT_SIZES,
} from './tokens';
export type { VitanaColors, VitanaFonts, VitanaSpacing } from './tokens';

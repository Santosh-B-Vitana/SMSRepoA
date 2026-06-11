import React, { createContext, useContext, useMemo } from 'react';
import Constants from 'expo-constants';
import { useSchoolStore } from '@/stores/schoolStore';
import {
  VITANA_COLORS,
  VITANA_FONTS,
  VITANA_SPACING,
  VITANA_BORDER_RADIUS,
  VITANA_FONT_SIZES,
} from './tokens';

// ── Color utilities ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Returns a CSS rgb() string lightened toward white by `amount` (0–1). */
export function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(Math.min(255, r + (255 - r) * amount))}, ${Math.round(Math.min(255, g + (255 - g) * amount))}, ${Math.round(Math.min(255, b + (255 - b) * amount))})`;
}

/** Returns a CSS rgb() string darkened toward black by `amount` (0–1). */
export function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

// ── Theme interface ───────────────────────────────────────────────────────────

export interface AppTheme {
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    sidebar: string;
    sidebarText: string;
    sidebarActive: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: typeof VITANA_SPACING;
  borderRadius: typeof VITANA_BORDER_RADIUS;
  fontSizes: typeof VITANA_FONT_SIZES;
  schoolName: string;
  logoUrl: string | null;
}

// ── Default (Vitana) theme ────────────────────────────────────────────────────

const defaultTheme: AppTheme = {
  colors: {
    primary: VITANA_COLORS.primary,
    primaryLight: VITANA_COLORS.primaryLight,
    primaryDark: VITANA_COLORS.primaryDark,
    accent: VITANA_COLORS.accent,
    accentLight: VITANA_COLORS.accentLight,
    accentDark: VITANA_COLORS.accentDark,
    background: VITANA_COLORS.background,
    surface: VITANA_COLORS.surface,
    text: VITANA_COLORS.text,
    textSecondary: VITANA_COLORS.textSecondary,
    border: VITANA_COLORS.border,
    success: VITANA_COLORS.success,
    warning: VITANA_COLORS.warning,
    error: VITANA_COLORS.error,
    info: VITANA_COLORS.info,
    sidebar: VITANA_COLORS.sidebar,
    sidebarText: VITANA_COLORS.sidebarText,
    sidebarActive: VITANA_COLORS.sidebarActive,
  },
  fonts: VITANA_FONTS,
  spacing: VITANA_SPACING,
  borderRadius: VITANA_BORDER_RADIUS,
  fontSizes: VITANA_FONT_SIZES,
  schoolName: 'Vitana SMS',
  logoUrl: null,
};

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<AppTheme | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const branding = useSchoolStore((state) => state.branding);

  const buildTimePrimary = (Constants.expoConfig?.extra as Record<string, unknown>)
    ?.buildTimePrimaryColor as string | undefined;
  const buildTimeAccent = (Constants.expoConfig?.extra as Record<string, unknown>)
    ?.buildTimeAccentColor as string | undefined;
  const buildTimeAppName = (Constants.expoConfig?.extra as Record<string, unknown>)
    ?.buildTimeAppName as string | undefined;

  const theme = useMemo<AppTheme>(() => {
    // Fallback chain: runtime branding → build-time constant → Vitana default
    const primary =
      branding?.primaryColor ?? buildTimePrimary ?? VITANA_COLORS.primary;
    const accent =
      branding?.accentColor ?? buildTimeAccent ?? VITANA_COLORS.accent;

    return {
      ...defaultTheme,
      colors: {
        ...defaultTheme.colors,
        primary,
        // Derive light/dark variants from the dynamic primary
        primaryLight: lightenColor(primary, 0.85),
        primaryDark: darkenColor(primary, 0.2),
        accent,
        accentLight: lightenColor(accent, 0.85),
        accentDark: darkenColor(accent, 0.2),
        sidebarActive: primary,
      },
      fonts: {
        heading: branding?.fonts?.heading ?? VITANA_FONTS.heading,
        body: branding?.fonts?.body ?? VITANA_FONTS.body,
      },
      schoolName:
        branding?.schoolName ??
        buildTimeAppName ??
        'Vitana SMS',
      logoUrl: branding?.logoUrl ?? null,
    };
  }, [branding, buildTimePrimary, buildTimeAccent, buildTimeAppName]);

  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be called inside <SchoolThemeProvider>.');
  }
  return theme;
}

import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS } from './tokens';

export interface SchoolTheme {
  primaryColor: string;
  accentColor: string;
  schoolName: string | null;
  logoUrl: string | null;
}

export function useSchoolTheme(): SchoolTheme {
  const branding = useSchoolStore((state) => state.branding);

  return {
    primaryColor: branding?.primaryColor ?? VITANA_COLORS.primary,
    accentColor: branding?.accentColor ?? VITANA_COLORS.accent,
    schoolName: branding?.schoolName ?? null,
    logoUrl: branding?.logoUrl ?? null,
  };
}

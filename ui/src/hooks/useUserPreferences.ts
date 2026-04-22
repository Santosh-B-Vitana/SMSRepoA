import { useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currency?: string;
  itemsPerPage?: number;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultDashboard?: string;
  compactMode?: boolean;
  sidebarCollapsed?: boolean;
  tableView?: 'comfortable' | 'compact';
}

const PREFERENCES_KEY = 'user_preferences';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  itemsPerPage: 20,
  emailNotifications: true,
  smsNotifications: false,
  compactMode: false,
  sidebarCollapsed: false,
  tableView: 'comfortable',
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      try {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
    return defaultPreferences;
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.removeItem(PREFERENCES_KEY);
  }, []);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
  };
}

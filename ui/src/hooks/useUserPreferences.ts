import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

const BASE_PREFERENCES_KEY = 'user_preferences';

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

function loadPreferences(key: string): UserPreferences {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to parse preferences:', e);
    }
  }
  return defaultPreferences;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const preferencesKey = user?.id
    ? `${BASE_PREFERENCES_KEY}_${user.id}`
    : BASE_PREFERENCES_KEY;

  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadPreferences(preferencesKey)
  );

  // Reload preferences whenever the active user changes (login / logout / switch)
  useEffect(() => {
    setPreferences(loadPreferences(preferencesKey));
  }, [preferencesKey]);

  // Persist preferences to the user-scoped key on every change
  useEffect(() => {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }, [preferences, preferencesKey]);

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
    localStorage.removeItem(preferencesKey);
  }, [preferencesKey]);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
  };
}

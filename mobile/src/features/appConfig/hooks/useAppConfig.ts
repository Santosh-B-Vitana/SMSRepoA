import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/client';
import { useSchoolStore } from '@/stores/schoolStore';
import type { MobileAppConfig } from '@vitana/shared-types';

const ASYNC_STORAGE_KEY = 'vitana:app_config_cache';

export const APP_CONFIG_QUERY_KEY = ['app-config'] as const;

export function useAppConfig() {
  const { setAppConfig } = useSchoolStore();

  return useQuery<MobileAppConfig>({
    queryKey: APP_CONFIG_QUERY_KEY,
    queryFn: async (): Promise<MobileAppConfig> => {
      try {
        const config = (await apiClient.get('/mobile/app-config')) as MobileAppConfig;
        setAppConfig(config);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(config));
        return config;
      } catch (error) {
        const cached = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (cached) {
          const config = JSON.parse(cached) as MobileAppConfig;
          setAppConfig(config);
          return config;
        }
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev: MobileAppConfig | undefined) => prev,
    retry: 1,
  });
}

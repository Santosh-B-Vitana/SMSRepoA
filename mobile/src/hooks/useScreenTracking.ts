import { useEffect } from 'react';
import { useSegments } from 'expo-router';
import { track } from '@/lib/analytics';

export function useScreenTracking(): void {
  const segments = useSegments();

  useEffect(() => {
    // Filter out dynamic route segments (e.g. [id]) to avoid logging user IDs
    const safeSegments = segments.filter((s) => !s.startsWith('['));
    const screenName = safeSegments.length > 0 ? safeSegments.join('/') : 'dashboard';
    track('screen_viewed', { screen_name: screenName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.join('/')]);
}

import * as Sentry from '@sentry/react-native';

const SLOW_SCREEN_THRESHOLD_MS = 2000;

export function measureScreenLoad(screenName: string): { complete: () => void } {
  const startTime = Date.now();
  const span = Sentry.startInactiveSpan({ name: `screen_load_${screenName}`, op: 'ui.load' });

  return {
    complete: () => {
      span?.end();
      const duration = Date.now() - startTime;
      if (duration > SLOW_SCREEN_THRESHOLD_MS) {
        Sentry.captureMessage(
          `Slow screen load: ${screenName} (${duration}ms)`,
          'warning',
        );
      }
    },
  };
}

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { queryClient } from '../api/queryClient';
import { apiClient } from '../api/client';
import { DEEP_LINKS } from './deepLinks';

export { DEEP_LINKS };

// Configure foreground notification display behaviour
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, string> | undefined;
    const isSilent = data?.type === 'silent_sync' || data?.notificationType === 'silent_sync';
    const isHighPriority = ['high', 'urgent'].includes((data?.priority ?? '').toLowerCase());

    return {
      shouldShowAlert: !isSilent,
      shouldShowBanner: !isSilent,
      shouldShowList: !isSilent,
      shouldPlaySound: isHighPriority,
      shouldSetBadge: !isSilent,
    };
  },
});

function navigateFromNotification(notification: Notifications.Notification): void {
  const data = notification.request.content.data as Record<string, string> | undefined;
  if (!data) return;

  const type = data.notificationType ?? data.type;

  if (!type || type === 'silent_sync') {
    const resource = data.resource;
    if (resource) {
      void queryClient.invalidateQueries({ queryKey: [resource] });
    }
    return;
  }

  const deepLinkFn = DEEP_LINKS[type];
  if (deepLinkFn) {
    const route = deepLinkFn(data);
    if (route) {
      setTimeout(() => {
        try {
          router.push(route as Parameters<typeof router.push>[0]);
        } catch {
          // Navigation may fail if app is not fully mounted yet
        }
      }, 150);
    }
  }

  const notificationId = data.notificationId;
  if (notificationId) {
    void apiClient.put(`/notifications/${notificationId}/read`).catch(() => undefined);
  }
}

export function setupNotificationHandlers(): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Record<string, string> | undefined;
    if (data?.type === 'silent_sync' || data?.notificationType === 'silent_sync') {
      const resource = data.resource;
      if (resource) {
        void queryClient.invalidateQueries({ queryKey: [resource] });
      }
    }
    // Refresh unread notification badge and dashboard data for all roles
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromNotification(response.notification);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export async function handleInitialNotification(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    navigateFromNotification(response.notification);
  }
}

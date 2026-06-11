import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { OfflineQueueProcessor } from './queue';
import { useAuthStore } from '../stores/authStore';

let syncInProgress = false;

async function triggerSync(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    syncInProgress = false;
    return;
  }

  const { user } = useAuthStore.getState();
  if (!user) {
    syncInProgress = false;
    return;
  }

  try {
    await OfflineQueueProcessor.processQueue(user.id, user.schoolId);
  } finally {
    syncInProgress = false;
  }
}

export function initializeSyncEngine(): () => void {
  const netUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      void triggerSync();
    }
  });

  const appStateSubscription = AppState.addEventListener(
    'change',
    (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void triggerSync();
      }
    },
  );

  return () => {
    netUnsubscribe();
    appStateSubscription.remove();
  };
}

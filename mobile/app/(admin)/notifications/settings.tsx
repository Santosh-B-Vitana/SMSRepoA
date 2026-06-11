import { NotificationPreferencesScreen } from '@/features/notifications/NotificationPreferencesScreen';

const ADMIN_TYPES = [
  'billing_expiry_warning',
  'billing_expired',
  'new_announcement',
];

export default function AdminNotificationSettings() {
  return <NotificationPreferencesScreen roleTypes={ADMIN_TYPES} />;
}

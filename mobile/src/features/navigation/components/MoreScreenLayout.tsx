import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow } from '@/components/ui/ListRow';
import { Card } from '@/components/ui/Card';
import { LockedModuleCard } from '@/components/common/LockedModuleCard';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import type { MoreMenuItem } from '../hooks/useParentMoreItems';

interface MoreScreenLayoutProps {
  userName: string;
  userRole: string;
  userEmail?: string;
  primaryColor: string;
  menuItems: MoreMenuItem[];
  onLogout: () => void;
  headerExtra?: React.ReactNode;
}

export function MoreScreenLayout({
  userName,
  userRole,
  userEmail,
  primaryColor,
  menuItems,
  onLogout,
  headerExtra,
}: MoreScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Profile Card */}
        <LinearGradient
          colors={[primaryColor, darkenHex(primaryColor, 0.2)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <Avatar name={userName} size="lg" backgroundColor="rgba(255,255,255,0.25)" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileRole}>{userRole}</Text>
            {userEmail ? <Text style={styles.profileEmail}>{userEmail}</Text> : null}
          </View>
          {headerExtra ?? null}
        </LinearGradient>

        {/* Menu Items */}
        <Card shadow="sm" padding={0} style={styles.menuCard}>
          {menuItems.map((item, index) => {
            if (item.isLocked) {
              return (
                <View key={item.key} style={styles.lockedWrapper}>
                  <LockedModuleCard name={item.label} description={item.lockReason} />
                </View>
              );
            }

            return (
              <View key={item.key}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <ListRow
                  title={item.label}
                  icon={item.icon as any}
                  iconColor={primaryColor}
                  badge={item.badge}
                  onPress={() => router.push(item.route as never)}
                  showChevron
                />
              </View>
            );
          })}
        </Card>

        {/* Sign Out */}
        <Card shadow="sm" padding={0} style={styles.signOutCard}>
          <ListRow
            title="Sign Out"
            icon="log-out"
            iconColor={VITANA_COLORS.error}
            iconBg={VITANA_COLORS.errorLight}
            onPress={onLogout}
            showChevron={false}
            destructive
          />
        </Card>

        {/* Version */}
        <Text style={styles.version}>Vitana SMS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: VITANA_COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  profileCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...VITANA_SHADOWS.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    fontFamily: 'Inter',
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockedWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  separator: {
    height: 1,
    backgroundColor: VITANA_COLORS.border,
    marginLeft: 66,
  },
  signOutCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 4,
  },
});

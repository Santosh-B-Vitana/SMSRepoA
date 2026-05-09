import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore } from '../../store/authStore';
import { studentsApi } from '../../api/students';
import { attendanceApi } from '../../api/attendance';
import { feesApi } from '../../api/fees';
import { notificationsApi } from '../../api/notifications';
import { announcementsApi } from '../../api/announcements';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type Props = { navigation: NativeStackNavigationProp<HomeStackParamList, 'Dashboard'> };

const INDIGO = '#3f51b5';
const BG = '#f5f6fa';

export default function DashboardScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.firstName || 'Parent';
  const [childIdx, setChildIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: childrenData, isLoading: loadingKids, refetch } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsApi.getMyChildren(),
    select: r => r.data?.data?.students ?? r.data?.data ?? [],
  });
  const kids: any[] = childrenData ?? [];
  const kid = kids[childIdx] ?? kids[0];

  const { data: attData } = useQuery({
    queryKey: ['att', kid?.id],
    queryFn: () => attendanceApi.getStudentSummary(kid!.id),
    enabled: !!kid?.id,
    select: r => r.data?.data,
  });

  const { data: feesData } = useQuery({
    queryKey: ['fees', kid?.id],
    queryFn: () => feesApi.getStudentFeeRecords(kid!.id),
    enabled: !!kid?.id,
    select: r => r.data?.data ?? r.data,
  });

  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: () => notificationsApi.getUnreadCount(),
    select: r => r.data?.data?.count ?? r.data?.count ?? 0,
    refetchInterval: 60000,
  });

  const { data: announcements } = useQuery({
    queryKey: ['ann'],
    queryFn: () => announcementsApi.getAnnouncements({ isActive: true, pageSize: 10 }),
    select: r => r.data?.data?.announcements ?? [],
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const attPct = useMemo(() => {
    const recs: any[] = attData?.records ?? [];
    if (!recs.length) return null;
    return Math.round(recs.filter((r: any) => r.status === 'Present').length / recs.length * 100);
  }, [attData]);

  const pendingFees = useMemo(() => {
    const recs: any[] = Array.isArray(feesData) ? feesData : feesData?.records ?? [];
    return recs.reduce((a: number, r: any) => a + (r.pendingAmount ?? 0), 0);
  }, [feesData]);

  const todayAtt = useMemo(() => {
    const recs: any[] = attData?.records ?? [];
    const today = new Date().toISOString().split('T')[0];
    const rec = recs.find((r: any) => r.date?.startsWith(today));
    return rec?.status ?? null;
  }, [attData]);

  const nav = navigation as any;
  const goTo = (screen: string) => {
    if (!kid) return;
    const p = { studentId: kid.id, studentName: `${kid.firstName} ${kid.lastName}`, classId: kid.classId };
    if (screen === 'fees') return nav.navigate('FeesTab', { screen: 'FeesDashboard', params: p });
    if (screen === 'leave') return nav.navigate('AcademicsTab', { screen: 'Leave', params: p });
    nav.navigate('AcademicsTab', { screen, params: p });
  };

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const fmtDate = (d: string) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  };

  const annPriorityColor = (p: string) =>
    p === 'High' || p === 'Urgent' ? '#e53935' : p === 'Medium' ? '#f57c00' : '#43a047';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INDIGO} />}
        >
          {/* ── Top bar ─────────────────────────────────── */}
          <View style={s.topBar}>
            <View>
              <Text style={s.greetSmall}>{greet}</Text>
              <Text style={s.greetName}>{firstName} 👋</Text>
            </View>
            <TouchableOpacity style={s.bellWrap} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#37474f" />
              {(unread ?? 0) > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeTxt}>{(unread ?? 0) > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Child switcher (only if multiple) ───────── */}
          {kids.length > 1 && (
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.kidTabRow}
              style={{ marginBottom: 12 }}
            >
              {kids.map((k: any, i: number) => (
                <TouchableOpacity
                  key={k.id}
                  style={[s.kidTab, i === childIdx && s.kidTabOn]}
                  onPress={() => setChildIdx(i)}
                >
                  <Text style={[s.kidTabTxt, i === childIdx && s.kidTabTxtOn]}>{k.firstName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Child card ──────────────────────────────── */}
          {loadingKids ? (
            <View style={s.kidCard}><ActivityIndicator color={INDIGO} /></View>
          ) : kid ? (
            <TouchableOpacity
              style={s.kidCard}
              onPress={() => navigation.navigate('ChildProfile', { studentId: kid.id })}
              activeOpacity={0.88}
            >
              {/* Avatar */}
              <View style={[s.av, { backgroundColor: avatarColor(kid.firstName) }]}>
                <Text style={s.avTxt}>{kid.firstName?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>

              <View style={s.kidInfo}>
                <Text style={s.kidName}>{kid.firstName} {kid.lastName}</Text>
                <Text style={s.kidClass}>
                  {[kid.class ?? kid.className, kid.section ? `Section ${kid.section}` : null].filter(Boolean).join(' · ')}
                </Text>
                {/* Today attendance badge */}
                {todayAtt && (
                  <View style={[s.todayBadge, { backgroundColor: todayAtt === 'Present' ? '#e8f5e9' : '#ffebee' }]}>
                    <View style={[s.todayDot, { backgroundColor: todayAtt === 'Present' ? '#43a047' : '#e53935' }]} />
                    <Text style={[s.todayTxt, { color: todayAtt === 'Present' ? '#2e7d32' : '#c62828' }]}>
                      {todayAtt === 'Present' ? 'Present today' : 'Absent today'}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#b0bec5" />
            </TouchableOpacity>
          ) : (
            <View style={[s.kidCard, s.kidCardEmpty]}>
              <Ionicons name="person-add-outline" size={28} color="#b0bec5" />
              <Text style={s.emptyTxt}>No child linked to your account.{'\n'}Contact your school admin.</Text>
            </View>
          )}

          {/* ── Stats row ───────────────────────────────── */}
          {kid && (
            <View style={s.statsRow}>
              <TouchableOpacity style={s.statCard} onPress={() => goTo('Attendance')} activeOpacity={0.85}>
                <Text style={s.statNum}>
                  {attPct !== null ? `${attPct}%` : '—'}
                </Text>
                <Text style={s.statLbl}>Attendance</Text>
                {attPct !== null && attPct < 75 && (
                  <Text style={s.statAlert}>⚠ Below 75%</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={s.statCard} onPress={() => goTo('fees')} activeOpacity={0.85}>
                <Text style={[s.statNum, { color: pendingFees > 0 ? '#f57c00' : '#43a047' }]}>
                  {pendingFees > 0 ? `₹${pendingFees.toLocaleString('en-IN')}` : 'All clear'}
                </Text>
                <Text style={s.statLbl}>Fees</Text>
                {pendingFees > 0 && <Text style={[s.statAlert, { color: '#f57c00' }]}>Due</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.statCard} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.85}>
                <Text style={s.statNum}>{unread ?? 0}</Text>
                <Text style={s.statLbl}>Alerts</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Quick actions ────────────────────────────── */}
          {kid && (
            <View style={s.actionsWrap}>
              {[
                { icon: 'calendar-outline', label: 'Attendance', screen: 'Attendance', color: '#7b1fa2' },
                { icon: 'document-text-outline', label: 'Exams', screen: 'Exams', color: '#1565c0' },
                { icon: 'card-outline', label: 'Fees', screen: 'fees', color: '#00695c' },
                { icon: 'airplane-outline', label: 'Leave', screen: 'leave', color: '#c2185b' },
              ].map(a => (
                <TouchableOpacity key={a.screen} style={s.action} onPress={() => goTo(a.screen)} activeOpacity={0.8}>
                  <View style={[s.actionIcon, { backgroundColor: a.color + '15' }]}>
                    <Ionicons name={a.icon as any} size={20} color={a.color} />
                  </View>
                  <Text style={s.actionLbl}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── School updates feed ──────────────────────── */}
          {announcements && announcements.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>School Updates</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {announcements.map((ann: any) => (
                <TouchableOpacity
                  key={ann.id}
                  style={s.feedItem}
                  onPress={() => navigation.navigate('AnnouncementDetail', { id: ann.id })}
                  activeOpacity={0.85}
                >
                  <View style={[s.feedStripe, { backgroundColor: annPriorityColor(ann.priority) }]} />
                  <View style={s.feedBody}>
                    <Text style={s.feedTitle} numberOfLines={2}>{ann.title}</Text>
                    {ann.content ? (
                      <Text style={s.feedSnippet} numberOfLines={1}>{ann.content}</Text>
                    ) : null}
                    <Text style={s.feedDate}>{fmtDate(ann.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#cfd8dc" />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#5c6bc0', '#26a69a', '#ef5350', '#ab47bc', '#ff7043', '#42a5f5'];
function avatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greetSmall: { fontSize: 13, color: '#90a4ae', fontWeight: '500' },
  greetName: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginTop: 2 },
  bellWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  bellBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#ef5350', borderRadius: 99, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  bellBadgeTxt: { fontSize: 8, fontWeight: '700', color: '#fff' },

  // Child tabs
  kidTabRow: { paddingHorizontal: 20, gap: 8 },
  kidTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8eaf6' },
  kidTabOn: { backgroundColor: INDIGO, borderColor: INDIGO },
  kidTabTxt: { fontSize: 13, color: '#78909c', fontWeight: '500' },
  kidTabTxtOn: { color: '#fff', fontWeight: '700' },

  // Child card
  kidCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  kidCardEmpty: { justifyContent: 'center', flexDirection: 'column', gap: 10, paddingVertical: 28 },
  av: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avTxt: { fontSize: 22, fontWeight: '700', color: '#fff' },
  kidInfo: { flex: 1, gap: 2 },
  kidName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  kidClass: { fontSize: 13, color: '#78909c' },
  todayBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, marginTop: 6, gap: 5 },
  todayDot: { width: 6, height: 6, borderRadius: 3 },
  todayTxt: { fontSize: 12, fontWeight: '600' },
  emptyTxt: { fontSize: 14, color: '#90a4ae', textAlign: 'center', lineHeight: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  statLbl: { fontSize: 11, color: '#90a4ae', marginTop: 3, fontWeight: '500' },
  statAlert: { fontSize: 10, color: '#e53935', fontWeight: '700', marginTop: 4 },

  // Actions
  actionsWrap: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 24 },
  action: { flex: 1, alignItems: 'center', gap: 7 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actionLbl: { fontSize: 11, color: '#546e7a', fontWeight: '500' },

  // Section
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  seeAll: { fontSize: 13, color: INDIGO, fontWeight: '600' },

  // Feed
  feedItem: { marginHorizontal: 20, marginBottom: 8, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  feedStripe: { width: 4, alignSelf: 'stretch' },
  feedBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  feedTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', lineHeight: 19 },
  feedSnippet: { fontSize: 12, color: '#90a4ae', marginTop: 2 },
  feedDate: { fontSize: 11, color: '#b0bec5', marginTop: 5 },
});

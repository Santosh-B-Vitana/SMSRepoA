import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface PtmSession {
  id: string;
  title: string;
  description?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  status: string;
  location?: string;
  slotCount: number;
  bookedCount: number;
}

interface PtmSlot {
  id: string;
  slotDateTime: string;
  status: 'available' | 'booked';
  teacherName?: string;
  studentName?: string;
  notes?: string;
  teacherRemarks?: string;
}

interface MyBooking {
  id: string;
  slotDateTime: string;
  status: string;
  sessionTitle?: string;
  sessionLocation?: string;
  teacherName?: string;
  studentName?: string;
  notes?: string;
  teacherRemarks?: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ParentPtmScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'bookings'>('sessions');
  const [selectedSession, setSelectedSession] = useState<PtmSession | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // My children list (to select which child to book for)
  const { data: children = [] } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ['my-children'],
    queryFn: () => apiClient.get('/api/students/my-children').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Available PTM sessions
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery<PtmSession[]>({
    queryKey: ['ptm-sessions-parent'],
    queryFn: () =>
      apiClient.get('/api/ptm/sessions?status=scheduled').then((r) => r.data),
    staleTime: 60_000,
  });

  // Slots for selected session
  const { data: slots = [], isLoading: slotsLoading } = useQuery<PtmSlot[]>({
    queryKey: ['ptm-slots', selectedSession?.id],
    queryFn: () =>
      apiClient
        .get(`/api/ptm/sessions/${selectedSession!.id}/slots`)
        .then((r) => r.data),
    enabled: !!selectedSession,
    staleTime: 30_000,
  });

  // My booked slots
  const {
    data: myBookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery<MyBooking[]>({
    queryKey: ['ptm-my-bookings'],
    queryFn: () => apiClient.get('/api/ptm/parent/my-bookings').then((r) => r.data),
    staleTime: 60_000,
  });

  const bookMutation = useMutation({
    mutationFn: ({ slotId, studentId }: { slotId: string; studentId: string }) =>
      apiClient.post(`/api/ptm/slots/${slotId}/book`, { studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptm-slots', selectedSession?.id] });
      queryClient.invalidateQueries({ queryKey: ['ptm-my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['ptm-sessions-parent'] });
      Alert.alert('Booked!', 'Your PTM slot has been booked successfully.');
    },
    onError: (e: any) => {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not book slot. Please try again.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (slotId: string) =>
      apiClient.post(`/api/ptm/slots/${slotId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptm-my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['ptm-slots'] });
      Alert.alert('Cancelled', 'Your booking has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel. Please try again.'),
  });

  function handleBook(slotId: string) {
    if (!selectedStudentId && children.length > 0) {
      Alert.alert('Select Child', 'Please select which child this booking is for.');
      return;
    }
    const childId = selectedStudentId || (children[0]?.id ?? '');
    Alert.alert(
      'Confirm Booking',
      `Book this slot for ${children.find((c) => c.id === childId)?.firstName ?? 'your child'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book', onPress: () => bookMutation.mutate({ slotId, studentId: childId }) },
      ],
    );
  }

  function handleCancel(booking: MyBooking) {
    Alert.alert(
      'Cancel Booking',
      `Cancel your PTM slot for ${formatDate(booking.slotDateTime)} at ${formatTime(booking.slotDateTime)}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate(booking.id) },
      ],
    );
  }

  const availableSlots = slots.filter((s) => s.status === 'available');
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabText: { fontSize: 14, color: '#6B7280' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: primaryColor },
    tabTextActive: { color: primaryColor, fontWeight: '600' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16 },
    sessionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
    meta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
    bookBtn: { backgroundColor: primaryColor, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
    bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    cancelBtn: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', marginTop: 8 },
    cancelBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
    slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    slotTime: { fontSize: 14, fontWeight: '500', color: '#111827' },
    slotTeacher: { fontSize: 13, color: '#6B7280' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: '#D1FAE5' },
    badgeText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
    childRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    childChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: '#D1D5DB' },
    childChipActive: { backgroundColor: primaryColor, borderColor: primaryColor },
    childChipText: { fontSize: 13, color: '#374151' },
    childChipTextActive: { color: '#fff' },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <SubScreenHeader title="Parent-Teacher Meetings" />

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['sessions', 'bookings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => { setActiveTab(tab); setSelectedSession(null); }}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'sessions' ? 'Available Sessions' : `My Bookings (${myBookings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'sessions' ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={sessionsLoading} onRefresh={refetchSessions} />}
        >
          {sessionsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
          ) : sessions.length === 0 ? (
            <View style={s.empty}>
              <Feather name="calendar" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>No PTM sessions scheduled yet.</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <View key={session.id} style={s.card}>
                <Text style={s.sessionTitle}>{session.title}</Text>
                {session.description ? <Text style={s.meta}>{session.description}</Text> : null}
                <Text style={s.meta}>
                  <Feather name="calendar" size={12} /> {formatDate(session.sessionDate)}
                  {'  '}
                  <Feather name="clock" size={12} /> {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                </Text>
                {session.location ? (
                  <Text style={s.meta}><Feather name="map-pin" size={12} /> {session.location}</Text>
                ) : null}
                <Text style={s.meta}>
                  {session.slotDurationMinutes} min slots · {session.slotCount - session.bookedCount} of {session.slotCount} available
                </Text>

                {selectedSession?.id === session.id ? (
                  <>
                    {/* Child selector */}
                    {children.length > 1 && (
                      <View style={s.childRow}>
                        {children.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[s.childChip, selectedStudentId === c.id && s.childChipActive]}
                            onPress={() => setSelectedStudentId(c.id)}
                          >
                            <Text style={[s.childChipText, selectedStudentId === c.id && s.childChipTextActive]}>
                              {c.firstName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {slotsLoading ? (
                      <ActivityIndicator color={primaryColor} style={{ marginVertical: 12 }} />
                    ) : availableSlots.length === 0 ? (
                      <Text style={[s.meta, { marginTop: 8 }]}>No available slots for this session.</Text>
                    ) : (
                      availableSlots.map((slot) => (
                        <View key={slot.id} style={s.slotRow}>
                          <View>
                            <Text style={s.slotTime}>{formatTime(slot.slotDateTime)}</Text>
                            {slot.teacherName ? (
                              <Text style={s.slotTeacher}>{slot.teacherName}</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={[s.badge, bookMutation.isPending && { opacity: 0.6 }]}
                            onPress={() => handleBook(slot.id)}
                            disabled={bookMutation.isPending}
                          >
                            <Text style={s.badgeText}>Book</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                    <TouchableOpacity onPress={() => setSelectedSession(null)} style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>Close</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={s.bookBtn}
                    onPress={() => {
                      setSelectedSession(session);
                      if (children.length === 1) setSelectedStudentId(children[0].id);
                    }}
                  >
                    <Text style={s.bookBtnText}>View Available Slots</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={bookingsLoading} onRefresh={refetchBookings} />}
        >
          {bookingsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
          ) : myBookings.length === 0 ? (
            <View style={s.empty}>
              <Feather name="check-circle" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>You have no upcoming PTM bookings.</Text>
            </View>
          ) : (
            myBookings.map((booking) => (
              <View key={booking.id} style={s.card}>
                <Text style={s.sessionTitle}>{booking.sessionTitle ?? 'PTM Session'}</Text>
                <Text style={s.meta}>
                  <Feather name="calendar" size={12} /> {formatDate(booking.slotDateTime)}
                  {'  '}
                  <Feather name="clock" size={12} /> {formatTime(booking.slotDateTime)}
                </Text>
                {booking.sessionLocation ? (
                  <Text style={s.meta}><Feather name="map-pin" size={12} /> {booking.sessionLocation}</Text>
                ) : null}
                {booking.teacherName ? (
                  <Text style={s.meta}><Feather name="user" size={12} /> {booking.teacherName}</Text>
                ) : null}
                {booking.studentName ? (
                  <Text style={s.meta}><Feather name="book" size={12} /> For: {booking.studentName}</Text>
                ) : null}
                {booking.teacherRemarks ? (
                  <Text style={[s.meta, { marginTop: 6, fontStyle: 'italic' }]}>
                    Remarks: {booking.teacherRemarks}
                  </Text>
                ) : null}
                {booking.status === 'booked' && new Date(booking.slotDateTime) > new Date() ? (
                  <TouchableOpacity
                    style={[s.cancelBtn, cancelMutation.isPending && { opacity: 0.6 }]}
                    onPress={() => handleCancel(booking)}
                    disabled={cancelMutation.isPending}
                  >
                    <Text style={s.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

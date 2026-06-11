import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const OFFLINE_LEAVE_KEY = 'offline_student_leave_queue';

export default function ApplyLeaveScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const applyMutation = useMutation({
    mutationFn: () => studentApi.applyLeave({ fromDate, toDate, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-leaves'] });
      Alert.alert('Success', 'Leave application submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit leave request. Please try again.');
    },
  });

  function validateDate(d: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());
  }

  async function handleSubmit() {
    if (!fromDate || !toDate || !reason.trim()) {
      Alert.alert('Incomplete', 'Please fill in all fields.');
      return;
    }
    if (!validateDate(fromDate) || !validateDate(toDate)) {
      Alert.alert('Invalid date', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      Alert.alert('Invalid range', '"To date" cannot be before "From date".');
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      const existing = await AsyncStorage.getItem(OFFLINE_LEAVE_KEY);
      const queue = existing ? JSON.parse(existing) as unknown[] : [];
      (queue as { fromDate: string; toDate: string; reason: string; queuedAt: string }[]).push({
        fromDate, toDate, reason, queuedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(OFFLINE_LEAVE_KEY, JSON.stringify(queue));
      Alert.alert(
        'Saved Offline',
        'Your leave request has been saved and will be submitted when you reconnect.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
      return;
    }

    applyMutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Apply Leave
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border, gap: 14 }}>
            {/* From Date */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}>
                From Date <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={VITANA_COLORS.textSecondary}
                style={{
                  backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 12, fontSize: 14, color: VITANA_COLORS.text,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                }}
              />
            </View>

            {/* To Date */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}>
                To Date <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={VITANA_COLORS.textSecondary}
                style={{
                  backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 12, fontSize: 14, color: VITANA_COLORS.text,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                }}
              />
            </View>

            {/* Reason */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}>
                Reason <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Reason for leave..."
                placeholderTextColor={VITANA_COLORS.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                style={{
                  backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 12, fontSize: 14, color: VITANA_COLORS.text,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                  minHeight: 100,
                }}
              />
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, textAlign: 'right', marginTop: 4 }}>
                {reason.length}/500
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={applyMutation.isPending}
            style={{
              backgroundColor: primaryColor, borderRadius: 12,
              paddingVertical: 15, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              {applyMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

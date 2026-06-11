import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const OFFLINE_QUEUE_KEY = 'offline_leave_queue';

interface QueuedLeave {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  createdAt: number;
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    fromDate: z.string().regex(dateRegex, 'Use format YYYY-MM-DD'),
    toDate: z.string().regex(dateRegex, 'Use format YYYY-MM-DD'),
    reason: z
      .string()
      .min(10, 'Please provide a reason (min 10 characters)')
      .max(500, 'Reason too long (max 500 characters)'),
  })
  .refine((d) => new Date(d.toDate) >= new Date(d.fromDate), {
    message: 'To date must be on or after From date',
    path: ['toDate'],
  });

type FormData = z.infer<typeof schema>;

export default function ApplyLeave() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
    });
    return unsubscribe;
  }, []);

  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
  });
  const studentId = children?.[0]?.id;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fromDate: '', toDate: '', reason: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!studentId) throw new Error('Student not found');

      if (isConnected) {
        return parentApi.applyLeave({ studentId, ...data });
      }

      // Queue offline
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: QueuedLeave[] = raw ? (JSON.parse(raw) as QueuedLeave[]) : [];
      const entry: QueuedLeave = {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        studentId,
        ...data,
        createdAt: Date.now(),
      };
      queue.push(entry);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return null;
    },
    onSuccess: (result) => {
      if (result === null) {
        Alert.alert(
          'Saved Offline',
          'Your leave request has been saved and will be submitted automatically when you reconnect.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: ['leaves', studentId] });
        Alert.alert('Success', 'Leave request submitted successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message ?? 'Failed to submit leave request. Please try again.');
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Apply for Leave
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, paddingBottom: 32, gap: 16 }}>
          {/* Offline Banner */}
          {!isConnected && (
            <View
              style={{
                backgroundColor: '#fffbeb',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="wifi-off" size={16} color={VITANA_COLORS.warning} />
              <Text style={{ fontSize: 13, color: '#92400e', flex: 1 }}>
                Offline — your request will be saved and submitted when you reconnect.
              </Text>
            </View>
          )}

          {/* Student Info */}
          {children?.[0] && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginBottom: 4 }}>
                Student
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                {children[0].studentName}
              </Text>
              <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                {children[0].className}
              </Text>
            </View>
          )}

          {/* Date Fields */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}
              >
                From Date
              </Text>
              <Controller
                control={control}
                name="fromDate"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={VITANA_COLORS.textSecondary}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.fromDate ? '#dc2626' : VITANA_COLORS.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: VITANA_COLORS.text,
                      backgroundColor: '#fff',
                    }}
                  />
                )}
              />
              {errors.fromDate && (
                <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  {errors.fromDate.message}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}
              >
                To Date
              </Text>
              <Controller
                control={control}
                name="toDate"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={VITANA_COLORS.textSecondary}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.toDate ? '#dc2626' : VITANA_COLORS.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: VITANA_COLORS.text,
                      backgroundColor: '#fff',
                    }}
                  />
                )}
              />
              {errors.toDate && (
                <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  {errors.toDate.message}
                </Text>
              )}
            </View>
          </View>

          {/* Reason */}
          <View>
            <Text
              style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}
            >
              Reason
            </Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={5}
                  placeholder="Describe the reason for leave..."
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  textAlignVertical="top"
                  style={{
                    borderWidth: 1,
                    borderColor: errors.reason ? '#dc2626' : VITANA_COLORS.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: VITANA_COLORS.text,
                    backgroundColor: '#fff',
                    minHeight: 110,
                  }}
                />
              )}
            />
            {errors.reason && (
              <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                {errors.reason.message}
              </Text>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={() => handleSubmit((data) => mutation.mutate(data))()}
            disabled={mutation.isPending}
            style={{
              backgroundColor: primaryColor,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {isConnected ? 'Submit Request' : 'Save Offline'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    fromDate: z.string().regex(dateRegex, 'Use format YYYY-MM-DD'),
    toDate: z.string().regex(dateRegex, 'Use format YYYY-MM-DD'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  })
  .refine((d) => new Date(d.toDate) >= new Date(d.fromDate), {
    message: 'To date must be on or after From date',
    path: ['toDate'],
  });

type FormData = z.infer<typeof schema>;

export default function ApplyLeave() {
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: teacherApi.getLeaveTypes,
    staleTime: 60 * 60 * 1000,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { leaveTypeId: '', fromDate: '', toDate: '', reason: '' },
  });

  const selectedTypeId = watch('leaveTypeId');

  const mutation = useMutation({
    mutationFn: (data: FormData) => teacherApi.applyOwnLeave(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['own-leaves'] });
      Alert.alert('Success', 'Leave application submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to submit leave request.'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Apply for Leave
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, paddingBottom: 32, gap: 16 }}>
          {/* Leave Type */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 8 }}>
              Leave Type
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {leaveTypes?.map((lt) => (
                <TouchableOpacity
                  key={lt.id}
                  onPress={() => setValue('leaveTypeId', lt.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: selectedTypeId === lt.id ? primaryColor : VITANA_COLORS.border,
                    backgroundColor: selectedTypeId === lt.id ? `${primaryColor}15` : '#fff',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selectedTypeId === lt.id ? primaryColor : VITANA_COLORS.textSecondary,
                    }}
                  >
                    {lt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.leaveTypeId && (
              <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                {errors.leaveTypeId.message}
              </Text>
            )}
          </View>

          {/* Dates */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['fromDate', 'toDate'] as const).map((field) => (
              <View key={field} style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}>
                  {field === 'fromDate' ? 'From Date' : 'To Date'}
                </Text>
                <Controller
                  control={control}
                  name={field}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={VITANA_COLORS.textSecondary}
                      style={{
                        borderWidth: 1,
                        borderColor: errors[field] ? '#dc2626' : VITANA_COLORS.border,
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
                {errors[field] && (
                  <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                    {errors[field]?.message}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Reason */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 6 }}>
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
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Submit Application</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

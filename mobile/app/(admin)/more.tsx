import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  adminApi,
  type StudentSearchResult,
  type StaffSearchResult,
} from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { useAuthStore } from '@/stores/authStore';

type SearchTab = 'students' | 'staff';

const DEBOUNCE_MS = 300;

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
      <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={VITANA_COLORS.textSecondary}
        className="flex-1 ml-2 text-gray-900 text-sm"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function StudentCard({ item }: { item: StudentSearchResult }) {
  return (
    <View className="bg-white border-b border-gray-50 px-4 py-3 flex-row items-center">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: VITANA_COLORS.infoLight }}
      >
        <Text className="text-blue-700 font-semibold text-sm">
          {item.fullName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-medium text-sm">{item.fullName}</Text>
        <Text className="text-gray-500 text-xs">
          {item.className} · {item.sectionName} · Roll {item.rollNumber}
        </Text>
      </View>
    </View>
  );
}

function StaffCard({ item }: { item: StaffSearchResult }) {
  return (
    <View className="bg-white border-b border-gray-50 px-4 py-3 flex-row items-center">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: VITANA_COLORS.successLight }}
      >
        <Text className="text-green-700 font-semibold text-sm">
          {item.fullName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-medium text-sm">{item.fullName}</Text>
        <Text className="text-gray-500 text-xs">
          {item.designation} · {item.email}
        </Text>
      </View>
    </View>
  );
}

export default function AdminMore() {
  const { colors } = useAppTheme();
  const { clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SearchTab>('students');
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setRawQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, DEBOUNCE_MS);
  }, []);

  const studentsQuery = useQuery({
    queryKey: ['search-students', debouncedQuery],
    queryFn: () => adminApi.searchStudents(debouncedQuery),
    enabled: activeTab === 'students' && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const staffQuery = useQuery({
    queryKey: ['search-staff', debouncedQuery],
    queryFn: () => adminApi.searchStaff(debouncedQuery),
    enabled: activeTab === 'staff' && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const activeQuery = activeTab === 'students' ? studentsQuery : staffQuery;
  const results =
    activeTab === 'students'
      ? (studentsQuery.data?.items ?? [])
      : (staffQuery.data?.items ?? []);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
        {/* Search section header */}
        <View className="bg-background px-4 pt-4 pb-2">
          <Text className="text-xl font-bold text-gray-900 mb-3">Search</Text>

          {/* Tab toggle */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3">
            {(['students', 'staff'] as SearchTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setRawQuery('');
                  setDebouncedQuery('');
                }}
                className="flex-1 py-2.5 rounded-lg items-center"
                style={{ backgroundColor: activeTab === tab ? colors.primary : 'transparent' }}
              >
                <Text
                  className="font-medium capitalize text-sm"
                  style={{ color: activeTab === tab ? 'white' : VITANA_COLORS.textSecondary }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SearchBar
            value={rawQuery}
            onChange={handleQueryChange}
            placeholder={`Search ${activeTab}... (min 2 chars)`}
          />
        </View>

        {/* Search results */}
        {debouncedQuery.length >= 2 ? (
          activeQuery.isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : results.length === 0 ? (
            <View className="py-6 items-center">
              <Feather name="search" size={32} color={VITANA_COLORS.textSecondary} />
              <Text className="text-gray-500 text-sm mt-2">No results for "{debouncedQuery}"</Text>
            </View>
          ) : (
            <View className="bg-white mx-4 rounded-xl overflow-hidden border border-gray-100 shadow-sm mb-4">
              <Text className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-b border-gray-100">
                {activeQuery.data?.totalCount ?? results.length} results
              </Text>
              {activeTab === 'students'
                ? (results as StudentSearchResult[]).map((item) => (
                    <StudentCard key={item.id} item={item} />
                  ))
                : (results as StaffSearchResult[]).map((item) => (
                    <StaffCard key={item.id} item={item} />
                  ))}
            </View>
          )
        ) : debouncedQuery.length > 0 && debouncedQuery.length < 2 ? (
          <View className="py-4 items-center">
            <Text className="text-gray-400 text-sm">Type at least 2 characters to search</Text>
          </View>
        ) : null}

        {/* Settings section */}
        <View className="px-4 mt-2">
          <Text className="text-base font-bold text-gray-900 mb-3">Settings</Text>
          <View className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <TouchableOpacity
              onPress={() => router.push('/(admin)/notifications/settings')}
              className="flex-row items-center px-4 py-4 border-b border-gray-50"
            >
              <Feather name="bell" size={20} color={VITANA_COLORS.textSecondary} />
              <Text className="flex-1 text-gray-800 font-medium ml-3">Notification Settings</Text>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/notifications')}
              className="flex-row items-center px-4 py-4 border-b border-gray-50"
            >
              <Feather name="inbox" size={20} color={VITANA_COLORS.textSecondary} />
              <Text className="flex-1 text-gray-800 font-medium ml-3">Notification Center</Text>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center px-4 py-4"
            >
              <Feather name="log-out" size={20} color={VITANA_COLORS.error} />
              <Text className="flex-1 font-medium ml-3" style={{ color: VITANA_COLORS.error }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

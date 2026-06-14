import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface Book {
  id: string; title: string; author: string; isbn?: string;
  category?: string; totalCopies: number; availableCopies: number;
  issuedCopies: number; coverUrl?: string | null;
}

interface IssuedBook {
  id: string;
  bookTitle: string;
  bookIsbn?: string;
  studentName: string;
  studentClass?: string;
  studentSection?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  /** Backend field: 'issued' | 'returned' | 'overdue' */
  status?: string;
  fine?: number;
  daysOverdue?: number;
  /** Derived — backend uses status field, not a boolean */
  isOverdue?: boolean;
  fineAmount?: number;
}

type ViewMode = 'books' | 'issued';

function BookCard({ item }: { item: Book }) {
  const available = item.availableCopies > 0;
  return (
    <View style={styles.bookCard}>
      <View style={[styles.bookIcon, { backgroundColor: available ? '#dcfce7' : '#fee2e2' }]}>
        <Feather name="book" size={22} color={available ? '#059669' : '#ef4444'} />
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        {item.category && <Text style={styles.bookCategory}>{item.category}</Text>}
        {item.isbn && <Text style={styles.bookIsbn}>ISBN: {item.isbn}</Text>}
      </View>
      <View style={styles.bookCopies}>
        <Text style={[styles.copyNum, { color: available ? '#059669' : '#ef4444' }]}>
          {item.availableCopies}
        </Text>
        <Text style={styles.copyLabel}>avail</Text>
        <Text style={styles.copyTotal}>of {item.totalCopies}</Text>
      </View>
    </View>
  );
}

function IssuedCard({ item }: { item: IssuedBook }) {
  const status   = (item.status ?? '').toLowerCase();
  const returned = status === 'returned' || !!item.returnDate;
  const overdue  = !returned && (status === 'overdue' || item.isOverdue === true || (item.daysOverdue ?? 0) > 0);
  return (
    <View style={[styles.issuedCard, overdue && styles.overdueCard]}>
      <View style={styles.issuedHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.issuedBookTitle} numberOfLines={1}>{item.bookTitle}</Text>
          {item.bookAuthor && <Text style={styles.issuedBookAuthor}>{item.bookAuthor}</Text>}
        </View>
        <View style={[styles.issuedBadge, returned ? styles.returnedBadge : overdue ? styles.overdueBadge : styles.activeBadge]}>
          <Text style={styles.issuedBadgeText}>{returned ? 'Returned' : overdue ? 'Overdue' : 'Active'}</Text>
        </View>
      </View>
      <View style={styles.issuedStudent}>
        <Feather name="user" size={13} color={VITANA_COLORS.textSecondary} />
        <Text style={styles.issuedStudentName}>{item.studentName}</Text>
        {(item.studentClass || item.studentSection) && (
          <Text style={styles.issuedStudentClass}>· {item.studentClass} {item.studentSection}</Text>
        )}
      </View>
      <View style={styles.issuedDates}>
        <Text style={styles.issuedDate}>Issued: {new Date(item.issueDate).toLocaleDateString('en-IN')}</Text>
        <Text style={[styles.issuedDate, overdue && !returned && { color: '#ef4444', fontWeight: '600' }]}>
          Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}
        </Text>
        {returned && <Text style={styles.returnedDate}>Returned: {new Date(item.returnDate!).toLocaleDateString('en-IN')}</Text>}
        {overdue && !returned && (item.fine ?? item.fineAmount ?? 0) > 0 && (
          <Text style={styles.fine}>Fine: ₹{item.fine ?? item.fineAmount}</Text>
        )}
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const { primaryColor } = useSchoolTheme();
  const [mode, setMode] = useState<ViewMode>('books');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const booksQuery = useInfiniteQuery({
    queryKey: ['admin-library-books', debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/library/books', {
        params: { page: pageParam, pageSize: 20, search: debouncedSearch || undefined },
      }) as Promise<{ books?: Book[]; items?: Book[]; totalCount: number }>,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const items = lastPage.books ?? lastPage.items ?? [];
      return items.length === 20 ? pages.length + 1 : undefined;
    },
    enabled: mode === 'books',
    staleTime: 2 * 60 * 1000,
  });

  // Correct endpoint: GET /library/issues — response shape: { issues: BookIssueResponse[], total, page, pageSize }
  // BookIssueResponse fields: id, bookTitle, studentName, studentClass, studentSection, issueDate, dueDate, returnDate, status, fine
  const issuedQuery = useInfiniteQuery({
    queryKey: ['admin-library-issued', debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/library/issues', {
        params: {
          page: pageParam,
          pageSize: 20,
          status: 'issued',
          search: debouncedSearch || undefined,
        },
      }) as Promise<{ issues: IssuedBook[]; total: number; page: number; pageSize: number }>,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      (lastPage.issues ?? []).length === 20 ? pages.length + 1 : undefined,
    enabled: mode === 'issued',
    staleTime: 2 * 60 * 1000,
  });

  const activeQuery = mode === 'books' ? booksQuery : issuedQuery;
  const allBooks   = booksQuery.data?.pages.flatMap((p) => p.books ?? p.items ?? []) ?? [];
  const allIssued  = issuedQuery.data?.pages.flatMap((p) => p.issues ?? []) ?? [];

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => setDebouncedSearch(text), 400);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Library" />

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'books' && { backgroundColor: primaryColor }]}
          onPress={() => setMode('books')}
        >
          <Feather name="book" size={14} color={mode === 'books' ? '#fff' : VITANA_COLORS.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'books' && { color: '#fff' }]}>Books</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'issued' && { backgroundColor: primaryColor }]}
          onPress={() => setMode('issued')}
        >
          <Feather name="user-check" size={14} color={mode === 'issued' ? '#fff' : VITANA_COLORS.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'issued' && { color: '#fff' }]}>Issued Books</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={mode === 'books' ? 'Search books by title, author...' : 'Search by student name, book...'}
          placeholderTextColor={VITANA_COLORS.textSecondary}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} style={{ padding: 8 }}>
            <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={mode === 'books' ? allBooks : allIssued}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          mode === 'books' ? <BookCard item={item as Book} /> : <IssuedCard item={item as IssuedBook} />
        }
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={activeQuery.refetch}
            tintColor={primaryColor}
          />
        }
        onEndReached={() => {
          if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) void activeQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 32, gap: 8 }}
        ListEmptyComponent={
          activeQuery.isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="book-open" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>
                {mode === 'books' ? 'No books found' : 'No issued books'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={activeQuery.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={primaryColor} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  modeRow: { flexDirection: 'row', margin: 12, gap: 8 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginBottom: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 14, color: VITANA_COLORS.text },
  bookCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'flex-start', gap: 12,
  },
  bookIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  bookAuthor: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  bookCategory: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  bookIsbn: { fontSize: 10, color: '#9ca3af' },
  bookCopies: { alignItems: 'center' },
  copyNum: { fontSize: 22, fontWeight: '800' },
  copyLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  copyTotal: { fontSize: 11, color: '#9ca3af' },
  issuedCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 8,
  },
  overdueCard: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  issuedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  issuedBookTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  issuedBookAuthor: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  issuedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadge: { backgroundColor: '#dcfce7' },
  overdueBadge: { backgroundColor: '#fee2e2' },
  returnedBadge: { backgroundColor: '#f3f4f6' },
  issuedBadgeText: { fontSize: 11, fontWeight: '600', color: VITANA_COLORS.text },
  issuedStudent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  issuedStudentName: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text },
  issuedStudentClass: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  issuedDates: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  issuedDate: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  returnedDate: { fontSize: 12, color: '#059669' },
  fine: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
});

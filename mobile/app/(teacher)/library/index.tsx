import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  totalCopies: number;
  availableCopies: number;
  publisher?: string | null;
}

interface BookIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentClass?: string | null;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'issued' | 'returned' | 'overdue';
  fineAmount?: number | null;
}

type Tab = 'catalog' | 'issued' | 'overdue';

// ─── Book Card ────────────────────────────────────────────────────────────────

function BookCard({
  book,
  primaryColor,
  onIssue,
}: {
  book: Book;
  primaryColor: string;
  onIssue: (book: Book) => void;
}) {
  const available = book.availableCopies > 0;
  return (
    <View style={styles.card}>
      <View style={styles.bookIcon}>
        <Feather name="book" size={20} color={primaryColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
        {book.category && <Text style={styles.bookMeta}>{book.category}</Text>}
        <View style={styles.copyRow}>
          <View style={[styles.badge, { backgroundColor: available ? '#dcfce7' : '#fef2f2' }]}>
            <Text style={[styles.badgeText, { color: available ? '#15803d' : '#dc2626' }]}>
              {available ? `${book.availableCopies} Available` : 'Not Available'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.issueBtn, { backgroundColor: available ? primaryColor : '#e5e7eb' }]}
        onPress={() => onIssue(book)}
        disabled={!available}
      >
        <Feather name="arrow-right" size={14} color={available ? '#fff' : '#9ca3af'} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Issue Card ───────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  primaryColor,
  onReturn,
  returning,
}: {
  issue: BookIssue;
  primaryColor: string;
  onReturn: (id: string) => void;
  returning: boolean;
}) {
  const isOverdue = issue.status === 'overdue';
  const dueDate = new Date(issue.dueDate);
  const daysUntilDue = Math.floor((dueDate.getTime() - Date.now()) / 86400000);

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Text style={styles.bookTitle} numberOfLines={1}>{issue.bookTitle}</Text>
        <Text style={styles.bookAuthor}>{issue.studentName}</Text>
        {issue.studentClass && <Text style={styles.bookMeta}>{issue.studentClass}</Text>}
        <View style={styles.datesRow}>
          <Text style={styles.dateText}>
            Issued: {new Date(issue.issueDate).toLocaleDateString('en-IN')}
          </Text>
          <Text style={[styles.dateText, isOverdue && { color: '#dc2626', fontWeight: '600' }]}>
            Due: {dueDate.toLocaleDateString('en-IN')}
            {isOverdue ? ' (Overdue)' : daysUntilDue <= 2 ? ` (${daysUntilDue}d left)` : ''}
          </Text>
        </View>
        {issue.fineAmount != null && issue.fineAmount > 0 && (
          <Text style={styles.fineText}>Fine: ₹{issue.fineAmount}</Text>
        )}
      </View>
      {issue.status !== 'returned' && (
        <TouchableOpacity
          style={[styles.returnBtn, { borderColor: primaryColor }]}
          onPress={() => onReturn(issue.id)}
          disabled={returning}
        >
          {returning ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Text style={[styles.returnBtnText, { color: primaryColor }]}>Return</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [search, setSearch] = useState('');
  const [issueModal, setIssueModal] = useState<Book | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [daysToIssue, setDaysToIssue] = useState('14');
  const [returningId, setReturningId] = useState<string | null>(null);

  const booksQuery = useQuery<Book[]>({
    queryKey: ['library-books', search],
    queryFn: () =>
      (apiClient.get('/library/books', { params: { search: search || undefined, pageSize: 50 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.books ?? r ?? []),
    staleTime: 2 * 60 * 1000,
  });

  const issuesQuery = useQuery<BookIssue[]>({
    queryKey: ['library-issues', activeTab],
    queryFn: () =>
      (apiClient.get('/library/issues', {
        params: { status: activeTab === 'overdue' ? 'overdue' : 'issued', pageSize: 100 },
      }) as Promise<any>).then((r) => r?.items ?? r?.issues ?? r ?? []),
    enabled: activeTab !== 'catalog',
    staleTime: 60 * 1000,
  });

  const issueMutation = useMutation({
    mutationFn: ({ bookId, studentName, days }: { bookId: string; studentName: string; days: number }) =>
      apiClient.post('/library/issues', { bookId, studentName, daysAllowed: days }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library-books'] });
      void queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      setIssueModal(null);
      setStudentSearch('');
    },
    onError: () => Alert.alert('Error', 'Failed to issue book. Please try again.'),
  });

  const returnMutation = useMutation({
    mutationFn: (issueId: string) => apiClient.put(`/library/issues/${issueId}/return`, {}),
    onSuccess: () => {
      setReturningId(null);
      void queryClient.invalidateQueries({ queryKey: ['library-issues'] });
      void queryClient.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: () => {
      setReturningId(null);
      Alert.alert('Error', 'Failed to record return.');
    },
  });

  function handleReturn(id: string) {
    Alert.alert('Return Book', 'Confirm book return?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => { setReturningId(id); returnMutation.mutate(id); } },
    ]);
  }

  function handleIssueSubmit() {
    if (!issueModal) return;
    if (!studentSearch.trim()) { Alert.alert('Required', 'Student name is required.'); return; }
    const days = parseInt(daysToIssue, 10);
    if (isNaN(days) || days < 1) { Alert.alert('Invalid', 'Enter a valid number of days.'); return; }
    issueMutation.mutate({ bookId: issueModal.id, studentName: studentSearch.trim(), days });
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'catalog', label: 'Catalog' },
    { key: 'issued', label: 'Issued' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Library" />

      {/* Tab bar */}
      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={[styles.tab, activeTab === key && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, activeTab === key && { color: primaryColor, fontWeight: '600' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Catalog search */}
      {activeTab === 'catalog' && (
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, author or ISBN…"
            placeholderTextColor={VITANA_COLORS.textSecondary}
          />
        </View>
      )}

      {/* Lists */}
      {activeTab === 'catalog' ? (
        booksQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (booksQuery.data ?? []).length === 0 ? (
          <EmptyState icon="book" title="No books found" subtitle="Try a different search term." />
        ) : (
          <FlatList
            data={booksQuery.data ?? []}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <BookCard book={item} primaryColor={primaryColor} onIssue={setIssueModal} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshing={booksQuery.isFetching}
            onRefresh={() => booksQuery.refetch()}
          />
        )
      ) : (
        issuesQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (issuesQuery.data ?? []).length === 0 ? (
          <EmptyState icon="check-circle" title={activeTab === 'overdue' ? 'No overdue books' : 'No issued books'} subtitle="All clear!" />
        ) : (
          <FlatList
            data={issuesQuery.data ?? []}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <IssueCard
                issue={item}
                primaryColor={primaryColor}
                onReturn={handleReturn}
                returning={returningId === item.id && returnMutation.isPending}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshing={issuesQuery.isFetching}
            onRefresh={() => issuesQuery.refetch()}
          />
        )
      )}

      {/* Issue Book Modal */}
      <Modal visible={!!issueModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIssueModal(null)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Issue Book</Text>
            <TouchableOpacity onPress={() => setIssueModal(null)}>
              <Feather name="x" size={22} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {issueModal && (
                <View style={styles.selectedBook}>
                  <Feather name="book" size={18} color={primaryColor} />
                  <View>
                    <Text style={styles.selectedBookTitle}>{issueModal.title}</Text>
                    <Text style={styles.selectedBookAuthor}>{issueModal.author}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.fieldLabel}>Student Name *</Text>
              <TextInput
                style={styles.input}
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Enter student name"
                placeholderTextColor={VITANA_COLORS.textSecondary}
              />
              <Text style={styles.fieldLabel}>Loan Period (days)</Text>
              <TextInput
                style={styles.input}
                value={daysToIssue}
                onChangeText={setDaysToIssue}
                keyboardType="number-pad"
                placeholder="14"
                placeholderTextColor={VITANA_COLORS.textSecondary}
              />
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, issueMutation.isPending && { opacity: 0.6 }]}
                onPress={handleIssueSubmit}
                disabled={issueMutation.isPending}
              >
                {issueMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Issue Book</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: VITANA_COLORS.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  bookAuthor: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  bookMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  copyRow: { marginTop: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  issueBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cardBody: { flex: 1, gap: 4 },
  datesRow: { gap: 2, marginTop: 4 },
  dateText: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  fineText: { fontSize: 12, fontWeight: '600', color: '#dc2626', marginTop: 2 },
  returnBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, marginTop: 2 },
  returnBtnText: { fontSize: 12, fontWeight: '600' },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  modalContent: { padding: 20, gap: 12, paddingBottom: 40 },
  selectedBook: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  selectedBookTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  selectedBookAuthor: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: VITANA_COLORS.text,
    backgroundColor: '#fafafa',
  },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

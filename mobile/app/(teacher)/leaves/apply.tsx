import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatDisplay(d: Date | null) {
  if (!d) return 'Select date';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toApiDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── StyleSheets (declared first to avoid TDZ issues on Hermes) ──────────────

const calSt = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    paddingVertical: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
});

const balSt = StyleSheet.create({
  card: {
    width: 128,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  count: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Poppins',
    lineHeight: 34,
  },
  sub: {
    fontSize: 10,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  barBg: {
    height: 4,
    width: 100,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  usedText: {
    fontSize: 9,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  cfText: {
    fontSize: 9,
    color: '#7c3aed',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

// ─── Inline Calendar ──────────────────────────────────────────────────────────

interface CalendarProps {
  primaryColor: string;
  fromDate: Date | null;
  toDate: Date | null;
  onDayPress: (date: Date) => void;
  calYear: number;
  calMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function Calendar({
  primaryColor,
  fromDate,
  toDate,
  onDayPress,
  calYear,
  calMonth,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const today = toDateOnly(new Date());
  const minDate = toDateOnly(new Date(today.getTime() - 60 * 86400000));
  const maxDate = toDateOnly(new Date(today.getTime() + 365 * 86400000));
  const days = buildCalendarDays(calYear, calMonth);
  const weeks = Math.ceil(days.length / 7);

  return (
    <View style={calSt.container}>
      {/* Month navigation */}
      <View style={calSt.monthRow}>
        <TouchableOpacity onPress={onPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={20} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={calSt.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
        <TouchableOpacity onPress={onNextMonth} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
          <Feather name="chevron-right" size={20} color={VITANA_COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={calSt.row}>
        {DAY_ABBR.map((h) => (
          <Text key={h} style={calSt.dayHeader}>{h}</Text>
        ))}
      </View>

      {/* Day cells */}
      {Array.from({ length: weeks }, (_, wk) => (
        <View key={wk} style={calSt.row}>
          {days.slice(wk * 7, wk * 7 + 7).map((date, di) => {
            if (!date) return <View key={di} style={calSt.dayCell} />;

            const d = toDateOnly(date);
            const isStart = !!fromDate && isSameDay(d, fromDate);
            const isEnd = !!toDate && isSameDay(d, toDate);
            const isBetween =
              !!fromDate && !!toDate &&
              d.getTime() > fromDate.getTime() &&
              d.getTime() < toDate.getTime();
            const isToday = isSameDay(d, today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isDisabled = d < minDate || d > maxDate;

            const cellBg =
              isStart || isEnd ? primaryColor
              : isBetween ? `${primaryColor}20`
              : 'transparent';

            const textCol = isDisabled
              ? '#d1d5db'
              : isStart || isEnd ? '#ffffff'
              : isBetween ? primaryColor
              : isWeekend ? VITANA_COLORS.textSecondary
              : VITANA_COLORS.text;

            return (
              <TouchableOpacity
                key={di}
                onPress={() => !isDisabled && onDayPress(d)}
                disabled={isDisabled}
                activeOpacity={0.7}
                style={[
                  calSt.dayCell,
                  {
                    backgroundColor: cellBg,
                    borderRadius: isBetween ? 6 : 10,
                    borderWidth: isToday && !isStart && !isEnd ? 1.5 : 0,
                    borderColor: primaryColor,
                  },
                ]}
              >
                <Text style={[calSt.dayText, {
                  color: textCol,
                  fontWeight: isToday || isStart || isEnd ? '700' : '400',
                }]}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Balance card ─────────────────────────────────────────────────────────────

interface BalanceCardProps {
  name: string;
  available: number;
  used: number;
  totalAllowed: number;
  carriedForward: number;
  isSelected: boolean;
  primaryColor: string;
  onPress: () => void;
}

function BalanceCard({
  name, available, used, totalAllowed, carriedForward, isSelected, primaryColor, onPress,
}: BalanceCardProps) {
  const total = totalAllowed + carriedForward;
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((available / total) * 100))) : 0;
  const barColor = available <= 0 ? '#ef4444' : available / Math.max(1, total) > 0.5 ? '#16a34a' : '#d97706';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        balSt.card,
        isSelected && { borderColor: primaryColor, borderWidth: 2 },
      ]}
    >
      <Text style={balSt.label} numberOfLines={1}>{name}</Text>
      <Text style={[balSt.count, { color: barColor }]}>{available}</Text>
      <Text style={balSt.sub}>
        of {totalAllowed}{carriedForward > 0 ? `+${carriedForward}` : ''} days
      </Text>
      <View style={balSt.barBg}>
        <View style={[balSt.barFill, { width: pct, backgroundColor: barColor }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={balSt.usedText}>{used} used</Text>
        {carriedForward > 0 && (
          <Text style={balSt.cfText}>+{carriedForward} c/f</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '700',
      color: VITANA_COLORS.textSecondary,
      fontFamily: 'Inter',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    }}>
      {children}
    </Text>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ApplyLeave() {
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calendar navigation
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // API queries
  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: teacherApi.getLeaveTypes,
    staleTime: 60 * 60 * 1000,
  });

  const { data: balanceRaw } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: teacherApi.getLeaveBalance,
    staleTime: 5 * 60 * 1000,
  });
  const balanceList = Array.isArray(balanceRaw) ? balanceRaw : [];

  const mutation = useMutation({
    mutationFn: (d: { leaveTypeId: string; fromDate: string; toDate: string; reason: string }) =>
      teacherApi.applyOwnLeave(d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['own-leaves'] });
      void qc.invalidateQueries({ queryKey: ['leave-balance'] });
      void qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      Alert.alert('Submitted', 'Your leave application has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to submit leave request.'),
  });

  // Computed
  const dayCount =
    fromDate && toDate
      ? Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
      : fromDate ? 1 : 0;

  const selectedBalance = balanceList.find((b) => b.leaveTypeId === leaveTypeId);

  // Calendar interaction
  const handleDayPress = useCallback(
    (date: Date) => {
      setErrors((e) => ({ ...e, fromDate: '', toDate: '' }));
      if (!fromDate || (fromDate && toDate)) {
        setFromDate(date);
        setToDate(null);
      } else {
        if (date.getTime() < fromDate.getTime()) {
          setFromDate(date);
          setToDate(null);
        } else {
          setToDate(date);
        }
      }
    },
    [fromDate, toDate],
  );

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!leaveTypeId) e.leaveTypeId = 'Please select a leave type';
    if (!fromDate) e.fromDate = 'Please select a start date';
    if (!toDate) e.toDate = 'Please select an end date';
    if (reason.trim().length < 10) e.reason = 'Reason must be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate({
      leaveTypeId,
      fromDate: toApiDate(fromDate!),
      toDate: toApiDate(toDate!),
      reason: reason.trim(),
    });
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Apply for Leave</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.body}>

          {/* ── Leave Balance ──────────────────────────────────── */}
          {balanceList.length > 0 && (
            <View>
              <SectionLabel>Leave Balance</SectionLabel>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -16 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {balanceList.map((b) => (
                  <BalanceCard
                    key={b.leaveTypeId}
                    name={b.leaveTypeName}
                    available={b.available}
                    used={b.used}
                    totalAllowed={b.totalAllowed}
                    carriedForward={b.carriedForward}
                    isSelected={leaveTypeId === b.leaveTypeId}
                    primaryColor={primaryColor}
                    onPress={() => {
                      setLeaveTypeId(b.leaveTypeId);
                      setErrors((e) => ({ ...e, leaveTypeId: '' }));
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Leave Type ─────────────────────────────────────── */}
          <View>
            <SectionLabel>Leave Type</SectionLabel>
            <View style={st.pillRow}>
              {(leaveTypes ?? []).map((lt) => {
                const bal = balanceList.find((b) => b.leaveTypeId === lt.id);
                const isActive = leaveTypeId === lt.id;
                return (
                  <TouchableOpacity
                    key={lt.id}
                    onPress={() => {
                      setLeaveTypeId(lt.id);
                      setErrors((e) => ({ ...e, leaveTypeId: '' }));
                    }}
                    activeOpacity={0.7}
                    style={[
                      st.pill,
                      isActive && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` },
                    ]}
                  >
                    <Text style={[st.pillText, isActive && { color: primaryColor }]}>
                      {lt.name}
                    </Text>
                    {bal !== undefined && (
                      <View style={[
                        st.pillBadge,
                        { backgroundColor: isActive ? primaryColor : '#e5e7eb' },
                      ]}>
                        <Text style={[
                          st.pillBadgeText,
                          { color: isActive ? '#fff' : VITANA_COLORS.textSecondary },
                        ]}>
                          {bal.available}d
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.leaveTypeId ? <Text style={st.errText}>{errors.leaveTypeId}</Text> : null}
          </View>

          {/* ── Date Picker ────────────────────────────────────── */}
          <View>
            <View style={st.dateHeaderRow}>
              <SectionLabel>Select Dates</SectionLabel>
              {(fromDate || toDate) && (
                <TouchableOpacity
                  onPress={() => { setFromDate(null); setToDate(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 12, color: primaryColor, fontWeight: '600', fontFamily: 'Inter' }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* From / To chips */}
            <View style={st.dateChipRow}>
              <View style={[st.dateChip, !fromDate && st.dateChipDashed]}>
                <Feather
                  name="log-in"
                  size={13}
                  color={fromDate ? primaryColor : VITANA_COLORS.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[st.chipLabel, fromDate && { color: primaryColor }]}>
                    {fromDate ? formatDisplay(fromDate) : 'From date'}
                  </Text>
                  {fromDate && (
                    <Text style={st.chipSub}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][fromDate.getDay()]}
                    </Text>
                  )}
                </View>
              </View>

              <Feather name="arrow-right" size={14} color={VITANA_COLORS.border} />

              <View style={[st.dateChip, !toDate && st.dateChipDashed]}>
                <Feather
                  name="log-out"
                  size={13}
                  color={toDate ? primaryColor : VITANA_COLORS.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[st.chipLabel, toDate && { color: primaryColor }]}>
                    {toDate ? formatDisplay(toDate) : 'To date'}
                  </Text>
                  {toDate && (
                    <Text style={st.chipSub}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][toDate.getDay()]}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {!fromDate && (
              <Text style={st.hintText}>Tap a date to set start, then tap another to set end</Text>
            )}
            {fromDate && !toDate && (
              <Text style={st.hintText}>Now tap the end date</Text>
            )}

            <Calendar
              primaryColor={primaryColor}
              fromDate={fromDate}
              toDate={toDate}
              onDayPress={handleDayPress}
              calYear={calYear}
              calMonth={calMonth}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />

            {(errors.fromDate || errors.toDate) && (
              <Text style={st.errText}>{errors.fromDate || errors.toDate}</Text>
            )}
          </View>

          {/* ── Days summary pill ──────────────────────────────── */}
          {dayCount > 0 && (
            <View style={[st.summaryPill, { backgroundColor: `${primaryColor}10` }]}>
              <View style={[st.summaryIcon, { backgroundColor: `${primaryColor}20` }]}>
                <Feather name="sun" size={15} color={primaryColor} />
              </View>
              <Text style={[st.summaryText, { color: primaryColor }]}>
                {dayCount} {dayCount === 1 ? 'day' : 'days'} selected
              </Text>
              {selectedBalance !== undefined && dayCount > selectedBalance.available && (
                <View style={st.warnBadge}>
                  <Feather name="alert-triangle" size={11} color="#d97706" />
                  <Text style={st.warnText}>Exceeds balance</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Reason ─────────────────────────────────────────── */}
          <View>
            <SectionLabel>Reason for Leave</SectionLabel>
            <TextInput
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                if (v.trim().length >= 10) setErrors((e) => ({ ...e, reason: '' }));
              }}
              multiline
              numberOfLines={5}
              placeholder="Briefly describe the reason for your leave (min. 10 characters)"
              placeholderTextColor={VITANA_COLORS.textSecondary}
              textAlignVertical="top"
              style={[st.textArea, errors.reason ? { borderColor: '#dc2626' } : null]}
            />
            {errors.reason ? <Text style={st.errText}>{errors.reason}</Text> : null}
          </View>

          {/* ── Submit ─────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.85}
            style={[
              st.submitBtn,
              { backgroundColor: primaryColor, opacity: mutation.isPending ? 0.7 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={st.submitText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  body: {
    padding: 16,
    paddingBottom: 48,
    gap: 22,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: VITANA_COLORS.border,
    backgroundColor: '#fff',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  pillBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateChipDashed: {
    borderStyle: 'dashed',
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: VITANA_COLORS.textSecondary,
  },
  chipSub: {
    fontSize: 10,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  hintText: {
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
    flex: 1,
  },
  warnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
    fontFamily: 'Inter',
  },
  textArea: {
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: VITANA_COLORS.text,
    backgroundColor: '#fff',
    minHeight: 120,
    fontFamily: 'Inter',
  },
  errText: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Inter',
  },
});

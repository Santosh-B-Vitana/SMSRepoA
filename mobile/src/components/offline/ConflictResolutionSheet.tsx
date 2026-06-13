import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSchoolTheme } from '../../theme/useSchoolTheme';
import { VITANA_COLORS } from '../../theme/tokens';

export interface ConflictRecord {
  studentId: string;
  studentName: string;
  localValue: string;
  serverValue: string;
}

type Resolution = 'keep_server' | 'use_mine';

interface Props {
  visible: boolean;
  title?: string;
  subtitle?: string;
  conflicts: ConflictRecord[];
  onResolve: (resolutions: Record<string, Resolution>) => void;
  onDismiss: () => void;
}

export function ConflictResolutionSheet({
  visible,
  title = 'Sync Conflict',
  subtitle,
  conflicts,
  onResolve,
  onDismiss,
}: Props) {
  const { primaryColor } = useSchoolTheme();
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});

  const defaultSubtitle = `${conflicts.length} item${conflicts.length !== 1 ? 's' : ''} already ha${conflicts.length !== 1 ? 've' : 's'} data recorded. Choose which version to keep.`;

  function resolveAll(choice: Resolution) {
    const all: Record<string, Resolution> = {};
    conflicts.forEach((c) => {
      all[c.studentId] = choice;
    });
    setResolutions(all);
  }

  function resolveOne(studentId: string, choice: Resolution) {
    setResolutions((prev) => ({ ...prev, [studentId]: choice }));
  }

  const allResolved = conflicts.length > 0 && conflicts.every((c) => resolutions[c.studentId]);

  function handleApply() {
    if (!allResolved) return;
    onResolve(resolutions);
    setResolutions({});
  }

  function handleDismiss() {
    setResolutions({});
    onDismiss();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Feather name="alert-triangle" size={20} color={VITANA_COLORS.warning} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{subtitle ?? defaultSubtitle}</Text>
          </View>

          {/* Bulk actions */}
          <View style={styles.bulkRow}>
            <TouchableOpacity
              onPress={() => resolveAll('keep_server')}
              style={styles.bulkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.bulkBtnLabel}>Keep All Server</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => resolveAll('use_mine')}
              style={[styles.bulkBtn, styles.bulkBtnPrimary, { backgroundColor: primaryColor }]}
              activeOpacity={0.7}
            >
              <Text style={styles.bulkBtnPrimaryLabel}>Use All Mine</Text>
            </TouchableOpacity>
          </View>

          {/* Per-conflict rows */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {conflicts.map((conflict) => {
              const resolved = resolutions[conflict.studentId];
              return (
                <View key={conflict.studentId} style={styles.conflictRow}>
                  <Text style={styles.conflictName}>{conflict.studentName}</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      onPress={() => resolveOne(conflict.studentId, 'keep_server')}
                      style={[
                        styles.choiceBtn,
                        resolved === 'keep_server' && { borderColor: primaryColor, backgroundColor: `${primaryColor}18` },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.choiceLabel}>Server</Text>
                      <Text style={styles.choiceValue}>{conflict.serverValue}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => resolveOne(conflict.studentId, 'use_mine')}
                      style={[
                        styles.choiceBtn,
                        resolved === 'use_mine' && { borderColor: primaryColor, backgroundColor: `${primaryColor}18` },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.choiceLabel}>Mine</Text>
                      <Text style={styles.choiceValue}>{conflict.localValue}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleApply}
              disabled={!allResolved}
              style={[styles.applyBtn, { backgroundColor: allResolved ? primaryColor : VITANA_COLORS.border }]}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnLabel}>Apply Resolutions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
              <Text style={styles.dismissLabel}>Resolve later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    marginTop: 4,
  },
  bulkRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  bulkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  bulkBtnPrimary: {
    borderWidth: 0,
  },
  bulkBtnLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: VITANA_COLORS.text,
  },
  bulkBtnPrimaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    paddingHorizontal: 20,
  },
  conflictRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  conflictName: {
    fontSize: 14,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    backgroundColor: '#fff',
  },
  choiceLabel: {
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
  },
  choiceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  applyBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissLabel: {
    fontSize: 14,
    color: VITANA_COLORS.textSecondary,
  },
});

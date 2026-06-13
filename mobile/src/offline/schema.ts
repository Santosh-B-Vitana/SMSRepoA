import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const cachedStudentLists = sqliteTable('cached_student_lists', {
  classId: text('class_id').primaryKey(),
  students: text('students').notNull(),
  cachedAt: integer('cached_at').notNull(),
  academicYear: text('academic_year').notNull(),
  schoolId: text('school_id').notNull(),
});

export const attendanceDrafts = sqliteTable('attendance_drafts', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  date: text('date').notNull(),
  academicYear: text('academic_year').notNull(),
  records: text('records').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  isSubmitted: integer('is_submitted', { mode: 'boolean' }).default(false),
  lastModified: integer('last_modified').notNull(),
  markedBy: text('marked_by').notNull(),
  schoolId: text('school_id').notNull(),
});

export const offlineQueue = sqliteTable('offline_queue', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  method: text('method').notNull(),
  endpoint: text('endpoint').notNull(),
  body: text('body').notNull(),
  extraHeaders: text('extra_headers'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  status: text('status').default('pending'),
  errorMessage: text('error_message'),
  syncedAt: integer('synced_at'),
  operationType: text('operation_type').notNull(),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
});

export const cachedTimetable = sqliteTable('cached_timetable', {
  teacherId: text('teacher_id').primaryKey(),
  timetable: text('timetable').notNull(),
  cachedAt: integer('cached_at').notNull(),
  academicYear: text('academic_year').notNull(),
  schoolId: text('school_id').notNull(),
});

// ── Marks entry drafts ───────────────────────────────────────────────────────
export const marksDrafts = sqliteTable('marks_drafts', {
  id: text('id').primaryKey(), // composite: `${examId}-${classId}-${subjectId}`
  examId: text('exam_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  marks: text('marks').notNull(), // JSON: [{ studentId, theory, practical, isAbsent }]
  idempotencyKey: text('idempotency_key').notNull(),
  lastModified: integer('last_modified').notNull(),
  isSubmitted: integer('is_submitted', { mode: 'boolean' }).default(false),
  schoolId: text('school_id').notNull(),
  markedBy: text('marked_by').notNull(),
});

// ── Diary entry queue ────────────────────────────────────────────────────────
export const diaryEntryQueue = sqliteTable('diary_entry_queue', {
  id: text('id').primaryKey(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  classId: text('class_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
  status: text('status').default('pending'), // 'pending'|'synced'|'failed'
  errorMessage: text('error_message'),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
});

// ── Morning bundle cache ─────────────────────────────────────────────────────
export const offlineBundleCache = sqliteTable('offline_bundle_cache', {
  id: integer('id').primaryKey(), // always 1 — single row
  bundledAt: integer('bundled_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  timetableJson: text('timetable_json').notNull(),
  announcementsJson: text('announcements_json').notNull(),
  classesJson: text('classes_json').notNull(),
  pendingLeavesJson: text('pending_leaves_json').notNull(),
  schoolId: text('school_id').notNull(),
  academicYear: text('academic_year').notNull(),
});

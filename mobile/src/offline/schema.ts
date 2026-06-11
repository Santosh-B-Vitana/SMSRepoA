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

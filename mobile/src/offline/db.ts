import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

const sqliteDb = SQLite.openDatabaseSync('vitana_offline.db', {
  enableChangeListener: false,
});

export const db = drizzle(sqliteDb, { schema });

export async function clearDatabase(): Promise<void> {
  await sqliteDb.execAsync(`
    DELETE FROM diary_entry_queue;
    DELETE FROM marks_drafts;
    DELETE FROM attendance_drafts;
    DELETE FROM cached_student_lists;
    DELETE FROM cached_timetable;
    DELETE FROM offline_bundle_cache;
    DELETE FROM offline_queue;
  `);
}

export async function initDatabase(): Promise<void> {
  await sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_student_lists (
      class_id TEXT PRIMARY KEY,
      students TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance_drafts (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      records TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      is_submitted INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      marked_by TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      method TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      body TEXT NOT NULL,
      extra_headers TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      synced_at INTEGER,
      operation_type TEXT NOT NULL,
      school_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_timetable (
      teacher_id TEXT PRIMARY KEY,
      timetable TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS marks_drafts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      marks TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      last_modified INTEGER NOT NULL,
      is_submitted INTEGER DEFAULT 0,
      school_id TEXT NOT NULL,
      marked_by TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diary_entry_queue (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      school_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_bundle_cache (
      id INTEGER PRIMARY KEY,
      bundled_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      timetable_json TEXT NOT NULL,
      announcements_json TEXT NOT NULL,
      classes_json TEXT NOT NULL,
      pending_leaves_json TEXT NOT NULL,
      school_id TEXT NOT NULL,
      academic_year TEXT NOT NULL
    );
  `);
}

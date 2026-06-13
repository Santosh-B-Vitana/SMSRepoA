import NetInfo from '@react-native-community/netinfo';
import { db } from './db';
import { offlineBundleCache, cachedStudentLists } from './schema';
import { eq } from 'drizzle-orm';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';

const BUNDLE_CACHE_HOURS = 4;
const MORNING_START_HOUR = 5;
const MORNING_END_HOUR = 10;
const BUNDLE_CACHE_MS = BUNDLE_CACHE_HOURS * 60 * 60 * 1000;

interface BundleClass {
  classId: string;
  className: string;
  students: unknown[];
}

interface OfflineBundleResponse {
  bundledAt: string;
  expiresAt: string;
  myClasses: BundleClass[];
  todaysTimetable: unknown[];
  pendingLeaveRequests: unknown[];
  announcements: unknown[];
  recentDiaryEntries: unknown[];
}

export async function loadMorningBundle(): Promise<void> {
  const hour = new Date().getHours();
  if (hour < MORNING_START_HOUR || hour > MORNING_END_HOUR) return;

  const netState = await NetInfo.fetch();
  if (netState.type !== 'wifi' || !netState.isConnected) return;

  const existing = await db.select().from(offlineBundleCache).limit(1);
  const now = Date.now();
  if (existing[0] && now - existing[0].bundledAt < BUNDLE_CACHE_MS) return;

  const { user } = useAuthStore.getState();
  const { academicYear } = useSchoolStore.getState();
  if (!user) return;

  try {
    const bundle = (await apiClient.get('/mobile/offline-bundle')) as OfflineBundleResponse;

    await db
      .insert(offlineBundleCache)
      .values({
        id: 1,
        bundledAt: now,
        expiresAt: new Date(bundle.expiresAt).getTime(),
        timetableJson: JSON.stringify(bundle.todaysTimetable ?? []),
        announcementsJson: JSON.stringify(bundle.announcements ?? []),
        classesJson: JSON.stringify(bundle.myClasses ?? []),
        pendingLeavesJson: JSON.stringify(bundle.pendingLeaveRequests ?? []),
        schoolId: user.schoolId,
        academicYear: academicYear ?? '2025-2026',
      })
      .onConflictDoUpdate({
        target: offlineBundleCache.id,
        set: {
          bundledAt: now,
          expiresAt: new Date(bundle.expiresAt).getTime(),
          timetableJson: JSON.stringify(bundle.todaysTimetable ?? []),
          announcementsJson: JSON.stringify(bundle.announcements ?? []),
          classesJson: JSON.stringify(bundle.myClasses ?? []),
          pendingLeavesJson: JSON.stringify(bundle.pendingLeaveRequests ?? []),
        },
      });

    for (const cls of bundle.myClasses ?? []) {
      await db
        .insert(cachedStudentLists)
        .values({
          classId: cls.classId,
          students: JSON.stringify(cls.students),
          cachedAt: now,
          academicYear: academicYear ?? '2025-2026',
          schoolId: user.schoolId,
        })
        .onConflictDoUpdate({
          target: cachedStudentLists.classId,
          set: { students: JSON.stringify(cls.students), cachedAt: now },
        });
    }

    // Morning bundle loaded successfully
  } catch (err) {
    console.warn('[Bundle] Failed to load morning bundle:', err);
  }
}

export async function getBundledTimetable(): Promise<unknown[] | null> {
  const row = await db.select().from(offlineBundleCache).limit(1);
  if (!row[0] || Date.now() > row[0].expiresAt) return null;
  return JSON.parse(row[0].timetableJson) as unknown[];
}

export async function getBundledClasses(): Promise<BundleClass[] | null> {
  const row = await db.select().from(offlineBundleCache).limit(1);
  if (!row[0] || Date.now() > row[0].expiresAt) return null;
  return JSON.parse(row[0].classesJson) as BundleClass[];
}

export async function isBundleFresh(): Promise<boolean> {
  const row = await db.select().from(offlineBundleCache).where(eq(offlineBundleCache.id, 1)).limit(1);
  return !!row[0] && Date.now() < row[0].expiresAt;
}

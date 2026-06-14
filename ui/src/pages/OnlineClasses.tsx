import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { onlineClassesApi } from '@/services/api/onlineClassesApi';
import type { OnlineClassDto, OnlineClassAttendanceStatus } from '@/services/api/onlineClassesApi';

// ─── Badge ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot?: boolean }> = {
    Scheduled: { bg: 'bg-blue-50', text: 'text-blue-700' },
    Live: { bg: 'bg-green-50', text: 'text-green-700', dot: true },
    Ended: { bg: 'bg-gray-100', text: 'text-gray-500' },
    Cancelled: { bg: 'bg-red-50', text: 'text-red-600' },
  };
  const cfg = map[status] ?? map.Scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {status}
    </span>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  isTeacher,
  onJoin,
  onCancel,
  onEnd,
  onViewAttendance,
}: {
  cls: OnlineClassDto;
  isTeacher: boolean;
  onJoin: (id: string) => void;
  onCancel: (id: string) => void;
  onEnd: (id: string) => void;
  onViewAttendance: (id: string) => void;
}) {
  const start = new Date(cls.scheduledStart);
  const end = new Date(cls.scheduledEnd);
  const isLive = cls.status === 'Live';
  const isScheduled = cls.status === 'Scheduled';
  const minsUntil = differenceInMinutes(start, new Date());

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{cls.title}</h3>
          {cls.subjectName && (
            <p className="text-sm text-gray-500 mt-0.5">{cls.subjectName}</p>
          )}
          {cls.className && (
            <p className="text-sm text-gray-500">
              {cls.className}
              {cls.sectionName ? ` — ${cls.sectionName}` : ''}
            </p>
          )}
        </div>
        <StatusBadge status={cls.status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {format(start, 'dd MMM, EEE')}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {format(start, 'hh:mm a')} – {format(end, 'hh:mm a')}
        </span>
        {cls.attendeeCount > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
            {cls.attendeeCount} joined
          </span>
        )}
        {!isTeacher && isScheduled && minsUntil > 0 && minsUntil < 30 && (
          <span className="text-amber-600 font-medium">In {minsUntil}m</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(isLive || isScheduled) && (
          <button
            onClick={() => onJoin(cls.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {isLive ? 'Join Live' : isTeacher ? 'Start Class' : 'Join Class'}
          </button>
        )}

        {isTeacher && (
          <button
            onClick={() => onViewAttendance(cls.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Attendance
          </button>
        )}

        {isTeacher && isLive && (
          <button
            onClick={() => onEnd(cls.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            End Class
          </button>
        )}

        {isTeacher && isScheduled && (
          <button
            onClick={() => onCancel(cls.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      onlineClassesApi.schedule({
        title,
        description: description || undefined,
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd: new Date(end).toISOString(),
        isRecordingEnabled: recording,
      }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => setError('Could not schedule the class. Please try again.'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Schedule Online Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics — Chapter 5 Revision"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Topic coverage, prerequisites..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start *</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End *</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recording}
              onChange={(e) => setRecording(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Enable recording</span>
          </label>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title || !start || !end}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Scheduling...' : 'Schedule Class'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Panel ─────────────────────────────────────────────────────────

function AttendancePanel({ classId, onClose }: { classId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['web-online-class-attendance', classId],
    queryFn: () => onlineClassesApi.getAttendance(classId),
  });

  const statusColor: Record<OnlineClassAttendanceStatus, string> = {
    Present: 'text-green-600 bg-green-50',
    PartiallyPresent: 'text-amber-600 bg-amber-50',
    Absent: 'text-red-600 bg-red-50',
    JoinedAndLeftImmediately: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Attendance Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : (data ?? []).length === 0 ? (
            <div className="text-center text-gray-400 py-8">No attendance data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-semibold">Student</th>
                  <th className="pb-2 font-semibold">Duration</th>
                  <th className="pb-2 font-semibold">Joins</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.map((r) => (
                  <tr key={r.studentId}>
                    <td className="py-2.5 font-medium text-gray-900">
                      {r.studentName}
                      {r.rollNumber && <span className="text-gray-400 ml-1 text-xs">({r.rollNumber})</span>}
                    </td>
                    <td className="py-2.5 text-gray-600">{r.totalDurationMinutes}m</td>
                    <td className="py-2.5 text-gray-600">{r.joinCount}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[r.attendanceStatus]}`}>
                        {r.attendanceStatus.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {r.isManualOverride && (
                        <span className="ml-1 text-gray-400 text-xs">(manual)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnlineClasses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === 'staff' || user?.role === 'admin';

  const [showSchedule, setShowSchedule] = useState(false);
  const [attendanceClassId, setAttendanceClassId] = useState<string | null>(null);
  const [tab, setTab] = useState<'today' | 'upcoming'>('today');

  const todayQuery = useQuery({
    queryKey: ['web-online-classes-today'],
    queryFn: onlineClassesApi.getToday,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60_000,
  });

  const upcomingQuery = useQuery({
    queryKey: ['web-online-classes-upcoming'],
    queryFn: () => onlineClassesApi.getUpcoming(1, 20),
    staleTime: 5 * 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => onlineClassesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-online-classes'] });
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => onlineClassesApi.end(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['web-online-classes'] }),
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => onlineClassesApi.join(id),
    onSuccess: (data) => {
      // Open LiveKit meeting — for web, open a new window with the WS URL and token
      // In a real integration, embed the LiveKit React SDK in a dedicated route
      window.open(
        `${window.location.origin}/meeting?token=${encodeURIComponent(data.token)}&wsUrl=${encodeURIComponent(data.wsUrl)}&room=${encodeURIComponent(data.roomName)}`,
        '_blank',
        'width=1200,height=700,noopener'
      );
    },
  });

  const instantMutation = useMutation({
    mutationFn: () => onlineClassesApi.startInstant(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['web-online-classes'] }),
  });

  const classes = tab === 'today' ? (todayQuery.data ?? []) : (upcomingQuery.data?.items ?? []);
  const isLoading = tab === 'today' ? todayQuery.isLoading : upcomingQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Online Classes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher ? 'Manage your virtual classroom sessions' : 'View your upcoming online classes'}
          </p>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => instantMutation.mutate()}
              disabled={instantMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {instantMutation.isPending ? 'Starting...' : 'Start Instant'}
            </button>
            <button
              onClick={() => setShowSchedule(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule Class
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['today', 'upcoming'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Class list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-base font-medium text-gray-500">
            {tab === 'today' ? 'No classes scheduled for today.' : 'No upcoming classes.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowSchedule(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Schedule one now →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isTeacher={isTeacher}
              onJoin={(id) => joinMutation.mutate(id)}
              onCancel={(id) => {
                if (window.confirm('Cancel this class? Students will be notified.'))
                  cancelMutation.mutate(id);
              }}
              onEnd={(id) => {
                if (window.confirm('End this class?')) endMutation.mutate(id);
              }}
              onViewAttendance={(id) => setAttendanceClassId(id)}
            />
          ))}
        </div>
      )}

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['web-online-classes'] });
          }}
        />
      )}

      {attendanceClassId && (
        <AttendancePanel
          classId={attendanceClassId}
          onClose={() => setAttendanceClassId(null)}
        />
      )}
    </div>
  );
}

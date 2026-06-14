/**
 * Maps push notification types to Expo Router routes.
 * Kept in a separate module so it can be unit-tested without native module deps.
 *
 * Naming convention for role-scoped types:
 *   <type>          — shared or single-role type
 *   <type>_parent   — parent-specific variant (used when same logical event exists for multiple roles)
 *   <type>_teacher  — teacher-specific variant
 *
 * new_message_parent / new_message_teacher: routes fall back to the notifications
 * list until EP-15 (Communication & Messaging) ships the messages screens.
 */
export const DEEP_LINKS: Record<string, (data: Record<string, string>) => string> = {
  // ── Parent ────────────────────────────────────────────────────────────────
  fee_due: () => '/(parent)/fees',
  fee_overdue: () => '/(parent)/fees',
  fee_payment_confirmed: (d) => `/(parent)/fees/receipt/${d.paymentId}`,
  attendance_absent: (d) => `/(parent)/attendance/${d.studentId}`,
  attendance_shortage: (d) => `/(parent)/attendance/${d.studentId}`,
  result_published: (d) => `/(parent)/results/${d.studentId}`,
  report_card_ready: (d) => `/(parent)/results/${d.studentId}`,
  new_announcement: (d) => `/(parent)/announcements/${d.announcementId}`,
  new_diary_entry: (d) => `/(parent)/diary/${d.studentId}`,
  leave_approved: () => '/(parent)/leaves',
  leave_rejected: () => '/(parent)/leaves',
  new_message_parent: (d) =>
    d.conversationId
      ? `/(parent)/messages/${d.conversationId}`
      : '/(parent)/messages/index',

  // ── Student ───────────────────────────────────────────────────────────────
  assignment_graded: (d) => `/(student)/assignments/${d.assignmentId}`,
  assignment_created: (d) => `/(student)/assignments/${d.assignmentId}`,

  // ── Teacher ───────────────────────────────────────────────────────────────
  leave_request_received: () => '/(teacher)/leaves',
  timetable_change: () => '/(teacher)/timetable',
  submission_received: (d) => `/(teacher)/assignments/${d.assignmentId}`,
  new_message_teacher: (d) =>
    d.conversationId
      ? `/(teacher)/messages/${d.conversationId}`
      : '/(teacher)/messages/index',

  // ── Online Classes ────────────────────────────────────────────────────────
  // Teacher-scoped notifications
  class_starting_soon_teacher: (d) =>
    d.classId ? `/(teacher)/online-classes/${d.classId}` : '/(teacher)/online-classes/index',
  class_started_now_teacher: (d) =>
    d.classId ? `/(teacher)/online-classes/${d.classId}` : '/(teacher)/online-classes/index',
  recording_available_teacher: (d) =>
    d.classId ? `/(teacher)/online-classes/${d.classId}` : '/(teacher)/online-classes/index',
  class_cancelled_teacher: () => '/(teacher)/online-classes/index',

  // Student-scoped notifications
  class_starting_soon: (d) =>
    d.classId ? `/(student)/online-classes/${d.classId}` : '/(student)/online-classes/index',
  class_started_now: (d) =>
    d.classId ? `/(student)/online-classes/${d.classId}` : '/(student)/online-classes/index',
  recording_available: (d) =>
    d.classId ? `/(student)/online-classes/${d.classId}` : '/(student)/online-classes/index',
  class_cancelled: () => '/(student)/online-classes/index',

  // ── Admin ─────────────────────────────────────────────────────────────────
  billing_expiry_warning: () => '/(admin)/more',
  billing_expired: () => '/(admin)/more',

  // ── System ────────────────────────────────────────────────────────────────
  silent_sync: () => '',
};

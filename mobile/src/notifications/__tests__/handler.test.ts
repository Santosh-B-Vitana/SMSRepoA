import { DEEP_LINKS } from '../deepLinks';

describe('push notification deep links', () => {
  describe('parent deep links', () => {
    it('fee_due links to parent fees', () => {
      expect(DEEP_LINKS['fee_due']({})).toBe('/(parent)/fees');
    });

    it('fee_overdue links to parent fees', () => {
      expect(DEEP_LINKS['fee_overdue']({})).toBe('/(parent)/fees');
    });

    it('fee_payment_confirmed links to receipt with paymentId', () => {
      expect(DEEP_LINKS['fee_payment_confirmed']({ paymentId: 'pay-123' })).toBe(
        '/(parent)/fees/receipt/pay-123',
      );
    });

    it('attendance_absent includes studentId', () => {
      expect(DEEP_LINKS['attendance_absent']({ studentId: 'stu-abc' })).toBe(
        '/(parent)/attendance/stu-abc',
      );
    });

    it('attendance_shortage includes studentId', () => {
      expect(DEEP_LINKS['attendance_shortage']({ studentId: 'stu-xyz' })).toBe(
        '/(parent)/attendance/stu-xyz',
      );
    });

    it('result_published links to parent results with studentId', () => {
      expect(DEEP_LINKS['result_published']({ studentId: 'stu-001' })).toBe(
        '/(parent)/results/stu-001',
      );
    });

    it('report_card_ready links to parent results with studentId', () => {
      expect(DEEP_LINKS['report_card_ready']({ studentId: 'stu-001' })).toBe(
        '/(parent)/results/stu-001',
      );
    });

    it('new_announcement links to announcement with announcementId', () => {
      expect(DEEP_LINKS['new_announcement']({ announcementId: 'ann-99' })).toBe(
        '/(parent)/announcements/ann-99',
      );
    });

    it('new_diary_entry links to diary with studentId', () => {
      expect(DEEP_LINKS['new_diary_entry']({ studentId: 'stu-001' })).toBe(
        '/(parent)/diary/stu-001',
      );
    });

    it('leave_approved links to parent leaves', () => {
      expect(DEEP_LINKS['leave_approved']({})).toBe('/(parent)/leaves');
    });

    it('leave_rejected links to parent leaves', () => {
      expect(DEEP_LINKS['leave_rejected']({})).toBe('/(parent)/leaves');
    });

    it('new_message_parent falls back to parent notifications until EP-15 ships', () => {
      expect(DEEP_LINKS['new_message_parent']({})).toBe('/(parent)/notifications');
    });
  });

  describe('student deep links', () => {
    it('assignment_graded links to student assignment with id', () => {
      expect(DEEP_LINKS['assignment_graded']({ assignmentId: 'asgn-55' })).toBe(
        '/(student)/assignments/asgn-55',
      );
    });

    it('assignment_created links to student assignment with id', () => {
      expect(DEEP_LINKS['assignment_created']({ assignmentId: 'asgn-77' })).toBe(
        '/(student)/assignments/asgn-77',
      );
    });
  });

  describe('teacher deep links', () => {
    it('leave_request_received links to teacher leaves', () => {
      expect(DEEP_LINKS['leave_request_received']({})).toBe('/(teacher)/leaves');
    });

    it('new_message_teacher falls back to teacher notifications until EP-15 ships', () => {
      expect(DEEP_LINKS['new_message_teacher']({})).toBe('/(teacher)/notifications');
    });

    it('timetable_change links to teacher timetable', () => {
      expect(DEEP_LINKS['timetable_change']({})).toBe('/(teacher)/timetable');
    });

    it('submission_received links to teacher assignment', () => {
      expect(DEEP_LINKS['submission_received']({ assignmentId: 'asgn-10' })).toBe(
        '/(teacher)/assignments/asgn-10',
      );
    });
  });

  describe('admin deep links', () => {
    it('billing_expiry_warning links to admin more', () => {
      expect(DEEP_LINKS['billing_expiry_warning']({})).toBe('/(admin)/more');
    });

    it('billing_expired links to admin more', () => {
      expect(DEEP_LINKS['billing_expired']({})).toBe('/(admin)/more');
    });
  });

  describe('silent sync', () => {
    it('silent_sync returns empty string', () => {
      expect(DEEP_LINKS['silent_sync']({})).toBe('');
    });
  });

  describe('completeness', () => {
    // new_message was split into new_message_parent and new_message_teacher (EP-06 gap-3).
    // The backend sends the role-scoped key so each role lands on its own notifications list
    // until EP-15 ships the messages screens.
    const requiredTypes = [
      'fee_due',
      'fee_overdue',
      'fee_payment_confirmed',
      'attendance_absent',
      'attendance_shortage',
      'result_published',
      'report_card_ready',
      'new_announcement',
      'new_diary_entry',
      'leave_approved',
      'leave_rejected',
      'new_message_parent',
      'assignment_graded',
      'assignment_created',
      'leave_request_received',
      'new_message_teacher',
      'timetable_change',
      'submission_received',
      'billing_expiry_warning',
      'billing_expired',
      'silent_sync',
    ];

    it('all 21 notification type keys have deep link entries', () => {
      requiredTypes.forEach((type) => {
        expect(DEEP_LINKS[type]).toBeDefined();
        expect(typeof DEEP_LINKS[type]).toBe('function');
      });
    });
  });
});

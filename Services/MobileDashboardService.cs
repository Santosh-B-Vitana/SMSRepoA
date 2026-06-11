using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IMobileDashboardService
    {
        Task<ParentDashboardResponse> GetParentDashboardAsync(Guid schoolId, Guid userId, string parentEmail);
        Task<TeacherDashboardResponse> GetTeacherDashboardAsync(Guid schoolId, Guid userId, string staffEmail);
        Task<StudentDashboardResponse> GetStudentDashboardAsync(Guid schoolId, Guid userId, string studentEmail);
        Task<AdminDashboardResponse> GetAdminDashboardAsync(Guid schoolId, Guid userId);
    }

    public class MobileDashboardService : IMobileDashboardService
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notificationService;
        private readonly IStudentService _studentService;
        private readonly IAnnouncementService _announcementService;
        private readonly ILogger<MobileDashboardService> _logger;

        public MobileDashboardService(
            AppDbContext db,
            INotificationService notificationService,
            IStudentService studentService,
            IAnnouncementService announcementService,
            ILogger<MobileDashboardService> logger)
        {
            _db = db;
            _notificationService = notificationService;
            _studentService = studentService;
            _announcementService = announcementService;
            _logger = logger;
        }

        // ── Parent Dashboard ─────────────────────────────────────────────────

        public async Task<ParentDashboardResponse> GetParentDashboardAsync(
            Guid schoolId, Guid userId, string parentEmail)
        {
            var children = await _studentService.GetMyChildrenAsync(schoolId, parentEmail);

            if (children.Count == 0)
                return new ParentDashboardResponse
                {
                    Children = new List<ChildSummaryDto>(),
                    UnreadCount = await GetUnreadCountAsync(schoolId, userId)
                };

            var primaryChild = children.First();
            var primaryStudentId = primaryChild.Id;
            var today = DateTime.UtcNow.Date;
            var startOfMonth = new DateTime(today.Year, today.Month, 1);

            var todayAttendance = await GetStudentAttendanceSummaryAsync(schoolId, primaryStudentId, today, startOfMonth);
            var feeSummary      = await GetStudentFeeSummaryAsync(schoolId, primaryStudentId);
            var latestResult    = await GetLatestResultAsync(schoolId, primaryStudentId);
            var announcement    = await GetLatestParentAnnouncementAsync(parentEmail, schoolId);
            var unreadCount     = await GetUnreadCountAsync(schoolId, userId);

            var childSummaries = children.Select(c => new ChildSummaryDto
            {
                StudentId = c.Id,
                FullName = c.Name,
                RollNumber = c.RollNumber,
                ClassName = c.Class,
                Section = c.Section,
                ProfilePhotoUrl = c.PhotoUrl
            }).ToList();

            return new ParentDashboardResponse
            {
                Children = childSummaries,
                SelectedChild = childSummaries.FirstOrDefault(),
                TodayAttendance = todayAttendance,
                FeeSummary = feeSummary,
                LatestResult = latestResult,
                LatestAnnouncement = announcement,
                UnreadCount = unreadCount
            };
        }

        // ── Teacher Dashboard ────────────────────────────────────────────────

        public async Task<TeacherDashboardResponse> GetTeacherDashboardAsync(
            Guid schoolId, Guid userId, string staffEmail)
        {
            var today = DateTime.UtcNow;
            var dayName = today.DayOfWeek.ToString();

            var schedule            = await GetTeacherTodayScheduleAsync(schoolId, staffEmail, dayName);
            var pendingLeave        = await GetPendingLeaveCountAsync(schoolId);
            var classesStatus       = await GetClassAttendanceStatusAsync(schoolId, staffEmail, today.Date);
            var unreadCount         = await GetUnreadCountAsync(schoolId, userId);
            var pendingSubmissions  = await GetPendingAssignmentSubmissionsAsync(schoolId, staffEmail);

            return new TeacherDashboardResponse
            {
                TodaySchedule = schedule,
                PendingLeaveCount = pendingLeave,
                ClassesStatus = classesStatus,
                UnreadNotificationCount = unreadCount,
                PendingAssignmentSubmissions = pendingSubmissions
            };
        }

        // ── Student Dashboard ────────────────────────────────────────────────

        public async Task<StudentDashboardResponse> GetStudentDashboardAsync(
            Guid schoolId, Guid userId, string studentEmail)
        {
            var student = await _db.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == studentEmail);

            if (student == null)
                return new StudentDashboardResponse { UnreadCount = await GetUnreadCountAsync(schoolId, userId) };

            var today = DateTime.UtcNow;
            var todayDate = today.Date;
            var startOfMonth = new DateTime(todayDate.Year, todayDate.Month, 1);
            var dayName = today.DayOfWeek.ToString();

            var schedule     = await GetStudentTodayScheduleAsync(schoolId, student.Id, dayName);
            var attendance   = await GetStudentAttendanceSummaryAsync(schoolId, student.Id, todayDate, startOfMonth);
            var latestResult = await GetLatestResultAsync(schoolId, student.Id);
            var assignments  = await GetDueSoonAssignmentsAsync(schoolId, student.Id);
            var announcement = await GetLatestStudentAnnouncementAsync(schoolId);
            var unreadCount  = await GetUnreadCountAsync(schoolId, userId);

            return new StudentDashboardResponse
            {
                TodaySchedule = schedule,
                AttendanceThisMonth = attendance,
                LatestResult = latestResult,
                DueSoonAssignments = assignments,
                LatestAnnouncement = announcement,
                UnreadCount = unreadCount
            };
        }

        // ── Admin Dashboard ──────────────────────────────────────────────────

        public async Task<AdminDashboardResponse> GetAdminDashboardAsync(Guid schoolId, Guid userId)
        {
            var todayDate = DateTime.UtcNow.Date;
            var tomorrowDate = todayDate.AddDays(1);

            var attendanceRate   = await GetTodayAttendanceRateAsync(schoolId, todayDate);
            var feeCollection    = await GetTodayFeeCollectionAsync(schoolId, todayDate, tomorrowDate);
            var pendingApprovals = await GetPendingApprovalsAsync(schoolId);
            var billingAlert     = await GetBillingAlertAsync(schoolId);
            var announcements    = await GetRecentAnnouncementsAsync(schoolId);
            var unreadCount      = await GetUnreadCountAsync(schoolId, userId);

            return new AdminDashboardResponse
            {
                TodayAttendanceRate = attendanceRate,
                TodayFeeCollection = feeCollection,
                PendingApprovals = pendingApprovals,
                BillingAlert = billingAlert,
                RecentAnnouncements = announcements,
                UnreadCount = unreadCount
            };
        }

        // ── Private helpers ──────────────────────────────────────────────────

        private async Task<int> GetUnreadCountAsync(Guid schoolId, Guid userId)
        {
            try
            {
                var result = await _notificationService.GetUnreadCountAsync(schoolId, userId);
                return result.UnreadCount;
            }
            catch { return 0; }
        }

        private async Task<MobileAttendanceSummaryDto?> GetStudentAttendanceSummaryAsync(
            Guid schoolId, Guid studentId, DateTime todayDate, DateTime startOfMonth)
        {
            // AttendanceRecord.Date is the attendance date field
            var todayRecord = await _db.AttendanceRecords
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.StudentId == studentId
                         && a.EntityType == "Student" && a.Date == todayDate)
                .FirstOrDefaultAsync();

            var monthCounts = await _db.AttendanceRecords
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.StudentId == studentId
                         && a.EntityType == "Student"
                         && a.Date >= startOfMonth && a.Date <= todayDate)
                .GroupBy(a => a.Status)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync();

            var presentDays = monthCounts
                .FirstOrDefault(x => x.Key.Equals("present", StringComparison.OrdinalIgnoreCase))?.Count ?? 0;
            var totalDays = monthCounts.Sum(x => x.Count);

            return new MobileAttendanceSummaryDto
            {
                Status = todayRecord?.Status ?? "Unknown",
                MarkedAt = todayRecord?.CreatedAt,
                PresentDaysThisMonth = presentDays,
                TotalWorkingDaysThisMonth = totalDays
            };
        }

        private async Task<FeesSummaryDto?> GetStudentFeeSummaryAsync(Guid schoolId, Guid studentId)
        {
            // Use FeeRecord (the actual fee balance record), not StudentFeeItem (which is concessions)
            var feeRecords = await _db.FeeRecords
                .AsNoTracking()
                .Where(f => f.SchoolId == schoolId && f.StudentId == studentId)
                .ToListAsync();

            if (feeRecords.Count == 0) return null;

            var totalDue = feeRecords.Sum(f => f.TotalAmount);
            var totalPaid = feeRecords.Sum(f => f.PaidAmount);
            var outstanding = feeRecords.Sum(f => f.PendingAmount);
            var nextDue = feeRecords
                .Where(f => f.PendingAmount > 0)
                .OrderBy(f => f.DueDate)
                .FirstOrDefault()?.DueDate;
            var hasOverdue = feeRecords.Any(f =>
                f.PendingAmount > 0 && f.DueDate.Date < DateTime.UtcNow.Date);

            return new FeesSummaryDto
            {
                TotalDue = totalDue,
                TotalPaid = totalPaid,
                Outstanding = outstanding,
                NextDueDate = nextDue,
                HasOverdue = hasOverdue
            };
        }

        private async Task<LatestResultDto?> GetLatestResultAsync(Guid schoolId, Guid studentId)
        {
            var result = await _db.ExamResults
                .AsNoTracking()
                .Include(r => r.Exam)
                .Where(r => r.SchoolId == schoolId && r.StudentId == studentId)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (result == null) return null;

            return new LatestResultDto
            {
                ExamName = result.Exam?.Name,
                Percentage = result.Percentage,
                Grade = result.Grade,
                Remarks = result.Remarks,
                PublishedAt = result.CreatedAt
            };
        }

        private async Task<AnnouncementSummaryDto?> GetLatestParentAnnouncementAsync(
            string parentEmail, Guid schoolId)
        {
            try
            {
                var announcements = await _announcementService.GetParentAnnouncementsAsync(parentEmail, schoolId);
                var latest = announcements.OrderByDescending(a => a.CreatedAt).FirstOrDefault();
                return latest == null ? null : new AnnouncementSummaryDto
                {
                    Id = latest.Id,
                    Title = latest.Title,
                    Summary = latest.Content.Length > 150 ? latest.Content[..150] + "…" : latest.Content,
                    CreatedAt = latest.CreatedAt,
                    Category = latest.TargetAudience
                };
            }
            catch { return null; }
        }

        private async Task<AnnouncementSummaryDto?> GetLatestStudentAnnouncementAsync(Guid schoolId)
        {
            var latest = await _db.Announcements
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            return latest == null ? null : new AnnouncementSummaryDto
            {
                Id = latest.Id,
                Title = latest.Title,
                Summary = latest.Content.Length > 150 ? latest.Content[..150] + "…" : latest.Content,
                CreatedAt = latest.CreatedAt
            };
        }

        private async Task<List<TimetableSlotDto>> GetTeacherTodayScheduleAsync(
            Guid schoolId, string staffEmail, string dayName)
        {
            var staff = await _db.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == staffEmail);

            if (staff == null) return new List<TimetableSlotDto>();

            var periods = await _db.TimetablePeriods
                .AsNoTracking()
                .Include(p => p.Timetable).ThenInclude(t => t!.Class)
                .Include(p => p.Timetable).ThenInclude(t => t!.Section)
                .Include(p => p.Subject)
                .Where(p => p.Timetable!.SchoolId == schoolId
                         && p.Timetable.Status == "active"
                         && p.DayOfWeek == dayName
                         && p.TeacherId == staff.Id)
                .OrderBy(p => p.StartTime)
                .ToListAsync();

            return periods.Select(p => new TimetableSlotDto
            {
                SubjectName = p.Subject?.Name ?? string.Empty,
                ClassName = p.Timetable?.Class?.Name,
                Section = p.Timetable?.Section?.Name,
                Room = p.Room,
                StartTime = p.StartTime.ToString(@"hh\:mm"),
                EndTime = p.EndTime.ToString(@"hh\:mm"),
                PeriodNumber = p.PeriodNumber
            }).ToList();
        }

        private async Task<List<TimetableSlotDto>> GetStudentTodayScheduleAsync(
            Guid schoolId, Guid studentId, string dayName)
        {
            var enrollment = await _db.StudentEnrollments
                .AsNoTracking()
                .Where(e => e.StudentId == studentId && e.SchoolId == schoolId
                         && e.Status == "active")
                .OrderByDescending(e => e.EnrollmentDate)
                .FirstOrDefaultAsync();

            if (enrollment == null) return new List<TimetableSlotDto>();

            var timetable = await _db.Timetables
                .AsNoTracking()
                .Where(t => t.SchoolId == schoolId
                         && t.ClassId == enrollment.ClassId
                         && t.SectionId == enrollment.SectionId
                         && t.Status == "active")
                .FirstOrDefaultAsync();

            if (timetable == null) return new List<TimetableSlotDto>();

            var periods = await _db.TimetablePeriods
                .AsNoTracking()
                .Include(p => p.Subject)
                .Where(p => p.TimetableId == timetable.Id && p.DayOfWeek == dayName)
                .OrderBy(p => p.StartTime)
                .ToListAsync();

            return periods.Select(p => new TimetableSlotDto
            {
                SubjectName = p.Subject?.Name ?? string.Empty,
                Room = p.Room,
                StartTime = p.StartTime.ToString(@"hh\:mm"),
                EndTime = p.EndTime.ToString(@"hh\:mm"),
                PeriodNumber = p.PeriodNumber
            }).ToList();
        }

        private async Task<int> GetPendingLeaveCountAsync(Guid schoolId)
        {
            return await _db.LeaveRequests
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.Status == "Pending")
                .CountAsync();
        }

        private async Task<List<ClassAttendanceStatusDto>> GetClassAttendanceStatusAsync(
            Guid schoolId, string staffEmail, DateTime todayDate)
        {
            var staff = await _db.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == staffEmail);

            if (staff == null) return new List<ClassAttendanceStatusDto>();

            var assignments = await _db.TeacherAssignments
                .AsNoTracking()
                .Include(ta => ta.Class)
                .Include(ta => ta.Section)
                .Where(ta => ta.SchoolId == schoolId
                          && ta.StaffId == staff.Id
                          && ta.Status == "active")
                .ToListAsync();

            var result = new List<ClassAttendanceStatusDto>();

            foreach (var assignment in assignments)
            {
                var totalStudents = await _db.StudentEnrollments
                    .AsNoTracking()
                    .Where(e => e.SchoolId == schoolId
                             && e.ClassId == assignment.ClassId
                             && e.SectionId == assignment.SectionId
                             && e.Status == "active")
                    .CountAsync();

                // Count attendance records for today in this class/section
                var markedStudentIds = await _db.StudentEnrollments
                    .AsNoTracking()
                    .Where(e => e.SchoolId == schoolId
                             && e.ClassId == assignment.ClassId
                             && e.SectionId == assignment.SectionId
                             && e.Status == "active")
                    .Select(e => e.StudentId)
                    .ToListAsync();

                var todayAttendanceCount = await _db.AttendanceRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId
                             && a.EntityType == "Student"
                             && a.Date == todayDate
                             && markedStudentIds.Contains(a.StudentId!.Value))
                    .CountAsync();

                var presentCount = await _db.AttendanceRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId
                             && a.EntityType == "Student"
                             && a.Date == todayDate
                             && a.Status.ToLower() == "present"
                             && markedStudentIds.Contains(a.StudentId!.Value))
                    .CountAsync();

                result.Add(new ClassAttendanceStatusDto
                {
                    ClassName = assignment.Class?.Name ?? string.Empty,
                    Section = assignment.Section?.Name,
                    IsMarked = todayAttendanceCount > 0,
                    TotalStudents = totalStudents,
                    PresentCount = presentCount
                });
            }

            return result;
        }

        private async Task<int> GetPendingAssignmentSubmissionsAsync(Guid schoolId, string staffEmail)
        {
            var staff = await _db.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == staffEmail);

            if (staff == null) return 0;

            return await _db.AssignmentSubmissions
                .AsNoTracking()
                .Include(s => s.Assignment)
                .Where(s => s.Assignment!.SchoolId == schoolId
                         && s.Assignment.AssignedById == staff.Id
                         && s.Status == "Submitted")
                .CountAsync();
        }

        private async Task<List<AssignmentSummaryDto>> GetDueSoonAssignmentsAsync(
            Guid schoolId, Guid studentId)
        {
            var enrollment = await _db.StudentEnrollments
                .AsNoTracking()
                .Where(e => e.StudentId == studentId && e.SchoolId == schoolId
                         && e.Status == "active")
                .FirstOrDefaultAsync();

            if (enrollment == null) return new List<AssignmentSummaryDto>();

            var dueSoonDate = DateTime.UtcNow.AddDays(7);
            var nowDate = DateTime.UtcNow.Date;

            var assignments = await _db.Assignments
                .AsNoTracking()
                .Include(a => a.Subject)
                .Where(a => a.SchoolId == schoolId
                         && a.ClassId == enrollment.ClassId
                         && a.DueDate >= nowDate
                         && a.DueDate <= dueSoonDate)
                .OrderBy(a => a.DueDate)
                .Take(5)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToList();
            var submittedIds = await _db.AssignmentSubmissions
                .AsNoTracking()
                .Where(s => s.StudentId == studentId && assignmentIds.Contains(s.AssignmentId))
                .Select(s => s.AssignmentId)
                .ToListAsync();

            return assignments.Select(a => new AssignmentSummaryDto
            {
                Id = a.Id,
                Title = a.Title,
                SubjectName = a.Subject?.Name,
                DueDate = a.DueDate,
                IsSubmitted = submittedIds.Contains(a.Id)
            }).ToList();
        }

        private async Task<decimal> GetTodayAttendanceRateAsync(Guid schoolId, DateTime todayDate)
        {
            var totalActiveStudents = await _db.Students
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Status == "active")
                .CountAsync();

            if (totalActiveStudents == 0) return 0;

            var presentToday = await _db.AttendanceRecords
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId
                         && a.EntityType == "Student"
                         && a.Date == todayDate
                         && a.Status.ToLower() == "present")
                .CountAsync();

            return Math.Round((decimal)presentToday / totalActiveStudents * 100, 1);
        }

        private async Task<decimal> GetTodayFeeCollectionAsync(
            Guid schoolId, DateTime todayDate, DateTime tomorrowDate)
        {
            return await _db.GatewayPaymentTransactions
                .AsNoTracking()
                .Where(t => t.SchoolId == schoolId
                         && t.Status == "Success"
                         && t.CreatedAt >= todayDate && t.CreatedAt < tomorrowDate)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
        }

        private async Task<PendingApprovalsDto> GetPendingApprovalsAsync(Guid schoolId)
        {
            var leaveCount = await _db.LeaveRequests
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.Status == "Pending")
                .CountAsync();

            var admissionsCount = await _db.Admissions
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.Status == "Pending")
                .CountAsync();

            var docsCount = await _db.StudentDocuments
                .AsNoTracking()
                .Where(d => d.SchoolId == schoolId && d.VerificationStatus == "Pending")
                .CountAsync();

            return new PendingApprovalsDto
            {
                LeaveRequests = leaveCount,
                AdmissionApplications = admissionsCount,
                DocumentVerifications = docsCount
            };
        }

        private async Task<BillingAlertDto?> GetBillingAlertAsync(Guid schoolId)
        {
            var today = DateTime.UtcNow.Date;

            var overdueRecords = await _db.FeeRecords
                .AsNoTracking()
                .Where(f => f.SchoolId == schoolId
                         && f.DueDate.Date < today
                         && f.PendingAmount > 0)
                .ToListAsync();

            if (overdueRecords.Count == 0) return null;

            return new BillingAlertDto
            {
                OverdueCount = overdueRecords.Count,
                OverdueAmount = overdueRecords.Sum(f => f.PendingAmount),
                AlertMessage = $"{overdueRecords.Count} fee record(s) are overdue"
            };
        }

        private async Task<List<AnnouncementSummaryDto>> GetRecentAnnouncementsAsync(Guid schoolId)
        {
            var announcements = await _db.Announcements
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .ToListAsync();

            return announcements.Select(a => new AnnouncementSummaryDto
            {
                Id = a.Id,
                Title = a.Title,
                Summary = a.Content.Length > 150 ? a.Content[..150] + "…" : a.Content,
                CreatedAt = a.CreatedAt
            }).ToList();
        }
    }
}

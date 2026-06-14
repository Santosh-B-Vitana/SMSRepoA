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
        Task<OfflineBundleResponse> GetOfflineBundleAsync(Guid schoolId, string staffEmail);
        Task<LibrarianDashboardResponse> GetLibrarianDashboardAsync(Guid schoolId, Guid userId);
        Task<TransportDashboardResponse> GetTransportDashboardAsync(Guid schoolId, Guid userId);
        Task<HostelDashboardResponse> GetHostelDashboardAsync(Guid schoolId, Guid userId);
        Task<ReceptionistDashboardResponse> GetReceptionistDashboardAsync(Guid schoolId, Guid userId);
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
            var feeCollection    = await GetFeeCollectionAsync(schoolId, todayDate, tomorrowDate);
            var pendingApprovals = await GetPendingApprovalsAsync(schoolId);
            var billingAlert     = await GetBillingAlertAsync(schoolId);
            var announcements    = await GetRecentAnnouncementsAsync(schoolId);
            var unreadCount      = await GetUnreadCountAsync(schoolId, userId);
            var schoolCounts     = await GetSchoolCountsAsync(schoolId);

            return new AdminDashboardResponse
            {
                AttendanceRate = attendanceRate,
                FeeCollection = feeCollection,
                PendingApprovals = pendingApprovals,
                BillingAlert = billingAlert,
                RecentAnnouncements = announcements,
                UnreadCount = unreadCount,
                TotalStudents = schoolCounts.TotalStudents,
                ActiveStudents = schoolCounts.ActiveStudents,
                TotalStaff = schoolCounts.TotalStaff,
                ActiveStaff = schoolCounts.ActiveStaff,
                TotalClasses = schoolCounts.TotalClasses,
            };
        }

        private async Task<(int TotalStudents, int ActiveStudents, int TotalStaff, int ActiveStaff, int TotalClasses)>
            GetSchoolCountsAsync(Guid schoolId)
        {
            var totalStudents  = await _db.Students.AsNoTracking().CountAsync(s => s.SchoolId == schoolId);
            var activeStudents = await _db.Students.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalStaff     = await _db.StaffMembers.AsNoTracking().CountAsync(s => s.SchoolId == schoolId);
            var activeStaff    = await _db.StaffMembers.AsNoTracking().CountAsync(s => s.SchoolId == schoolId && s.Status == "active");
            var totalClasses   = await _db.Classes.AsNoTracking().CountAsync(c => c.SchoolId == schoolId && c.Status == "active");
            return (totalStudents, activeStudents, totalStaff, activeStaff, totalClasses);
        }

        // ── Offline Bundle ───────────────────────────────────────────────────

        public async Task<OfflineBundleResponse> GetOfflineBundleAsync(Guid schoolId, string staffEmail)
        {
            var today = DateTime.UtcNow;
            var dayName = today.DayOfWeek.ToString();

            var staff = await _db.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Email == staffEmail);

            var myClasses = new List<OfflineBundleClassDto>();

            if (staff != null)
            {
                var assignments = await _db.TeacherAssignments
                    .AsNoTracking()
                    .Include(ta => ta.Class)
                    .Include(ta => ta.Section)
                    .Where(ta => ta.SchoolId == schoolId && ta.StaffId == staff.Id && ta.Status == "active")
                    .ToListAsync();

                foreach (var assignment in assignments)
                {
                    var studentEnrollments = await _db.StudentEnrollments
                        .AsNoTracking()
                        .Include(e => e.Student)
                        .Where(e => e.SchoolId == schoolId
                                 && e.ClassId == assignment.ClassId
                                 && e.SectionId == assignment.SectionId
                                 && e.Status == "active")
                        .ToListAsync();

                    var students = studentEnrollments
                        .Where(e => e.Student != null)
                        .Select(e => new OfflineBundleStudentDto(
                            e.Student!.Id,
                            !string.IsNullOrWhiteSpace(e.Student.Name) ? e.Student.Name
                                : !string.IsNullOrWhiteSpace($"{e.Student.FirstName} {e.Student.LastName}".Trim())
                                    ? $"{e.Student.FirstName} {e.Student.LastName}".Trim()
                                    : e.Student.Email,
                            e.Student.RollNumber,
                            e.Student.PhotoUrl
                        ))
                        .ToList();

                    var classKey = $"{assignment.ClassId}-{assignment.SectionId}";
                    if (!myClasses.Any(c => c.ClassId == classKey))
                    {
                        myClasses.Add(new OfflineBundleClassDto(
                            classKey,
                            assignment.Class?.Name ?? string.Empty,
                            assignment.Section?.Name,
                            students
                        ));
                    }
                }
            }

            var timetable = staff != null
                ? await GetTeacherTodayScheduleAsync(schoolId, staffEmail, dayName)
                : new List<TimetableSlotDto>();

            var pendingLeaveCount = await GetPendingLeaveCountAsync(schoolId);
            var announcements = await GetRecentAnnouncementsAsync(schoolId);

            var bundledAt = DateTime.UtcNow;
            var expiresAt = bundledAt.AddHours(8);

            return new OfflineBundleResponse(
                bundledAt,
                expiresAt,
                myClasses,
                timetable,
                pendingLeaveCount,
                announcements
            );
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
                ClassId = p.Timetable?.Class?.Id,
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
                .Where(p => p.TimetableId == timetable.Id
                         && p.DayOfWeek == dayName
                         && p.PeriodType != "break"
                         && p.PeriodType != "lunch")
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

            var dayName = todayDate.DayOfWeek.ToString();

            // Use today's timetable periods — one entry per class (deduplicated)
            var todayPeriods = await _db.TimetablePeriods
                .AsNoTracking()
                .Include(p => p.Timetable).ThenInclude(t => t!.Class)
                .Include(p => p.Timetable).ThenInclude(t => t!.Section)
                .Where(p => p.Timetable!.SchoolId == schoolId
                         && p.Timetable.Status == "active"
                         && !p.IsDeleted
                         && p.DayOfWeek == dayName
                         && p.TeacherId == staff.Id
                         && p.PeriodType == "lecture")
                .ToListAsync();

            // One entry per class (a teacher may have multiple subjects in same class today)
            var classGroups = todayPeriods
                .Where(p => p.Timetable?.Class != null)
                .GroupBy(p => p.Timetable!.ClassId)
                .ToList();

            var result = new List<ClassAttendanceStatusDto>();

            foreach (var group in classGroups)
            {
                var firstPeriod = group.First();
                var classEntity  = firstPeriod.Timetable!.Class!;
                var sectionEntity = firstPeriod.Timetable!.Section;
                var classId = classEntity.Id;

                var enrolledStudentIds = await _db.StudentEnrollments
                    .AsNoTracking()
                    .Where(e => e.SchoolId == schoolId
                             && e.ClassId == classId
                             && e.Status == "active")
                    .Select(e => e.StudentId)
                    .ToListAsync();

                var totalStudents = enrolledStudentIds.Count;

                var todayAttendanceCount = await _db.AttendanceRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId
                             && a.EntityType == "Student"
                             && a.Date == todayDate
                             && enrolledStudentIds.Contains(a.StudentId!.Value))
                    .CountAsync();

                var presentCount = await _db.AttendanceRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId
                             && a.EntityType == "Student"
                             && a.Date == todayDate
                             && a.Status.ToLower() == "present"
                             && enrolledStudentIds.Contains(a.StudentId!.Value))
                    .CountAsync();

                result.Add(new ClassAttendanceStatusDto
                {
                    ClassId = classId,
                    ClassName = classEntity.Name,
                    Section = sectionEntity?.Name,
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

        private async Task<FeeCollectionDto> GetFeeCollectionAsync(
            Guid schoolId, DateTime todayDate, DateTime tomorrowDate)
        {
            var startOfMonth = new DateTime(todayDate.Year, todayDate.Month, 1);

            // Include all payment modes (cash, cheque, online, DD, etc.) from PaymentTransactions.
            // GatewayPaymentTransactions only captures online gateway payments and would miss counter collections.
            var collectedToday = await _db.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.SchoolId == schoolId
                         && t.Status == "success"
                         && t.Date >= todayDate && t.Date < tomorrowDate)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            var collectedThisMonth = await _db.PaymentTransactions
                .AsNoTracking()
                .Where(t => t.SchoolId == schoolId
                         && t.Status == "success"
                         && t.Date >= startOfMonth && t.Date < tomorrowDate)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            return new FeeCollectionDto
            {
                CollectedToday = collectedToday,
                CollectedThisMonth = collectedThisMonth
            };
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

        // ── Librarian Dashboard ───────────────────────────────────────────────

        public async Task<LibrarianDashboardResponse> GetLibrarianDashboardAsync(Guid schoolId, Guid userId)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var issuedToday = await _db.BookIssues
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.IssueDate >= today && b.IssueDate < tomorrow && !b.IsDeleted)
                .CountAsync();

            var returnsToday = await _db.BookIssues
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.ReturnDate >= today && b.ReturnDate < tomorrow && !b.IsDeleted)
                .CountAsync();

            var overdue = await _db.BookIssues
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.ReturnDate == null && b.DueDate < today && !b.IsDeleted)
                .CountAsync();

            var reservations = await _db.BookReservations
                .AsNoTracking()
                .Where(r => r.SchoolId == schoolId && r.Status == "pending" && !r.IsDeleted)
                .CountAsync();

            var totalBooks = await _db.Books
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && !b.IsDeleted)
                .SumAsync(b => (int?)b.TotalCopies) ?? 0;

            var issued = await _db.BookIssues
                .AsNoTracking()
                .Where(b => b.SchoolId == schoolId && b.ReturnDate == null && !b.IsDeleted)
                .CountAsync();

            var topOverdue = await _db.BookIssues
                .AsNoTracking()
                .Include(b => b.Book)
                .Include(b => b.Student)
                .Where(b => b.SchoolId == schoolId && b.ReturnDate == null && b.DueDate < today && !b.IsDeleted)
                .OrderBy(b => b.DueDate)
                .Take(5)
                .Select(b => new OverdueBookSummaryDto
                {
                    BookTitle = b.Book != null ? b.Book.Title : "Unknown",
                    StudentName = b.Student != null ? $"{b.Student.FirstName} {b.Student.LastName}" : "Unknown",
                    DaysOverdue = (int)(today - b.DueDate).TotalDays,
                    FineAmount = b.Fine > 0 ? b.Fine : (decimal)((today - b.DueDate).TotalDays * 1.0)
                })
                .ToListAsync();

            return new LibrarianDashboardResponse
            {
                BooksIssuedToday = issuedToday,
                TotalOverdue = overdue,
                ReturnsToday = returnsToday,
                PendingReservations = reservations,
                TotalBooks = totalBooks,
                AvailableBooks = Math.Max(0, totalBooks - issued),
                TopOverdueBooks = topOverdue,
                UnreadCount = await GetUnreadCountAsync(schoolId, userId)
            };
        }

        // ── Transport Dashboard ───────────────────────────────────────────────

        public async Task<TransportDashboardResponse> GetTransportDashboardAsync(Guid schoolId, Guid userId)
        {
            var routes = await _db.TransportRoutes
                .AsNoTracking()
                .Where(r => r.SchoolId == schoolId && !r.IsDeleted)
                .Select(r => new RouteSummaryDto
                {
                    RouteNumber = r.RouteNumber,
                    RouteName = r.RouteName,
                    StudentsAssigned = r.StudentsAssigned,
                    Capacity = r.Capacity,
                    IsActive = r.Status == "active"
                })
                .ToListAsync();

            var totalVehicles = await _db.Vehicles
                .AsNoTracking()
                .Where(v => v.SchoolId == schoolId && !v.IsDeleted)
                .CountAsync();

            return new TransportDashboardResponse
            {
                TotalRoutes = routes.Count,
                ActiveRoutes = routes.Count(r => r.IsActive),
                TotalVehicles = totalVehicles,
                StudentsAssigned = routes.Sum(r => r.StudentsAssigned),
                MaintenanceDue = 0,
                RoutesSummary = routes.Take(5).ToList(),
                UnreadCount = await GetUnreadCountAsync(schoolId, userId)
            };
        }

        // ── Hostel Dashboard ──────────────────────────────────────────────────

        public async Task<HostelDashboardResponse> GetHostelDashboardAsync(Guid schoolId, Guid userId)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var rooms = await _db.HostelRooms
                .AsNoTracking()
                .Where(r => r.SchoolId == schoolId && !r.IsDeleted)
                .Select(r => new { r.Capacity, Occupied = r.Occupied })
                .ToListAsync();

            var checkedIn = await _db.HostelStudents
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.Status == "active" && !a.IsDeleted)
                .CountAsync();

            var visitorsInside = await _db.HostelVisitorLogs
                .AsNoTracking()
                .Where(v => v.SchoolId == schoolId && v.CheckOutTime == null && !v.IsDeleted)
                .CountAsync();

            var pendingLeaves = await _db.HostelLeaves
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.Status == "pending" && !l.IsDeleted)
                .CountAsync();

            var leavesToday = await _db.HostelLeaves
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.UpdatedAt >= today && l.UpdatedAt < tomorrow && l.Status == "approved" && !l.IsDeleted)
                .CountAsync();

            return new HostelDashboardResponse
            {
                TotalRooms = rooms.Count,
                OccupiedBeds = rooms.Sum(r => r.Occupied),
                TotalCapacity = rooms.Sum(r => r.Capacity),
                StudentsCheckedIn = checkedIn,
                VisitorsInside = visitorsInside,
                PendingHostelLeaves = pendingLeaves,
                HostelLeavesToday = leavesToday,
                UnreadCount = await GetUnreadCountAsync(schoolId, userId)
            };
        }

        // ── Receptionist Dashboard ────────────────────────────────────────────

        public async Task<ReceptionistDashboardResponse> GetReceptionistDashboardAsync(Guid schoolId, Guid userId)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var todayVisitors = await _db.VisitorLogs
                .AsNoTracking()
                .Where(v => v.SchoolId == schoolId && v.CheckInTime >= today && v.CheckInTime < tomorrow && !v.IsDeleted)
                .ToListAsync();

            var inside = todayVisitors.Count(v => v.CheckOutTime == null);
            var checkedOut = todayVisitors.Where(v => v.CheckOutTime != null).ToList();
            var avgDuration = checkedOut.Count > 0
                ? checkedOut.Average(v => (v.CheckOutTime!.Value - v.CheckInTime).TotalMinutes)
                : 0;

            var pending = await _db.VisitorPreRegistrations
                .AsNoTracking()
                .Where(p => p.SchoolId == schoolId && p.Status == "pending" && !p.IsDeleted)
                .CountAsync();

            return new ReceptionistDashboardResponse
            {
                VisitorsCurrentlyInside = inside,
                TotalCheckInsToday = todayVisitors.Count,
                TotalCheckOutsToday = checkedOut.Count,
                PendingPreRegistrations = pending,
                AverageDurationMinutes = Math.Round(avgDuration, 1),
                UnreadCount = await GetUnreadCountAsync(schoolId, userId)
            };
        }
    }
}

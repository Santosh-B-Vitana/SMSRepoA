using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmsApi.Models.Entities;
using SmsApi.Services;

#pragma warning disable CS0618 // 'StudentAttendance' is obsolete
namespace SmsApi.Data
{
    public class AppDbContext : DbContext
    {
        // Multi-tenancy: set by DI constructor, null when using design-time/migrations constructor.
        private readonly Guid? _currentSchoolId;
        private readonly bool _isSuperAdmin;

        /// <summary>
        /// Design-time / migrations constructor — no tenant filtering.
        /// </summary>
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        /// <summary>
        /// Runtime DI constructor — applies tenant scope.
        /// BUG FIX: SuperAdmin bypasses filter; unauthenticated blocks all rows.
        /// </summary>
        public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
            : base(options)
        {
            if (tenantContext.IsAuthenticated)
            {
                if (tenantContext.IsSuperAdmin)
                    _isSuperAdmin = true;
                else
                    _currentSchoolId = tenantContext.SchoolId;
            }
        }

        // Core Entities
        public DbSet<School> Schools { get; set; }
        public DbSet<Person> Persons { get; set; }  // PUR Identity layer
        public DbSet<UserLogin> UserLogins { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

        // Audit
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<StudentGuardian> StudentGuardians { get; set; }
        public DbSet<StudentDocument> StudentDocuments { get; set; }
        public DbSet<PromotionHistory> PromotionHistories { get; set; } // CRITICAL: Promotion audit trail
        public DbSet<Staff> StaffMembers { get; set; }
        public DbSet<StaffDocument> StaffDocuments { get; set; }
        public DbSet<StaffQualification> StaffQualifications { get; set; }
        public DbSet<PerformanceReview> PerformanceReviews { get; set; }

        // Attendance
        public DbSet<StudentAttendance> StudentAttendances { get; set; }
        public DbSet<StaffAttendance> StaffAttendances { get; set; }
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        public DbSet<StudentLeaveRequest> AttendanceLeaveRequests { get; set; }
        public DbSet<BiometricLog> BiometricLogs { get; set; }

        // Fees
        public DbSet<FeeStructure> FeeStructures { get; set; }
        public DbSet<FeeRecord> FeeRecords { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<LateFeeConfig> LateFeeConfigs { get; set; }
        public DbSet<PaymentGatewayLog> PaymentGatewayLogs { get; set; }
        public DbSet<Refund> Refunds { get; set; }
        public DbSet<FeeAuditLog> FeeAuditLogs { get; set; }

        // Examinations
        public DbSet<Exam> Examinations { get; set; }
        public DbSet<ExamRegistration> ExamRegistrations { get; set; }
        public DbSet<ExamResult> ExamResults { get; set; }
        public DbSet<Result> Results { get; set; }
        public DbSet<GradeConfiguration> GradeConfigurations { get; set; }
        public DbSet<ReportCard> ReportCards { get; set; }

        // Admissions
        public DbSet<Admission> Admissions { get; set; }
        public DbSet<AdmissionDocument> AdmissionDocuments { get; set; }
        public DbSet<AdmissionTest> AdmissionTests { get; set; }
        public DbSet<Interview> Interviews { get; set; }

        // Library
        public DbSet<Book> Books { get; set; }
        public DbSet<BookIssue> BookIssues { get; set; }

        // Transport
        public DbSet<TransportRoute> TransportRoutes { get; set; }
        public DbSet<TransportStudent> TransportStudents { get; set; }

        // Hostel
        public DbSet<HostelRoom> HostelRooms { get; set; }
        public DbSet<HostelStudent> HostelStudents { get; set; }

        // Health
        public DbSet<HealthRecord> HealthRecords { get; set; }
        public DbSet<SmsApi.Models.Entities.HealthAlert> HealthAlerts { get; set; }
        public DbSet<SmsApi.Models.Entities.Vaccination> Vaccinations { get; set; }

        // Payroll
        public DbSet<PayrollRecord> PayrollRecords { get; set; }
        public DbSet<PayrollAllowance> PayrollAllowances { get; set; }
        public DbSet<PayrollDeduction> PayrollDeductions { get; set; }
        public DbSet<SalaryStructure> SalaryStructures { get; set; }

        // Board Configuration (curriculum boards)
        public DbSet<BoardConfiguration> BoardConfigurations { get; set; }
        public DbSet<SchoolBoardConfig> SchoolBoardConfigs { get; set; }

        // Academics
        public DbSet<Class> Classes { get; set; }
        public DbSet<Section> Sections { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<SubjectType> SubjectTypes { get; set; }
        public DbSet<ExamType> ExamTypes { get; set; }
        public DbSet<ClassSubject> ClassSubjects { get; set; }
        public DbSet<StudentSubject> StudentSubjects { get; set; }
        public DbSet<TeacherAssignment> TeacherAssignments { get; set; }
        public DbSet<ClassSettings> ClassSettings { get; set; }
        public DbSet<GradeTier> GradeTiers { get; set; }
        public DbSet<TimetableEntry> Timetable { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }

        // Timetable (old)
        public DbSet<Models.Entities.Timetable> Timetables { get; set; }
        public DbSet<TimetablePeriod> TimetablePeriods { get; set; }
        public DbSet<Holiday> Holidays { get; set; }

        // Assignments
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }

        // Grades
        public DbSet<GradeCategory> GradeCategories { get; set; }
        public DbSet<GradeItem> GradeItems { get; set; }
        public DbSet<StudentGrade> StudentGrades { get; set; }
        public DbSet<CCEAssessment> CCEAssessments { get; set; }

        // Announcements
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<AnnouncementRecipient> AnnouncementRecipients { get; set; }

        // Communication
        public DbSet<Message> Messages { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<MessageTemplate> MessageTemplates { get; set; }
        public DbSet<AnnouncementAttachment> AnnouncementAttachments { get; set; }
        public DbSet<AnnouncementReadReceipt> AnnouncementReadReceipts { get; set; }

        // Documents
        public DbSet<Document> Documents { get; set; }
        public DbSet<DocumentCategory> DocumentCategories { get; set; }

        // Reports
        public DbSet<Report> Reports { get; set; }
        public DbSet<ReportTemplate> ReportTemplates { get; set; }

        // Analytics
        public DbSet<DashboardWidget> DashboardWidgets { get; set; }
        public DbSet<Analytics> AnalyticsRecords { get; set; }

        // Certificates & ID Cards
        public DbSet<Certificate> Certificates { get; set; }
        public DbSet<CertificateTemplate> CertificateTemplates { get; set; }
        public DbSet<IDCard> IDCards { get; set; }
        public DbSet<IDCardTemplate> IDCardTemplates { get; set; }

        // Priority 4 - Extended Features
        public DbSet<FinanceAccount> FinanceAccounts { get; set; }
        public DbSet<FinanceTransaction> FinanceTransactions { get; set; }
        public DbSet<FinanceCategory> FinanceCategories { get; set; }
        public DbSet<PettyCashEntry> PettyCashEntries { get; set; }
        public DbSet<StoreSale> StoreSales { get; set; }
        public DbSet<StoreItem> StoreItems { get; set; }
        public DbSet<StoreOrder> StoreOrders { get; set; }
        public DbSet<StoreOrderItem> StoreOrderItems { get; set; }
        public DbSet<StoreInventoryLog> StoreInventoryLogs { get; set; }
        public DbSet<LeaveType> LeaveTypes { get; set; }
        public DbSet<StaffLeaveRequest> LeaveRequests { get; set; }
        public DbSet<LeaveBalance> LeaveBalances { get; set; }
        public DbSet<Visitor> Visitors { get; set; }
        public DbSet<VisitorLog> VisitorLogs { get; set; }
        public DbSet<VisitorPreRegistration> VisitorPreRegistrations { get; set; }
        public DbSet<Alumni> AlumniRecords { get; set; }
        public DbSet<AlumniMeet> AlumniMeets { get; set; }
        public DbSet<AlumniDonation> AlumniDonations { get; set; }

        // School Connect - Social Media Platform
        public DbSet<SchoolConnectPost> SchoolConnectPosts { get; set; }
        public DbSet<SchoolConnectComment> SchoolConnectComments { get; set; }
        public DbSet<SchoolConnectPostLike> SchoolConnectPostLikes { get; set; }
        public DbSet<SchoolConnectCommentLike> SchoolConnectCommentLikes { get; set; }
        public DbSet<SchoolConnectPostReport> SchoolConnectPostReports { get; set; }
        public DbSet<SchoolConnectPostShare> SchoolConnectPostShares { get; set; }

        // Priority 5 - Settings & Compliance
        public DbSet<SchoolSettings> SchoolSettings { get; set; }
        public DbSet<UserSettings> UserSettings { get; set; }
        public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<SchoolFeaturePermission> SchoolFeaturePermissions { get; set; }
        public DbSet<ConcessionType> ConcessionTypes { get; set; }
        public DbSet<FeeConcession> FeeConcessions { get; set; }
        public DbSet<PaymentGatewayConfig> PaymentGatewayConfigs { get; set; }
        public DbSet<GatewayPaymentTransaction> GatewayPaymentTransactions { get; set; }
        public DbSet<PaymentRefund> PaymentRefunds { get; set; }
        public DbSet<PFESIConfiguration> PFESIConfigurations { get; set; }
        public DbSet<PFESIContribution> PFESIContributions { get; set; }
        public DbSet<ComplianceReport> ComplianceReports { get; set; }
        public DbSet<OfflineAttendanceSession> OfflineAttendanceSessions { get; set; }
        public DbSet<OfflineAttendanceRecord> OfflineAttendanceRecords { get; set; }
        public DbSet<OfflineDevice> OfflineDevices { get; set; }
        public DbSet<SyncConflict> SyncConflicts { get; set; }

        /// <summary>
        /// Automatically populates audit fields (CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
        /// on all BaseEntity-derived entities before persisting changes.
        /// </summary>
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplyAuditFields();
            return await base.SaveChangesAsync(cancellationToken);
        }

        public override int SaveChanges()
        {
            ApplyAuditFields();
            return base.SaveChanges();
        }

        private void ApplyAuditFields()
        {
            var now = DateTime.UtcNow;
            Guid? currentUserId = null;

            // Resolve current user from tenant context (if available)
            // _currentSchoolId is set from ITenantContext; userId comes from the same source.
            // We walk up to the IHttpContextAccessor to get the UserId claim.
            try
            {
                var httpContextAccessor = this.GetService<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
                var userIdClaim = httpContextAccessor?.HttpContext?.User?.FindFirst("UserId")?.Value;
                if (Guid.TryParse(userIdClaim, out var uid))
                    currentUserId = uid;
            }
            catch
            {
                // Design-time or seeding — no HttpContext available; skip user assignment
            }

            foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedAt = now;
                        entry.Entity.UpdatedAt = now;
                        if (currentUserId.HasValue)
                        {
                            entry.Entity.CreatedBy ??= currentUserId;
                            entry.Entity.UpdatedBy = currentUserId;
                        }
                        break;

                    case EntityState.Modified:
                        entry.Entity.UpdatedAt = now;
                        if (currentUserId.HasValue)
                            entry.Entity.UpdatedBy = currentUserId;
                        // Prevent overwriting CreatedAt on update
                        entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                        entry.Property(nameof(BaseEntity.CreatedBy)).IsModified = false;
                        break;

                    case EntityState.Deleted:
                        // Convert hard deletes to soft deletes for BaseEntity types
                        entry.State = EntityState.Modified;
                        entry.Entity.IsDeleted = true;
                        entry.Entity.DeletedAt = now;
                        entry.Entity.UpdatedAt = now;
                        if (currentUserId.HasValue)
                            entry.Entity.UpdatedBy = currentUserId;
                        break;
                }
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure entity relationships and constraints
            ConfigureSchool(modelBuilder);
            ConfigurePerson(modelBuilder);
            ConfigureUserLoginAndAuth(modelBuilder);  // auth critical path
            ConfigureStudent(modelBuilder);
            ConfigureStaff(modelBuilder);
            ConfigureAttendance(modelBuilder);
            ConfigureFees(modelBuilder);
            ConfigureExaminations(modelBuilder);
            ConfigureAdmissions(modelBuilder);
            ConfigureLibrary(modelBuilder);
            ConfigureTransport(modelBuilder);
            ConfigureHostel(modelBuilder);
            ConfigureHealth(modelBuilder);
            ConfigurePayroll(modelBuilder);
            ConfigureAcademics(modelBuilder);
            ConfigureBoardConfiguration(modelBuilder);
            ConfigureTimetable(modelBuilder);
            ConfigureAssignments(modelBuilder);
            ConfigureGrades(modelBuilder);
            ConfigureAnnouncements(modelBuilder);
            ConfigureCommunication(modelBuilder);
            ConfigureDocuments(modelBuilder);
            ConfigureReports(modelBuilder);
            ConfigureAnalytics(modelBuilder);
            ConfigureCertificates(modelBuilder);
            ConfigureWallet(modelBuilder);
            ConfigureStore(modelBuilder);
            ConfigureLeaveManagement(modelBuilder);
            ConfigureVisitorManagement(modelBuilder);
            ConfigureAlumni(modelBuilder);
            ConfigureSchoolConnect(modelBuilder);
            ConfigureSettings(modelBuilder);
            ConfigurePermissions(modelBuilder);
            ConfigureFeeConcession(modelBuilder);
            ConfigurePaymentGateway(modelBuilder);
            ConfigurePFESIManagement(modelBuilder);
            ConfigureOfflineAttendance(modelBuilder);

            // Apply IsDeleted = false soft-delete filter to ALL entities derived from BaseEntity.
            // This prevents soft-deleted records from ever appearing in queries unless the caller
            // explicitly opts out with .IgnoreQueryFilters().
            // IMPORTANT: Only apply to root entity types (BaseType == null) — EF Core does not
            // allow HasQueryFilter on derived types in a TPH/TPT inheritance hierarchy.
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(SmsApi.Models.Entities.BaseEntity).IsAssignableFrom(entityType.ClrType)
                    && entityType.BaseType == null)   // root only
                {
                    var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");

                    // Filter 1: IsDeleted = false (soft-delete)
                    var isDeletedProp = System.Linq.Expressions.Expression.Property(parameter, "IsDeleted");
                    var falseConst    = System.Linq.Expressions.Expression.Constant(false);
                    var notDeleted    = System.Linq.Expressions.Expression.Equal(isDeletedProp, falseConst);

                    var body = notDeleted;

                    // Filter 2: SchoolId scoping (defense-in-depth multi-tenancy)
                    // Only added when the entity has a SchoolId property AND we have a school context.
                    var schoolIdPropInfo = entityType.ClrType.GetProperty("SchoolId");
                    if (schoolIdPropInfo != null && schoolIdPropInfo.PropertyType == typeof(Guid))
                    {
                        // Capture loop variable for closure safety
                        var capturedSchoolId   = _currentSchoolId;
                        var capturedSuperAdmin = _isSuperAdmin;

                        var schoolIdProp       = System.Linq.Expressions.Expression.Property(parameter, schoolIdPropInfo);
                        var schoolIdConst      = System.Linq.Expressions.Expression.Constant(capturedSchoolId, typeof(Guid?));
                        var isSuperAdminConst  = System.Linq.Expressions.Expression.Constant(capturedSuperAdmin);
                        var hasNoSchoolFilter  = System.Linq.Expressions.Expression.Equal(schoolIdConst, System.Linq.Expressions.Expression.Constant(null, typeof(Guid?)));
                        var schoolIdAsNullable = System.Linq.Expressions.Expression.Convert(schoolIdProp, typeof(Guid?));
                        var schoolIdMatches    = System.Linq.Expressions.Expression.Equal(schoolIdAsNullable, schoolIdConst);
                        // Pass if: isSuperAdmin OR schoolId filter is null (design-time) OR schoolId matches
                        var schoolFilter = System.Linq.Expressions.Expression.OrElse(
                            isSuperAdminConst,
                            System.Linq.Expressions.Expression.OrElse(hasNoSchoolFilter, schoolIdMatches));

                        body = System.Linq.Expressions.Expression.AndAlso(notDeleted, schoolFilter);
                    }

                    var lambda = System.Linq.Expressions.Expression.Lambda(body, parameter);
                    modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
                }
            }

            // Fix decimal precision for all unspecified decimal columns.
            // Prevents EF "no store type specified" warning and ensures data integrity.
            ConfigureDecimalPrecision(modelBuilder);
        }

        /// <summary>
        /// Assigns explicit decimal precision to all properties that lack [Column(TypeName)] annotations.
        /// Marks / percentages → decimal(6,2);  GPA/grade-points → decimal(4,2);
        /// Monetary amounts (alumni, analytics) → decimal(12,2).
        /// </summary>
        private static void ConfigureDecimalPrecision(ModelBuilder modelBuilder)
        {
            // ── Academics ──────────────────────────────────────────────────────
            modelBuilder.Entity<ClassSettings>(e =>
            {
                e.Property(x => x.PassingPercentage).HasColumnType("decimal(5,2)");
                e.Property(x => x.MinimumAttendance).HasColumnType("decimal(5,2)");
            });

            modelBuilder.Entity<GradeTier>(e =>
            {
                e.Property(x => x.MinMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.MaxMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.GPA).HasColumnType("decimal(4,2)");
            });

            // ── Grades ─────────────────────────────────────────────────────────
            modelBuilder.Entity<GradeCategory>(e =>
            {
                e.Property(x => x.Weightage).HasColumnType("decimal(5,2)");
            });

            modelBuilder.Entity<GradeItem>(e =>
            {
                e.Property(x => x.MaxMarks).HasColumnType("decimal(6,2)");
            });

            modelBuilder.Entity<StudentGrade>(e =>
            {
                e.Property(x => x.MarksObtained).HasColumnType("decimal(6,2)");
            });

            // ── Examinations (extended) ────────────────────────────────────────
            modelBuilder.Entity<Result>(e =>
            {
                e.Property(x => x.TheoryMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.PracticalMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.TotalMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.ObtainedMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.GradePoint).HasColumnType("decimal(4,2)");
                e.Property(x => x.Percentage).HasColumnType("decimal(5,2)");
            });

            modelBuilder.Entity<GradeConfiguration>(e =>
            {
                e.Property(x => x.MinPercentage).HasColumnType("decimal(5,2)");
                e.Property(x => x.MaxPercentage).HasColumnType("decimal(5,2)");
                e.Property(x => x.GradePoint).HasColumnType("decimal(4,2)");
            });

            modelBuilder.Entity<ReportCard>(e =>
            {
                e.Property(x => x.TotalMarks).HasColumnType("decimal(8,2)");
                e.Property(x => x.ObtainedMarks).HasColumnType("decimal(8,2)");
                e.Property(x => x.Percentage).HasColumnType("decimal(5,2)");
                e.Property(x => x.CGPA).HasColumnType("decimal(4,2)");
            });

            modelBuilder.Entity<AdmissionTest>(e =>
            {
                e.Property(x => x.MaxMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.ObtainedMarks).HasColumnType("decimal(6,2)");
                e.Property(x => x.Percentage).HasColumnType("decimal(5,2)");
            });

            // ── Analytics ─────────────────────────────────────────────────────
            modelBuilder.Entity<Analytics>(e =>
            {
                e.Property(x => x.Value).HasColumnType("decimal(14,4)");
            });

            // ── Alumni ────────────────────────────────────────────────────────
            modelBuilder.Entity<AlumniMeet>(e =>
            {
                e.Property(x => x.RegistrationFee).HasColumnType("decimal(12,2)");
            });

            modelBuilder.Entity<AlumniDonation>(e =>
            {
                e.Property(x => x.Amount).HasColumnType("decimal(12,2)");
            });

            // ── Payroll ───────────────────────────────────────────────────────
            modelBuilder.Entity<PayrollRecord>(e =>
            {
                e.Property(x => x.BasicSalary).HasColumnType("decimal(12,2)");
                e.Property(x => x.Allowances).HasColumnType("decimal(12,2)");
                e.Property(x => x.Deductions).HasColumnType("decimal(12,2)");
                e.Property(x => x.Bonus).HasColumnType("decimal(12,2)");
                e.Property(x => x.NetSalary).HasColumnType("decimal(12,2)");
            });

            modelBuilder.Entity<PayrollAllowance>(e =>
            {
                e.Property(x => x.Amount).HasColumnType("decimal(12,2)");
            });

            modelBuilder.Entity<PayrollDeduction>(e =>
            {
                e.Property(x => x.Amount).HasColumnType("decimal(12,2)");
            });

            // ── Hostel ────────────────────────────────────────────────────────
            modelBuilder.Entity<HostelRoom>(e =>
            {
                e.Property(x => x.RentPerBed).HasColumnType("decimal(10,2)");
            });

            // ── Health ────────────────────────────────────────────────────────
            modelBuilder.Entity<HealthRecord>(e =>
            {
                e.Property(x => x.Weight).HasColumnType("decimal(5,2)");
                e.Property(x => x.Height).HasColumnType("decimal(5,2)");
            });

            // ── Staff ─────────────────────────────────────────────────────────
            modelBuilder.Entity<StaffQualification>(e =>
            {
                e.Property(x => x.Percentage).HasColumnType("decimal(5,2)");
            });

            // ── Salary Structure ───────────────────────────────────────────────
            modelBuilder.Entity<SalaryStructure>(e =>
            {
                e.Property(x => x.BasicSalary).HasColumnType("decimal(12,2)");
            });
        }

        private void ConfigureSchool(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<School>(entity =>
            {
                entity.HasIndex(e => e.SchoolCode).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
            });
        }

        /// <summary>
        /// Indexes for the authentication critical path.
        /// Every login query, token refresh, and 2FA challenge hits these tables — indexes are essential.
        /// </summary>
        private void ConfigureUserLoginAndAuth(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<UserLogin>(entity =>
            {
                // Login lookups by email or username (most frequent queries in the system)
                entity.HasIndex(e => new { e.SchoolId, e.Email }).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.Username }).IsUnique();
                // Cross-school lookup by SuperAdmin
                entity.HasIndex(e => e.Email);
                // Lockout / status filtering
                entity.HasIndex(e => new { e.SchoolId, e.Status });
                // 2FA challenge expiry cleanup
                entity.HasIndex(e => e.TwoFactorChallengeExpiry);
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                // Token lookup on every refresh (Token column must be indexed)
                entity.HasIndex(e => e.Token).IsUnique();
                // Revocation cleanup job uses UserLoginId
                entity.HasIndex(e => e.UserLoginId);
                // Expire-based cleanup
                entity.HasIndex(e => e.ExpiresAt);
            });

            modelBuilder.Entity<PasswordResetToken>(entity =>
            {
                entity.HasIndex(e => e.Token).IsUnique();
                entity.HasIndex(e => e.UserLoginId);
                entity.HasIndex(e => e.ExpiresAt);
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                // Audit queries are always school-scoped and time-filtered
                entity.HasIndex(a => new { a.SchoolId, a.Timestamp });
                entity.HasIndex(a => new { a.UserId, a.Timestamp });
                entity.HasIndex(a => a.ActionType);
            });
        }

        /// <summary>
        /// Configures the Person entity — the central identity record for all humans in the system.
        /// </summary>
        private void ConfigurePerson(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Person>(entity =>
            {
                entity.HasOne(p => p.School)
                    .WithMany()
                    .HasForeignKey(p => p.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                // One Person → at most one Student profile (nullable FK on Student side)
                entity.HasOne(p => p.StudentProfile)
                    .WithOne(s => s.Person)
                    .HasForeignKey<Student>(s => s.PersonId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.SetNull);

                // One Person → at most one Staff profile (nullable FK on Staff side)
                entity.HasOne(p => p.StaffProfile)
                    .WithOne(s => s.Person)
                    .HasForeignKey<Staff>(s => s.PersonId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.SetNull);

                // Performance indexes
                entity.HasIndex(e => new { e.SchoolId, e.Email });
                entity.HasIndex(e => new { e.SchoolId, e.Phone });
            });
        }
        private void ConfigureStudent(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Student>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.AdmissionNumber }).IsUnique();
                entity.HasIndex(e => e.AadharNumber);

                // Configure JSON columns
                entity.Property(e => e.Nationality).HasColumnType("text");
                entity.Property(e => e.LanguageProficiency).HasColumnType("text");
                entity.Property(e => e.SiblingIds).HasColumnType("text");
            });

            modelBuilder.Entity<StudentGuardian>(entity =>
            {
                entity.HasOne(g => g.Student)
                    .WithMany(s => s.Guardians)
                    .HasForeignKey(g => g.StudentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.AadharNumber);
            });

            modelBuilder.Entity<StudentDocument>(entity =>
            {
                entity.HasOne(d => d.Student)
                    .WithMany(s => s.Documents)
                    .HasForeignKey(d => d.StudentId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        private void ConfigureStaff(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Staff>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.EmployeeId }).IsUnique();
                entity.HasIndex(e => e.AadharNumber);
                entity.HasIndex(e => e.PanNumber);

                // Self-referencing relationship for reporting structure
                entity.HasOne<Staff>()
                    .WithMany()
                    .HasForeignKey(s => s.ReportingToId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Configure JSON columns
                entity.Property(e => e.Subjects).HasColumnType("text");
                entity.Property(e => e.Classes).HasColumnType("text");
            });

            modelBuilder.Entity<StaffDocument>(entity =>
            {
                entity.HasOne(d => d.Staff)
                    .WithMany(s => s.Documents)
                    .HasForeignKey(d => d.StaffId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        private void ConfigureAttendance(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<StudentAttendance>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Student)
                    .WithMany()
                    .HasForeignKey(a => a.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.StudentId, e.Date }).IsUnique();
            });

            modelBuilder.Entity<StaffAttendance>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Staff)
                    .WithMany()
                    .HasForeignKey(a => a.StaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.StaffId, e.Date }).IsUnique();
            });
        }

        private void ConfigureFees(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<FeeStructure>(entity =>
            {
                entity.HasOne(f => f.School)
                    .WithMany()
                    .HasForeignKey(f => f.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Configure JSON columns for installments
                entity.Property(e => e.InstallmentAmounts).HasColumnType("text");
                entity.Property(e => e.InstallmentDueDates).HasColumnType("text");
            });

            modelBuilder.Entity<FeeRecord>(entity =>
            {
                entity.HasOne(f => f.School)
                    .WithMany()
                    .HasForeignKey(f => f.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.Student)
                    .WithMany()
                    .HasForeignKey(f => f.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.FeeStructure)
                    .WithMany()
                    .HasForeignKey(f => f.FeeStructureId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired(false);
            });

            modelBuilder.Entity<PaymentTransaction>(entity =>
            {
                entity.HasOne(p => p.School)
                    .WithMany()
                    .HasForeignKey(p => p.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Student)
                    .WithMany()
                    .HasForeignKey(p => p.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.FeeRecord)
                    .WithMany()
                    .HasForeignKey(p => p.FeeRecordId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<LateFeeConfig>(entity =>
            {
                entity.HasOne(l => l.School)
                    .WithMany()
                    .HasForeignKey(l => l.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FeeAuditLog>(entity =>
            {
                entity.ToTable("FeeAuditLogs");
                entity.HasKey(a => a.Id);
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(a => new { a.SchoolId, a.Timestamp });
                entity.HasIndex(a => new { a.EntityType, a.EntityId });
                entity.HasIndex(a => a.FeeRecordId);
                entity.HasIndex(a => a.StudentId);
                entity.Property(a => a.OldValues).HasColumnType("jsonb");
                entity.Property(a => a.NewValues).HasColumnType("jsonb");
            });
        }

        private void ConfigureExaminations(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Exam>(entity =>
            {
                entity.HasOne(e => e.School)
                    .WithMany()
                    .HasForeignKey(e => e.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ExamRegistration>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Exam)
                    .WithMany()
                    .HasForeignKey(r => r.ExamId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(r => r.Student)
                    .WithMany()
                    .HasForeignKey(r => r.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ExamId, e.StudentId }).IsUnique();
            });

            modelBuilder.Entity<ExamResult>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Exam)
                    .WithMany()
                    .HasForeignKey(r => r.ExamId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Student)
                    .WithMany()
                    .HasForeignKey(r => r.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ExamId, e.StudentId, e.Subject }).IsUnique();
            });
        }

        private void ConfigureAdmissions(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Admission>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ApplicationNumber).IsUnique();
            });

            modelBuilder.Entity<AdmissionDocument>(entity =>
            {
                entity.HasOne(d => d.Admission)
                    .WithMany()
                    .HasForeignKey(d => d.AdmissionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        private void ConfigureLibrary(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Book>(entity =>
            {
                entity.HasOne(b => b.School)
                    .WithMany()
                    .HasForeignKey(b => b.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ISBN }).IsUnique();
            });

            modelBuilder.Entity<BookIssue>(entity =>
            {
                entity.HasOne(i => i.School)
                    .WithMany()
                    .HasForeignKey(i => i.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.Book)
                    .WithMany()
                    .HasForeignKey(i => i.BookId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.Student)
                    .WithMany()
                    .HasForeignKey(i => i.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }

        private void ConfigureTransport(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TransportRoute>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.RouteNumber }).IsUnique();
            });

            modelBuilder.Entity<TransportStudent>(entity =>
            {
                entity.HasOne(t => t.School)
                    .WithMany()
                    .HasForeignKey(t => t.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Student)
                    .WithMany()
                    .HasForeignKey(t => t.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Route)
                    .WithMany()
                    .HasForeignKey(t => t.RouteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }

        private void ConfigureHostel(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<HostelRoom>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.RoomNumber }).IsUnique();
            });

            modelBuilder.Entity<HostelStudent>(entity =>
            {
                entity.HasOne(h => h.School)
                    .WithMany()
                    .HasForeignKey(h => h.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(h => h.Student)
                    .WithMany()
                    .HasForeignKey(h => h.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(h => h.Room)
                    .WithMany()
                    .HasForeignKey(h => h.RoomId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }

        private void ConfigureHealth(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<HealthRecord>(entity =>
            {
                entity.HasOne(h => h.School)
                    .WithMany()
                    .HasForeignKey(h => h.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(h => h.Student)
                    .WithMany()
                    .HasForeignKey(h => h.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }

        private void ConfigurePayroll(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PayrollRecord>(entity =>
            {
                entity.HasOne(p => p.School)
                    .WithMany()
                    .HasForeignKey(p => p.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Staff)
                    .WithMany()
                    .HasForeignKey(p => p.StaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.StaffId, e.Month, e.Year }).IsUnique();
            });

            modelBuilder.Entity<PayrollAllowance>(entity =>
            {
                entity.HasOne(a => a.Payroll)
                    .WithMany()
                    .HasForeignKey(a => a.PayrollId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<PayrollDeduction>(entity =>
            {
                entity.HasOne(d => d.Payroll)
                    .WithMany()
                    .HasForeignKey(d => d.PayrollId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        private void ConfigureAcademics(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Class>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(c => c.BoardConfig)
                    .WithMany()
                    .HasForeignKey(c => c.BoardConfigurationId)
                    .OnDelete(DeleteBehavior.SetNull)
                    .IsRequired(false);

                entity.HasIndex(e => new { e.SchoolId, e.Name }).IsUnique();
            });

            modelBuilder.Entity<Section>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.Class)
                    .WithMany()
                    .HasForeignKey(s => s.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ClassId, e.Name }).IsUnique();
            });

            modelBuilder.Entity<Subject>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Code }).IsUnique();
            });

            modelBuilder.Entity<ClassSubject>(entity =>
            {
                entity.HasOne(cs => cs.School)
                    .WithMany()
                    .HasForeignKey(cs => cs.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cs => cs.Class)
                    .WithMany()
                    .HasForeignKey(cs => cs.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cs => cs.Subject)
                    .WithMany()
                    .HasForeignKey(cs => cs.SubjectId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ClassId, e.SubjectId }).IsUnique();
            });

            modelBuilder.Entity<TeacherAssignment>(entity =>
            {
                entity.HasOne(ta => ta.School)
                    .WithMany()
                    .HasForeignKey(ta => ta.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ta => ta.Staff)
                    .WithMany()
                    .HasForeignKey(ta => ta.StaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ta => ta.Class)
                    .WithMany()
                    .HasForeignKey(ta => ta.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ta => ta.Section)
                    .WithMany()
                    .HasForeignKey(ta => ta.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(ta => ta.Subject)
                    .WithMany()
                    .HasForeignKey(ta => ta.SubjectId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }

        private void ConfigureBoardConfiguration(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<BoardConfiguration>(entity =>
            {
                entity.HasIndex(e => e.Code);
                entity.Property(e => e.GradingScaleJson).HasColumnType("text");
                entity.Property(e => e.ExamStructureJson).HasColumnType("text");

                // System boards have null SchoolId — no FK required
                entity.HasOne(b => b.School)
                    .WithMany()
                    .HasForeignKey(b => b.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired(false);

                // ── Seed data for all major Indian boards ──────────────────────
                // CBSE
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000001"),
                    Name = "Central Board of Secondary Education (CBSE)",
                    Code = "CBSE",
                    Description = "National board governed by NCERT. Follows CCE pattern with Periodic Tests, Half-Yearly and Annual exams.",
                    BoardLevel = "National",
                    StateCode = null,
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "A1-E2",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A1\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"E1\",\"minPercentage\":21,\"maxPercentage\":32,\"gradePoint\":3.0,\"description\":\"Needs Improvement\",\"isPassing\":false},{\"grade\":\"E2\",\"minPercentage\":0,\"maxPercentage\":20,\"gradePoint\":2.0,\"description\":\"Unsatisfactory\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"PT1\",\"name\":\"Periodic Test 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":40},{\"code\":\"PT2\",\"name\":\"Periodic Test 2\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":40},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":80},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":80}]",
                    IsSystemBoard = true,
                    IsCustomizable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // ICSE (CISCE Class 10)
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000002"),
                    Name = "Indian Certificate of Secondary Education (ICSE)",
                    Code = "ICSE",
                    Description = "Class 10 board under CISCE. Internal Assessment 50% + External Exam 50%.",
                    BoardLevel = "National",
                    StateCode = null,
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "A1-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A1\",\"minPercentage\":95,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":90,\"maxPercentage\":94,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":85,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":80,\"maxPercentage\":84,\"gradePoint\":7.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":6.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":5.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"D1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"D2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":3.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":2.0,\"description\":\"Eligible for Compartment\",\"isPassing\":false},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"IA\",\"name\":\"Internal Assessment\",\"weightagePercent\":50,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"EXT\",\"name\":\"External Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // ISC (CISCE Class 12)
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000003"),
                    Name = "Indian School Certificate (ISC)",
                    Code = "ISC",
                    Description = "Class 11-12 board under CISCE. Theory + Practical components.",
                    BoardLevel = "National",
                    StateCode = null,
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "A-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":75,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":60,\"maxPercentage\":74,\"gradePoint\":6.5,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":45,\"maxPercentage\":59,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":35,\"maxPercentage\":44,\"gradePoint\":3.5,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"TERM1\",\"name\":\"Term 1 (Internal)\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"TERM2\",\"name\":\"Term 2 (Board Exam)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // IB (International Baccalaureate)
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000004"),
                    Name = "International Baccalaureate (IB)",
                    Code = "IB",
                    Description = "IB Diploma Programme. 1-7 grade scale per subject. Max 45 points total.",
                    BoardLevel = "International",
                    StateCode = null,
                    TheoryPassingPercentage = 40,
                    PracticalPassingPercentage = 40,
                    OverallPassingPercentage = 40,
                    GradingSystem = "1-7",
                    MaxGradePoint = 7,
                    GradingScaleJson = "[{\"grade\":\"7\",\"minPercentage\":86,\"maxPercentage\":100,\"gradePoint\":7.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"6\",\"minPercentage\":72,\"maxPercentage\":85,\"gradePoint\":6.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"5\",\"minPercentage\":58,\"maxPercentage\":71,\"gradePoint\":5.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"4\",\"minPercentage\":44,\"maxPercentage\":57,\"gradePoint\":4.0,\"description\":\"Satisfactory\",\"isPassing\":true},{\"grade\":\"3\",\"minPercentage\":30,\"maxPercentage\":43,\"gradePoint\":3.0,\"description\":\"Mediocre\",\"isPassing\":false},{\"grade\":\"2\",\"minPercentage\":16,\"maxPercentage\":29,\"gradePoint\":2.0,\"description\":\"Poor\",\"isPassing\":false},{\"grade\":\"1\",\"minPercentage\":0,\"maxPercentage\":15,\"gradePoint\":1.0,\"description\":\"Very Poor\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"IA\",\"name\":\"Internal Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"EXT\",\"name\":\"External Examination (May/November)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Cambridge (CAIE)
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000005"),
                    Name = "Cambridge Assessment International Education (CAIE)",
                    Code = "CAIE",
                    Description = "Cambridge IGCSE / A-Level. Grades A*-E for pass, U for ungraded.",
                    BoardLevel = "International",
                    StateCode = null,
                    TheoryPassingPercentage = 40,
                    PracticalPassingPercentage = 40,
                    OverallPassingPercentage = 40,
                    GradingSystem = "A*-U",
                    MaxGradePoint = 9,
                    GradingScaleJson = "[{\"grade\":\"A*\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":9.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":7.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":6.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":5.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":4.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"U\",\"minPercentage\":0,\"maxPercentage\":39,\"gradePoint\":0.0,\"description\":\"Ungraded\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"COMP1\",\"name\":\"Component 1 (Theory)\",\"weightagePercent\":60,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"COMP2\",\"name\":\"Component 2 (Practical / Coursework)\",\"weightagePercent\":40,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":60}]",
                    IsSystemBoard = true,
                    IsCustomizable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Maharashtra State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000006"),
                    Name = "Maharashtra State Board (MSBSHSE)",
                    Code = "STATE-MH",
                    Description = "Maharashtra State Board of Secondary & Higher Secondary Education.",
                    BoardLevel = "State",
                    StateCode = "MH",
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "O-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"O\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A+\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"PRELIM\",\"name\":\"Preliminary Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"BOARD\",\"name\":\"Board Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Tamil Nadu State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000007"),
                    Name = "Tamil Nadu State Board (TNBSE)",
                    Code = "STATE-TN",
                    Description = "Tamil Nadu Board of Secondary Education.",
                    BoardLevel = "State",
                    StateCode = "TN",
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "A+-U",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":40,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"U\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"UT1\",\"name\":\"Unit Test 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"UT2\",\"name\":\"Unit Test 2\",\"weightagePercent\":10,\"term\":2,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Karnataka State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000008"),
                    Name = "Karnataka Secondary Education Examination Board (KSEEB)",
                    Code = "STATE-KA",
                    Description = "Karnataka State Board for Classes 1-12.",
                    BoardLevel = "State",
                    StateCode = "KA",
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "A1-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A1\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA1\",\"name\":\"Summative Assessment 1\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"SA2\",\"name\":\"Summative Assessment 2 (Board)\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Andhra Pradesh / Telangana
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000009"),
                    Name = "Andhra Pradesh / Telangana State Board (BSEAP/BSETS)",
                    Code = "STATE-AP",
                    Description = "Common grading for AP and Telangana State Boards.",
                    BoardLevel = "State",
                    StateCode = "AP",
                    TheoryPassingPercentage = 35,
                    PracticalPassingPercentage = 35,
                    OverallPassingPercentage = 35,
                    GradingSystem = "A+-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA1\",\"name\":\"Formative Assessment 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"FA2\",\"name\":\"Formative Assessment 2\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA1\",\"name\":\"Summative Assessment 1\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"SA2\",\"name\":\"Summative Assessment 2 (Board)\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Gujarat State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000010"),
                    Name = "Gujarat Secondary and Higher Secondary Education Board (GSEB)",
                    Code = "STATE-GJ",
                    Description = "Gujarat State Board.",
                    BoardLevel = "State",
                    StateCode = "GJ",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "A1-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A1\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":3.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":30,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA\",\"name\":\"Summative Assessment (Board)\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Rajasthan State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000011"),
                    Name = "Board of Secondary Education Rajasthan (RBSE)",
                    Code = "STATE-RJ",
                    Description = "Rajasthan State Board.",
                    BoardLevel = "State",
                    StateCode = "RJ",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "A+-E",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A+\",\"minPercentage\":80,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":49,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":30,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA\",\"name\":\"Summative Assessment (Board)\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Uttar Pradesh State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000012"),
                    Name = "Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP)",
                    Code = "STATE-UP",
                    Description = "UP Board of High School and Intermediate Education.",
                    BoardLevel = "State",
                    StateCode = "UP",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "D1-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"D1\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"D2\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"B3\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"BOARD\",\"name\":\"Board Examination\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Madhya Pradesh State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000013"),
                    Name = "Madhya Pradesh Board of Secondary Education (MPBSE)",
                    Code = "STATE-MP",
                    Description = "MP State Board for Classes 9-12.",
                    BoardLevel = "State",
                    StateCode = "MP",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "A+-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":20,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"ANNUAL\",\"name\":\"Annual/Board Examination\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // West Bengal State Board
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000014"),
                    Name = "West Bengal Board of Secondary Education (WBBSE)",
                    Code = "STATE-WB",
                    Description = "West Bengal State Board for Classes 1-12.",
                    BoardLevel = "State",
                    StateCode = "WB",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "Star-F",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"★\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Star Distinction\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Third Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination (Board)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

                // Kerala SCERT
                entity.HasData(new BoardConfiguration
                {
                    Id = new Guid("a0000001-0000-0000-0000-000000000015"),
                    Name = "Kerala Board (SCERT / DHSE)",
                    Code = "STATE-KL",
                    Description = "Kerala State Curriculum for Classes 1-12 (SCERT + DHSE).",
                    BoardLevel = "State",
                    StateCode = "KL",
                    TheoryPassingPercentage = 33,
                    PracticalPassingPercentage = 33,
                    OverallPassingPercentage = 33,
                    GradingSystem = "A+-E",
                    MaxGradePoint = 10,
                    GradingScaleJson = "[{\"grade\":\"A+\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]",
                    ExamStructureJson = "[{\"code\":\"CE\",\"name\":\"Continuous Evaluation\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]",
                    IsSystemBoard = true,
                    IsCustomizable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });
            });

            modelBuilder.Entity<SchoolBoardConfig>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(s => s.BoardConfiguration)
                    .WithMany()
                    .HasForeignKey(s => s.BoardConfigurationId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.AcademicYear, e.IsActive });
            });
        }

        private void ConfigureTimetable(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Timetable>(entity =>
            {
                entity.HasOne(t => t.School)
                    .WithMany()
                    .HasForeignKey(t => t.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Class)
                    .WithMany()
                    .HasForeignKey(t => t.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Section)
                    .WithMany()
                    .HasForeignKey(t => t.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.SchoolId, e.ClassId, e.SectionId, e.AcademicYear }).IsUnique();
            });

            modelBuilder.Entity<TimetablePeriod>(entity =>
            {
                entity.HasOne(tp => tp.Timetable)
                    .WithMany()
                    .HasForeignKey(tp => tp.TimetableId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tp => tp.Subject)
                    .WithMany()
                    .HasForeignKey(tp => tp.SubjectId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(tp => tp.Teacher)
                    .WithMany()
                    .HasForeignKey(tp => tp.TeacherId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.TimetableId, e.DayOfWeek, e.PeriodNumber }).IsUnique();
            });
        }

        private void ConfigureAssignments(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Assignment>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Class)
                    .WithMany()
                    .HasForeignKey(a => a.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Section)
                    .WithMany()
                    .HasForeignKey(a => a.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(a => a.Subject)
                    .WithMany()
                    .HasForeignKey(a => a.SubjectId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.AssignedBy)
                    .WithMany()
                    .HasForeignKey(a => a.AssignedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AssignmentSubmission>(entity =>
            {
                entity.HasOne(asub => asub.Assignment)
                    .WithMany()
                    .HasForeignKey(asub => asub.AssignmentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(asub => asub.Student)
                    .WithMany()
                    .HasForeignKey(asub => asub.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(asub => asub.GradedBy)
                    .WithMany()
                    .HasForeignKey(asub => asub.GradedById)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.AssignmentId, e.StudentId }).IsUnique();
            });
        }

        private void ConfigureGrades(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<GradeCategory>(entity =>
            {
                entity.HasOne(gc => gc.School)
                    .WithMany()
                    .HasForeignKey(gc => gc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Code }).IsUnique();
            });

            modelBuilder.Entity<GradeItem>(entity =>
            {
                entity.HasOne(gi => gi.School)
                    .WithMany()
                    .HasForeignKey(gi => gi.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(gi => gi.Class)
                    .WithMany()
                    .HasForeignKey(gi => gi.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(gi => gi.Section)
                    .WithMany()
                    .HasForeignKey(gi => gi.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(gi => gi.Subject)
                    .WithMany()
                    .HasForeignKey(gi => gi.SubjectId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(gi => gi.Category)
                    .WithMany()
                    .HasForeignKey(gi => gi.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<StudentGrade>(entity =>
            {
                entity.HasOne(sg => sg.GradeItem)
                    .WithMany()
                    .HasForeignKey(sg => sg.GradeItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(sg => sg.Student)
                    .WithMany()
                    .HasForeignKey(sg => sg.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sg => sg.EnteredBy)
                    .WithMany()
                    .HasForeignKey(sg => sg.EnteredById)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.GradeItemId, e.StudentId }).IsUnique();
            });

            modelBuilder.Entity<CCEAssessment>(entity =>
            {
                entity.HasOne(cce => cce.School)
                    .WithMany()
                    .HasForeignKey(cce => cce.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cce => cce.Student)
                    .WithMany()
                    .HasForeignKey(cce => cce.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cce => cce.Class)
                    .WithMany()
                    .HasForeignKey(cce => cce.ClassId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cce => cce.Section)
                    .WithMany()
                    .HasForeignKey(cce => cce.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(cce => cce.AssessedBy)
                    .WithMany()
                    .HasForeignKey(cce => cce.AssessedById)
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }

        private void ConfigureAnnouncements(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Announcement>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.CreatedByStaff)
                    .WithMany()
                    .HasForeignKey(a => a.CreatedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.TargetClass)
                    .WithMany()
                    .HasForeignKey(a => a.TargetClassId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(a => a.TargetSection)
                    .WithMany()
                    .HasForeignKey(a => a.TargetSectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.SchoolId, e.PublishedDate });
                entity.HasIndex(e => new { e.SchoolId, e.IsActive });
            });

            modelBuilder.Entity<AnnouncementRecipient>(entity =>
            {
                entity.HasOne(ar => ar.Announcement)
                    .WithMany(a => a.Recipients)
                    .HasForeignKey(ar => ar.AnnouncementId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.AnnouncementId, e.RecipientType, e.RecipientId }).IsUnique();
                entity.HasIndex(e => new { e.RecipientType, e.RecipientId, e.IsRead });
            });
        }

        private void ConfigureCommunication(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Conversation>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Participant1Id, e.Participant2Id }).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.LastMessageAt });
            });

            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasOne(m => m.School)
                    .WithMany()
                    .HasForeignKey(m => m.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Conversation)
                    .WithMany(c => c.Messages)
                    .HasForeignKey(m => m.ConversationId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.SchoolId, e.SenderId, e.ReceiverId });
                entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
                entity.HasIndex(e => new { e.ReceiverId, e.ReceiverType, e.IsRead });
            });

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasOne(n => n.School)
                    .WithMany()
                    .HasForeignKey(n => n.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.RecipientId, e.RecipientType, e.IsRead });
                entity.HasIndex(e => new { e.SchoolId, e.Type, e.CreatedAt });
            });
        }

        private void ConfigureDocuments(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<DocumentCategory>(entity =>
            {
                entity.HasOne(dc => dc.School)
                    .WithMany()
                    .HasForeignKey(dc => dc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Name }).IsUnique();
            });

            modelBuilder.Entity<Document>(entity =>
            {
                entity.HasOne(d => d.School)
                    .WithMany()
                    .HasForeignKey(d => d.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Category)
                    .WithMany(dc => dc.Documents)
                    .HasForeignKey(d => d.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.UploadedByStaff)
                    .WithMany()
                    .HasForeignKey(d => d.UploadedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.RelatedClass)
                    .WithMany()
                    .HasForeignKey(d => d.RelatedClassId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.RelatedSection)
                    .WithMany()
                    .HasForeignKey(d => d.RelatedSectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.RelatedStudent)
                    .WithMany()
                    .HasForeignKey(d => d.RelatedStudentId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.RelatedStaff)
                    .WithMany()
                    .HasForeignKey(d => d.RelatedStaffId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.SchoolId, e.CategoryId });
                entity.HasIndex(e => new { e.SchoolId, e.IsActive });
            });
        }

        private void ConfigureReports(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ReportTemplate>(entity =>
            {
                entity.HasOne(rt => rt.School)
                    .WithMany()
                    .HasForeignKey(rt => rt.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(rt => rt.CreatedByStaff)
                    .WithMany()
                    .HasForeignKey(rt => rt.CreatedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ReportType });
                entity.HasIndex(e => new { e.SchoolId, e.IsActive });
            });

            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.GeneratedByStaff)
                    .WithMany()
                    .HasForeignKey(r => r.GeneratedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Class)
                    .WithMany()
                    .HasForeignKey(r => r.ClassId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(r => r.Section)
                    .WithMany()
                    .HasForeignKey(r => r.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.SchoolId, e.ReportType, e.GeneratedAt });
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });
        }

        private void ConfigureAnalytics(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<DashboardWidget>(entity =>
            {
                entity.HasOne(dw => dw.School)
                    .WithMany()
                    .HasForeignKey(dw => dw.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.IsActive, e.DisplayOrder });
                entity.HasIndex(e => new { e.SchoolId, e.DataSource });
            });

            modelBuilder.Entity<Analytics>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Class)
                    .WithMany()
                    .HasForeignKey(a => a.ClassId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(a => a.Section)
                    .WithMany()
                    .HasForeignKey(a => a.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => new { e.SchoolId, e.MetricType, e.PeriodStart });
                entity.HasIndex(e => new { e.SchoolId, e.Period });
            });
        }

        private void ConfigureCertificates(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<CertificateTemplate>(entity =>
            {
                entity.HasOne(ct => ct.School)
                    .WithMany()
                    .HasForeignKey(ct => ct.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.CertificateType, e.IsActive });
                entity.HasIndex(e => new { e.SchoolId, e.IsDefault });
            });

            modelBuilder.Entity<Certificate>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(c => c.Student)
                    .WithMany()
                    .HasForeignKey(c => c.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(c => c.Class)
                    .WithMany()
                    .HasForeignKey(c => c.ClassId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(c => c.Section)
                    .WithMany()
                    .HasForeignKey(c => c.SectionId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(c => c.Template)
                    .WithMany()
                    .HasForeignKey(c => c.TemplateId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(c => c.IssuedByStaff)
                    .WithMany()
                    .HasForeignKey(c => c.IssuedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.CertificateNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.StudentId, e.CertificateType });
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });

            modelBuilder.Entity<IDCardTemplate>(entity =>
            {
                entity.HasOne(ict => ict.School)
                    .WithMany()
                    .HasForeignKey(ict => ict.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.CardType, e.IsActive });
                entity.HasIndex(e => new { e.SchoolId, e.IsDefault });
            });

            modelBuilder.Entity<IDCard>(entity =>
            {
                entity.HasOne(ic => ic.School)
                    .WithMany()
                    .HasForeignKey(ic => ic.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ic => ic.Template)
                    .WithMany()
                    .HasForeignKey(ic => ic.TemplateId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.CardNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.HolderId, e.HolderType });
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });
        }

        private void ConfigureWallet(ModelBuilder modelBuilder)
        {
            // Finance module - no longer using Wallet entities
            // Configure FinanceAccount, FinanceTransaction, FinanceCategory, PettyCashEntry, StoreSale
            modelBuilder.Entity<FinanceAccount>(entity =>
            {
                entity.HasOne(fa => fa.School)
                    .WithMany()
                    .HasForeignKey(fa => fa.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Type });
            });

            modelBuilder.Entity<FinanceTransaction>(entity =>
            {
                entity.HasOne(ft => ft.School)
                    .WithMany()
                    .HasForeignKey(ft => ft.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ft => ft.Account)
                    .WithMany()
                    .HasForeignKey(ft => ft.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ft => ft.Category)
                    .WithMany()
                    .HasForeignKey(ft => ft.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Date });
                entity.HasIndex(e => new { e.SchoolId, e.Type });
            });

            modelBuilder.Entity<FinanceCategory>(entity =>
            {
                entity.HasOne(fc => fc.School)
                    .WithMany()
                    .HasForeignKey(fc => fc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Type });
            });

            modelBuilder.Entity<PettyCashEntry>(entity =>
            {
                entity.HasOne(pc => pc.School)
                    .WithMany()
                    .HasForeignKey(pc => pc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });

            modelBuilder.Entity<StoreSale>(entity =>
            {
                entity.HasOne(ss => ss.School)
                    .WithMany()
                    .HasForeignKey(ss => ss.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Date });
            });
        }

        private void ConfigureStore(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<StoreItem>(entity =>
            {
                entity.HasOne(si => si.School)
                    .WithMany()
                    .HasForeignKey(si => si.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Category, e.IsActive });
                entity.HasIndex(e => new { e.SchoolId, e.ItemCode });
            });

            modelBuilder.Entity<StoreOrder>(entity =>
            {
                entity.HasOne(so => so.School)
                    .WithMany()
                    .HasForeignKey(so => so.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.OrderNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.CustomerId, e.CustomerType });
                entity.HasIndex(e => new { e.SchoolId, e.OrderDate, e.Status });
            });

            modelBuilder.Entity<StoreOrderItem>(entity =>
            {
                entity.HasOne(soi => soi.School)
                    .WithMany()
                    .HasForeignKey(soi => soi.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(soi => soi.Order)
                    .WithMany()
                    .HasForeignKey(soi => soi.OrderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(soi => soi.Item)
                    .WithMany()
                    .HasForeignKey(soi => soi.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.OrderId, e.ItemId });
            });

            modelBuilder.Entity<StoreInventoryLog>(entity =>
            {
                entity.HasOne(sil => sil.School)
                    .WithMany()
                    .HasForeignKey(sil => sil.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sil => sil.Item)
                    .WithMany()
                    .HasForeignKey(sil => sil.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ItemId, e.CreatedAt });
            });
        }

        private void ConfigureLeaveManagement(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<LeaveType>(entity =>
            {
                entity.HasOne(lt => lt.School)
                    .WithMany()
                    .HasForeignKey(lt => lt.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.ApplicableTo, e.IsActive });
            });

            modelBuilder.Entity<StaffLeaveRequest>(entity =>
            {
                entity.HasOne(lr => lr.School)
                    .WithMany()
                    .HasForeignKey(lr => lr.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(lr => lr.LeaveType)
                    .WithMany()
                    .HasForeignKey(lr => lr.LeaveTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.LeaveNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.ApplicantId, e.ApplicantType });
                entity.HasIndex(e => new { e.SchoolId, e.Status, e.StartDate });
            });

            modelBuilder.Entity<LeaveBalance>(entity =>
            {
                entity.HasOne(lb => lb.School)
                    .WithMany()
                    .HasForeignKey(lb => lb.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(lb => lb.LeaveType)
                    .WithMany()
                    .HasForeignKey(lb => lb.LeaveTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.UserId, e.UserType, e.LeaveTypeId, e.AcademicYear })
                    .IsUnique();
            });
        }

        private void ConfigureVisitorManagement(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Visitor>(entity =>
            {
                entity.HasOne(v => v.School)
                    .WithMany()
                    .HasForeignKey(v => v.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Phone });
                entity.HasIndex(e => new { e.SchoolId, e.IdNumber });
            });

            modelBuilder.Entity<VisitorLog>(entity =>
            {
                entity.HasOne(vl => vl.School)
                    .WithMany()
                    .HasForeignKey(vl => vl.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(vl => vl.Visitor)
                    .WithMany()
                    .HasForeignKey(vl => vl.VisitorId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(vl => vl.Student)
                    .WithMany()
                    .HasForeignKey(vl => vl.StudentId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.VisitNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.CheckInTime, e.Status });
            });
        }

        private void ConfigureAlumni(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Alumni>(entity =>
            {
                entity.HasOne(a => a.School)
                    .WithMany()
                    .HasForeignKey(a => a.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.Student)
                    .WithMany()
                    .HasForeignKey(a => a.StudentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.BatchYear });
                entity.HasIndex(e => new { e.SchoolId, e.IsActive });
            });
        }

        private void ConfigureSchoolConnect(ModelBuilder modelBuilder)
        {
            // Posts
            modelBuilder.Entity<SchoolConnectPost>(entity =>
            {
                entity.HasIndex(e => new { e.SchoolId, e.CreatedAt });
                entity.HasIndex(e => new { e.SchoolId, e.AuthorId });
                entity.HasIndex(e => new { e.SchoolId, e.Visibility });
                entity.HasIndex(e => new { e.SchoolId, e.IsPinned });
                entity.HasIndex(e => new { e.SchoolId, e.IsScheduled, e.ScheduledPublishAt });
                entity.HasIndex(e => new { e.SchoolId, e.IsActive, e.IsPublished });

                entity.Property(e => e.Content).HasMaxLength(5000);
                entity.Property(e => e.AuthorName).HasMaxLength(100);
                entity.Property(e => e.AuthorRole).HasMaxLength(50);
                entity.Property(e => e.Visibility).HasMaxLength(20);
                entity.Property(e => e.MediaType).HasMaxLength(20);
            });

            // Comments
            modelBuilder.Entity<SchoolConnectComment>(entity =>
            {
                entity.HasOne(c => c.Post)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(c => c.PostId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(c => c.ParentComment)
                    .WithMany(c => c.Replies)
                    .HasForeignKey(c => c.ParentCommentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.PostId, e.CreatedAt });
                entity.HasIndex(e => new { e.PostId, e.ParentCommentId });

                entity.Property(e => e.Content).HasMaxLength(2000);
                entity.Property(e => e.AuthorName).HasMaxLength(100);
                entity.Property(e => e.AuthorRole).HasMaxLength(50);
            });

            // Post Likes
            modelBuilder.Entity<SchoolConnectPostLike>(entity =>
            {
                entity.HasOne(l => l.Post)
                    .WithMany(p => p.Likes)
                    .HasForeignKey(l => l.PostId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();

                entity.Property(e => e.UserName).HasMaxLength(100);
            });

            // Comment Likes
            modelBuilder.Entity<SchoolConnectCommentLike>(entity =>
            {
                entity.HasOne(l => l.Comment)
                    .WithMany(c => c.Likes)
                    .HasForeignKey(l => l.CommentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.CommentId, e.UserId }).IsUnique();

                entity.Property(e => e.UserName).HasMaxLength(100);
            });

            // Post Reports
            modelBuilder.Entity<SchoolConnectPostReport>(entity =>
            {
                entity.HasOne(r => r.Post)
                    .WithMany(p => p.Reports)
                    .HasForeignKey(r => r.PostId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.PostId, e.ReportedById }).IsUnique();
                entity.HasIndex(e => e.Status);

                entity.Property(e => e.ReporterName).HasMaxLength(100);
                entity.Property(e => e.Reason).HasMaxLength(50);
                entity.Property(e => e.Details).HasMaxLength(500);
                entity.Property(e => e.Status).HasMaxLength(20);
            });

            // Post Shares
            modelBuilder.Entity<SchoolConnectPostShare>(entity =>
            {
                entity.HasOne(s => s.Post)
                    .WithMany()
                    .HasForeignKey(s => s.PostId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.PostId, e.SharedById });

                entity.Property(e => e.SharedByName).HasMaxLength(100);
                entity.Property(e => e.ShareType).HasMaxLength(20);
            });
        }

        private void ConfigureSettings(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<SchoolSettings>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.SettingKey }).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.Category });
            });

            modelBuilder.Entity<UserSettings>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.SettingKey }).IsUnique();
                entity.HasIndex(e => new { e.UserId, e.Category });
            });

            modelBuilder.Entity<SystemConfiguration>(entity =>
            {
                entity.HasIndex(e => e.ConfigKey).IsUnique();
                entity.HasIndex(e => e.Module);
            });
        }

        private void ConfigurePermissions(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Name }).IsUnique();
            });

            modelBuilder.Entity<Permission>(entity =>
            {
                entity.HasIndex(e => e.Name).IsUnique();
                entity.HasIndex(e => e.Module);
            });

            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasOne(ur => ur.School)
                    .WithMany()
                    .HasForeignKey(ur => ur.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ur => ur.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(ur => ur.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.UserId, e.RoleId });
            });

            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasOne(rp => rp.Role)
                    .WithMany(r => r.RolePermissions)
                    .HasForeignKey(rp => rp.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(rp => rp.Permission)
                    .WithMany(p => p.RolePermissions)
                    .HasForeignKey(rp => rp.PermissionId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
            });
        }

        private void ConfigureFeeConcession(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ConcessionType>(entity =>
            {
                entity.HasOne(ct => ct.School)
                    .WithMany()
                    .HasForeignKey(ct => ct.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Name }).IsUnique();
            });

            modelBuilder.Entity<FeeConcession>(entity =>
            {
                entity.HasOne(fc => fc.School)
                    .WithMany()
                    .HasForeignKey(fc => fc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(fc => fc.ConcessionType)
                    .WithMany()
                    .HasForeignKey(fc => fc.ConcessionTypeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ConcessionNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.StudentId, e.Status });
                entity.HasIndex(e => new { e.SchoolId, e.AcademicYear });
            });
        }

        private void ConfigurePaymentGateway(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PaymentGatewayConfig>(entity =>
            {
                entity.HasOne(pgc => pgc.School)
                    .WithMany()
                    .HasForeignKey(pgc => pgc.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.GatewayName });
            });

            modelBuilder.Entity<GatewayPaymentTransaction>(entity =>
            {
                entity.HasOne(pt => pt.School)
                    .WithMany()
                    .HasForeignKey(pt => pt.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.TransactionId).IsUnique();
                entity.HasIndex(e => e.GatewayTransactionId);
                entity.HasIndex(e => new { e.SchoolId, e.PayerId, e.Status });
                entity.HasIndex(e => new { e.SchoolId, e.PaymentDate });
            });

            modelBuilder.Entity<PaymentRefund>(entity =>
            {
                entity.HasOne(pr => pr.School)
                    .WithMany()
                    .HasForeignKey(pr => pr.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(pr => pr.PaymentTransaction)
                    .WithMany()
                    .HasForeignKey(pr => pr.PaymentTransactionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.RefundId).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });
        }

        private void ConfigurePFESIManagement(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PFESIConfiguration>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Type, e.EffectiveFrom });
            });

            modelBuilder.Entity<PFESIContribution>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.StaffId, e.Month, e.Type }).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });

            modelBuilder.Entity<ComplianceReport>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ReportNumber).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.ReportType, e.Period });
            });
        }

        private void ConfigureOfflineAttendance(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<OfflineAttendanceSession>(entity =>
            {
                entity.HasOne(s => s.School)
                    .WithMany()
                    .HasForeignKey(s => s.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.SessionId).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.DeviceId, e.Status });
            });

            modelBuilder.Entity<OfflineAttendanceRecord>(entity =>
            {
                entity.HasOne(r => r.School)
                    .WithMany()
                    .HasForeignKey(r => r.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Session)
                    .WithMany()
                    .HasForeignKey(r => r.SessionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.SessionId, e.EntityId });
                entity.HasIndex(e => new { e.SyncStatus, e.AttendanceDate });
            });

            modelBuilder.Entity<OfflineDevice>(entity =>
            {
                entity.HasOne(d => d.School)
                    .WithMany()
                    .HasForeignKey(d => d.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.DeviceId }).IsUnique();
                entity.HasIndex(e => new { e.SchoolId, e.AssignedToStaffId });
            });

            modelBuilder.Entity<SyncConflict>(entity =>
            {
                entity.HasOne(c => c.School)
                    .WithMany()
                    .HasForeignKey(c => c.SchoolId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.SchoolId, e.Status });
            });
        }
    }
}


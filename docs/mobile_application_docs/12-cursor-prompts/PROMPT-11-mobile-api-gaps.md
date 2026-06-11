# PROMPT-11: Backend Mobile API Gaps

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: Multiple (backend prerequisites for all mobile prompts)  
> **Owner**: Backend Engineer — runs in parallel with all mobile prompts  
> **Story Points**: 28  
> **Prerequisites**: Existing .NET 8 backend, ASP.NET Core 8, EF Core  
> **Delivers in sprints**: H-1 (Sprint 2) → H-8 (Sprint 14) per the handoff schedule

---

## PHASE 1: Context & Scope

### What We're Building

All 10 missing backend API endpoints that mobile requires. These are delivered in order of urgency — each unblocks specific mobile prompts. Building these endpoints is the backend engineer's primary job during Phases 1–3.

**10 endpoints to build:**

| # | Endpoint | Mobile Unblocks | Sprint |
|---|---|---|---|
| 1 | `GET /api/mobile/app-config` | PROMPT-10 (feature flags) | 2 |
| 2 | `GET /api/mobile/parent-dashboard` | PROMPT-03 (parent dashboard) | 3 |
| 3 | `POST /api/fees/payments/mobile-initiate` | PROMPT-03 (fee payment) | 4 |
| 4 | `POST /api/fees/payments/verify` | PROMPT-03 (payment confirm) | 4 |
| 5 | `GET /api/students?minimal=true` | PROMPT-04 (attendance student list) | 7 |
| 6 | `GET /api/mobile/teacher-dashboard` | PROMPT-04 (teacher dashboard) | 7 |
| 7 | `GET /api/mobile/student-dashboard` | PROMPT-08 (student dashboard) | 9 |
| 8 | `POST /api/notifications/register-device` | PROMPT-05 (push notifications) | 10 |
| 9 | Firebase push delivery integration | PROMPT-05 (push notifications) | 10 |
| 10 | `GET /api/mobile/admin-dashboard` | PROMPT-09 (admin dashboard) | 14 |

### Success Criteria

- [ ] `GET /api/mobile/app-config` responds in < 200ms (Redis cached)
- [ ] Parent dashboard aggregation < 500ms (parallel async queries)
- [ ] Teacher dashboard aggregation < 500ms
- [ ] Student dashboard aggregation < 500ms
- [ ] `GET /api/students?minimal=true` returns < 200 bytes per student
- [ ] Mobile Cashfree initiation returns `paymentSessionId`
- [ ] Firebase push delivery works on physical devices
- [ ] Device registration is idempotent (no duplicates)
- [ ] Idempotency key support on `POST /api/attendance/students/bulk`
- [ ] All new endpoints have Swagger documentation

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/03-api-analysis.md        # API gaps section
docs/mobile_application_docs/07-feature-flag-architecture.md  # app-config response shape
docs/mobile_application_docs/09-push-notification-architecture.md  # Firebase push
```

### Existing Code Audit

```bash
# Verify existing controllers that mobile extends
ls Controllers/
# Key files to extend:
# FeesController.cs — add mobile-initiate endpoint
# StudentsController.cs — add minimal=true support
# NotificationsController.cs — add register-device endpoint

# Check existing service interfaces
grep "INotificationService\|IFeeService\|IStudentService" Services/ -r --include="*.cs" -l

# Check Cashfree integration
ls Services/ | grep -i cashfree
cat Services/CashfreeClient.cs

# Check NuGet packages for Firebase
grep "FirebaseAdmin" SmsApi.csproj
# If not found: dotnet add package FirebaseAdmin
```

---

## PHASE 3: Technical Planning

### New Database Tables (migrations)

```csharp
// Migration: 20260615_AddMobileDeviceTokens
public class MobileDeviceToken : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid SchoolId { get; set; }
    public string DeviceToken { get; set; } = null!;
    public string Platform { get; set; } = null!;    // "android" | "ios"
    public string DeviceId { get; set; } = null!;
    public string AppVersion { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime LastActiveAt { get; set; }
    public DateTime RegisteredAt { get; set; }
}

// Migration: 20260615_AddMobileFeatureFlags
public class MobileFeatureFlag : BaseEntity
{
    public Guid SchoolId { get; set; }
    public string FeatureKey { get; set; } = null!;
    public bool IsEnabled { get; set; }
    public string Scope { get; set; } = "global";
    public string? RoleTarget { get; set; }
    public Guid? UserTarget { get; set; }
    public string? MinAppVersion { get; set; }
    public string? Metadata { get; set; }  // JSON
}

// Migration: 20260615_AddMobileAppConfiguration
public class MobileAppConfiguration : BaseEntity
{
    public Guid SchoolId { get; set; }
    public string? ForceUpdateVersion { get; set; }
    public string MinVersion { get; set; } = "1.0.0";
    public string RecommendedVersion { get; set; } = "1.0.0";
    public bool MaintenanceMode { get; set; }
    public string? MaintenanceMessage { get; set; }
    public string? AndroidStoreUrl { get; set; }
    public string? IosStoreUrl { get; set; }
    public string? SupportEmail { get; set; }
}
```

---

## PHASE 4: Database Design

### Add to AppDbContext

```csharp
// Data/AppDbContext.cs — add DbSets
public DbSet<MobileDeviceToken> MobileDeviceTokens { get; set; }
public DbSet<MobileFeatureFlag> MobileFeatureFlags { get; set; }
public DbSet<MobileAppConfiguration> MobileAppConfigurations { get; set; }
public DbSet<MobileAppBranding> MobileAppBrandings { get; set; }

// Unique constraint on device tokens
modelBuilder.Entity<MobileDeviceToken>()
    .HasIndex(t => new { t.UserId, t.DeviceId })
    .IsUnique();
```

---

## PHASE 5: Backend Implementation

### H-1: GET /api/mobile/app-config (Sprint 2)

```csharp
// Controllers/Mobile/MobileAppConfigController.cs
[ApiController]
[Route("api/mobile")]
[Authorize]
public class MobileAppConfigController : ControllerBase
{
    private readonly IMobileAppConfigService _configService;
    private readonly ITenantContext _tenantContext;

    [HttpGet("app-config")]
    public async Task<IActionResult> GetAppConfig(
        [FromHeader(Name = "X-App-Version")] string? appVersion = null)
    {
        var config = await _configService.GetAppConfigAsync(
            _tenantContext.UserId,
            _tenantContext.SchoolId,
            appVersion ?? "1.0.0"
        );
        return Ok(config);
    }
}
```

```csharp
// Services/Mobile/MobileAppConfigService.cs
public async Task<AppConfigDto> GetAppConfigAsync(Guid userId, Guid schoolId, string appVersion)
{
    var cacheKey = $"mobile_config:{schoolId}:{userId}";
    var cached = await _cacheService.GetAsync<AppConfigDto>(cacheKey);
    if (cached != null) return cached;

    // Parallel data fetch
    var tasks = await Task.WhenAll(
        _schoolService.GetSchoolAsync(schoolId),
        _schoolFeaturePermissionService.GetEnabledModulesAsync(schoolId),
        GetMobileFlagsAsync(schoolId, userId, appVersion),
        GetAppConfigurationAsync(schoolId),
        GetBrandingAsync(schoolId),
        _academicsService.GetCurrentAcademicYearAsync(schoolId),
        _userPermissionsService.GetRolePermissionsAsync(userId)
    );

    var config = new AppConfigDto
    {
        SchoolId = schoolId.ToString(),
        AcademicYear = (string)tasks[5],
        Branding = (SchoolBrandingDto)tasks[4],
        Modules = BuildModuleFlags((IEnumerable<string>)tasks[1]),
        MobileFeatures = (Dictionary<string, bool>)tasks[2],
        RolePermissions = (RolePermissionsDto)tasks[6],
        RemoteConfig = BuildRemoteConfig((MobileAppConfiguration)tasks[3]),
        VersionRequirements = BuildVersionRequirements((MobileAppConfiguration)tasks[3]),
    };

    await _cacheService.SetAsync(cacheKey, config, TimeSpan.FromMinutes(5));
    return config;
}
```

### H-2: GET /api/mobile/parent-dashboard (Sprint 3)

```csharp
[HttpGet("parent-dashboard")]
[Authorize(Roles = "Parent")]
public async Task<IActionResult> GetParentDashboard()
{
    var guardianId = _tenantContext.LinkedEntityId;
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30)); // IST

    var children = await _studentService.GetStudentsByGuardianAsync(guardianId);
    var primaryChild = children.FirstOrDefault();

    object? todayAttendance = null, feeSummary = null, latestResult = null, latestAnnouncement = null;

    if (primaryChild != null)
    {
        // All in parallel
        var results = await Task.WhenAll(
            _attendanceService.GetTodayStatusAsync(primaryChild.Id, today),
            _feeService.GetFeeSummaryAsync(primaryChild.Id, _academicYear),
            _examinationService.GetLatestPublishedResultAsync(primaryChild.Id),
            _announcementService.GetLatestForGuardianAsync(guardianId, primaryChild.ClassId)
        );
        todayAttendance = results[0];
        feeSummary = results[1];
        latestResult = results[2];
        latestAnnouncement = results[3];
    }

    return Ok(new
    {
        children = children.Select(c => new { c.Id, c.FullName, c.PhotoUrl, c.ClassName, c.SectionName, c.RollNumber }),
        selectedChildId = primaryChild?.Id,
        todayAttendance,
        feeSummary,
        latestResult,
        latestAnnouncement,
        unreadNotificationCount = await _notificationService.GetUnreadCountAsync(_tenantContext.UserId)
    });
}
```

### H-3+H-4: Mobile Payment Endpoints (Sprint 4)

```csharp
[HttpPost("fees/payments/mobile-initiate")]
[Authorize(Roles = "Parent,Student")]
public async Task<IActionResult> MobileInitiatePayment([FromBody] MobilePaymentInitRequest request)
{
    // Security: verify student belongs to parent
    if (_tenantContext.Role == "Parent")
    {
        var isAuthorized = await _parentAuthorizationService
            .CanAccessStudentAsync(_tenantContext.UserId, request.StudentId);
        if (!isAuthorized) return Forbid();
    }

    var order = await _paymentGatewayService.CreateCashfreeOrderAsync(
        request.StudentId, request.Amount, "Student Fee Payment"
    );

    return Ok(new
    {
        cfOrderId = order.OrderId,
        paymentSessionId = order.PaymentSessionId,  // Used by Cashfree RN SDK
        amount = request.Amount,
        currency = "INR",
        expiresAt = DateTime.UtcNow.AddMinutes(30)
    });
}

[HttpPost("fees/payments/verify")]
[Authorize(Roles = "Parent,Student")]
public async Task<IActionResult> VerifyMobilePayment([FromBody] PaymentVerifyRequest request)
{
    var payment = await _paymentGatewayService.VerifyAndRecordPaymentAsync(
        request.CfOrderId, request.CfPaymentId
    );
    return Ok(new
    {
        status = payment.Status,
        paymentId = payment.Id,
        receiptNumber = payment.ReceiptNumber,
        amount = payment.Amount
    });
}
```

### H-5: GET /api/students?minimal=true (Sprint 7)

```csharp
// Add to StudentsController
[HttpGet]
public async Task<IActionResult> GetStudents(
    [FromQuery] string? classId,
    [FromQuery] bool minimal = false,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 50)
{
    if (minimal && !string.IsNullOrEmpty(classId))
    {
        // Returns ONLY: id, firstName, lastName, rollNumber, profilePhotoUrl
        // Response per student: ~150 bytes (not ~2KB for full profile)
        var minimalStudents = await _studentService.GetMinimalByClassAsync(
            classId, page, pageSize
        );
        return Ok(minimalStudents);
    }
    // ... existing full response
}
```

### H-6: GET /api/mobile/teacher-dashboard (Sprint 7)

```csharp
[HttpGet("teacher-dashboard")]
[Authorize(Roles = "Teacher,Staff,Principal,Admin")]
public async Task<IActionResult> GetTeacherDashboard()
{
    var teacherId = _tenantContext.LinkedEntityId;
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30));

    var (schedule, assignments, pendingLeaves, classStatuses, unreadCount) = await (
        _timetableService.GetTeacherScheduleAsync(teacherId, today),
        _assignmentService.GetPendingGradingCountAsync(teacherId),
        _leaveManagementService.GetPendingForTeacherAsync(teacherId),
        _attendanceService.GetTeacherClassAttendanceStatusAsync(teacherId, today),
        _notificationService.GetUnreadCountAsync(_tenantContext.UserId)
    );

    return Ok(new
    {
        todaySchedule = schedule,
        pendingLeaveCount = pendingLeaves.Count,
        pendingGradingCount = assignments,
        classesStatus = classStatuses,
        unreadNotificationCount = unreadCount
    });
}
```

### H-7: GET /api/mobile/student-dashboard (Sprint 9)

```csharp
[HttpGet("student-dashboard")]
[Authorize(Roles = "Student")]
public async Task<IActionResult> GetStudentDashboard()
{
    var studentId = _tenantContext.LinkedEntityId;
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30));

    var student = await _studentService.GetAsync(studentId);

    var (schedule, attendance, latestResult, dueSoon, unreadCount) = await (
        _timetableService.GetClassScheduleAsync(student.ClassId, today),
        _attendanceService.GetMonthSummaryAsync(studentId, today.Month, today.Year),
        _examinationService.GetLatestPublishedResultAsync(studentId),
        _assignmentService.GetDueSoonForStudentAsync(studentId, days: 7),
        _notificationService.GetUnreadCountAsync(_tenantContext.UserId)
    );

    return Ok(new
    {
        todaySchedule = schedule,
        attendanceThisMonth = attendance,
        latestResult,
        dueSoonAssignments = dueSoon.Select(a => new { a.Id, a.Title, a.DueDate, a.SubjectName }),
        unreadNotificationCount = unreadCount
    });
}
```

### H-8: Device Registration + Firebase Push (Sprint 10)

```csharp
// Register device token
[HttpPost("notifications/register-device")]
[Authorize]
public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest request)
{
    var existing = await _dbContext.MobileDeviceTokens
        .FirstOrDefaultAsync(t =>
            t.UserId == _tenantContext.UserId && t.DeviceId == request.DeviceId);

    if (existing != null)
    {
        existing.DeviceToken = request.NativeToken;
        existing.AppVersion = request.AppVersion;
        existing.IsActive = true;
        existing.LastActiveAt = DateTime.UtcNow;
        existing.UpdatedAt = DateTime.UtcNow;
    }
    else
    {
        _dbContext.MobileDeviceTokens.Add(new MobileDeviceToken
        {
            UserId = _tenantContext.UserId,
            SchoolId = _tenantContext.SchoolId,
            DeviceToken = request.NativeToken,
            Platform = request.Platform,
            DeviceId = request.DeviceId,
            AppVersion = request.AppVersion,
            IsActive = true,
            RegisteredAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
        });
    }

    await _dbContext.SaveChangesAsync();
    return Ok(new { message = "Device registered" });
}
```

```csharp
// Program.cs — Initialize Firebase
// Add package: dotnet add package FirebaseAdmin
var firebaseCredentialPath = builder.Configuration["Firebase:ServiceAccountJsonPath"];
if (!string.IsNullOrEmpty(firebaseCredentialPath) && File.Exists(firebaseCredentialPath))
{
    FirebaseApp.Create(new AppOptions
    {
        Credential = GoogleCredential.FromFile(firebaseCredentialPath)
    });
    builder.Services.AddSingleton(FirebaseMessaging.DefaultInstance);
}
```

```csharp
// Extend existing NotificationService.CreateNotificationAsync
private async Task TryPushAsync(Guid userId, NotificationType type, string title, string body,
    Dictionary<string, string>? data = null, string? notificationId = null)
{
    // Check preferences
    var preference = await _dbContext.UserNotificationPreferences
        .FirstOrDefaultAsync(p => p.UserId == userId && p.NotificationType == type.ToString());
    if (preference?.PushEnabled == false) return;

    // Get active device tokens
    var tokens = await _dbContext.MobileDeviceTokens
        .Where(t => t.UserId == userId && t.IsActive)
        .ToListAsync();

    foreach (var token in tokens)
    {
        try
        {
            var message = new Message
            {
                Token = token.DeviceToken,
                Notification = new Notification { Title = title, Body = body },
                Data = new Dictionary<string, string>(data ?? new())
                {
                    ["notificationType"] = type.ToString(),
                    ["notificationId"] = notificationId ?? "",
                    ["priority"] = GetPriorityString(type),
                },
                Android = new AndroidConfig { Priority = AndroidMessagePriority.High },
                Apns = new ApnsConfig
                {
                    Aps = new Aps { Sound = "default", Badge = 1 }
                },
            };

            await FirebaseMessaging.DefaultInstance.SendAsync(message);
        }
        catch (FirebaseMessagingException ex)
            when (ex.MessagingErrorCode == MessagingErrorCode.Unregistered
               || ex.MessagingErrorCode == MessagingErrorCode.InvalidArgument)
        {
            token.IsActive = false;
            await _dbContext.SaveChangesAsync();
        }
    }
}
```

### Idempotency Key Support

```csharp
// Add IdempotencyFilter or handle in AttendanceController.BulkMark
[HttpPost("attendance/students/bulk")]
public async Task<IActionResult> BulkMarkAttendance(
    [FromBody] BulkAttendanceRequest request,
    [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey = null)
{
    if (!string.IsNullOrEmpty(idempotencyKey))
    {
        var cacheKey = $"attendance_idempotency:{idempotencyKey}";
        var existing = await _cacheService.GetAsync<object>(cacheKey);
        if (existing != null)
        {
            return Ok(existing); // Return cached response — no duplicate write
        }
    }

    var result = await _attendanceService.BulkMarkAsync(request, _tenantContext.UserId);

    if (!string.IsNullOrEmpty(idempotencyKey))
    {
        await _cacheService.SetAsync($"attendance_idempotency:{idempotencyKey}", result, TimeSpan.FromHours(24));
    }

    return Ok(result);
}
```

### H-10: GET /api/mobile/admin-dashboard (Sprint 14)

```csharp
[HttpGet("admin-dashboard")]
[Authorize(Roles = "Admin,Principal")]
public async Task<IActionResult> GetAdminDashboard()
{
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30));

    var (attendanceStats, feeStats, pendingLeaves, billingInfo, unreadCount) = await (
        _attendanceService.GetSchoolWideStatsAsync(_tenantContext.SchoolId, today),
        _feeService.GetCollectionStatsAsync(_tenantContext.SchoolId, today),
        _leaveManagementService.GetAllPendingCountAsync(_tenantContext.SchoolId),
        _schoolBillingService.GetBillingStatusAsync(_tenantContext.SchoolId),
        _notificationService.GetUnreadCountAsync(_tenantContext.UserId)
    );

    string? billingAlert = null;
    if (billingInfo?.ExpiryDate != null)
    {
        var daysLeft = (billingInfo.ExpiryDate.Value - DateTime.UtcNow).Days;
        if (daysLeft <= 30)
            billingAlert = daysLeft <= 0
                ? "Subscription expired. Please renew."
                : $"Subscription expires in {daysLeft} day(s).";
    }

    return Ok(new
    {
        todayAttendanceRate = attendanceStats.AttendancePercent,
        markedClasses = attendanceStats.MarkedCount,
        totalClasses = attendanceStats.TotalCount,
        todayFeeCollection = feeStats.TodayAmount,
        monthFeeCollection = feeStats.MonthAmount,
        pendingApprovals = pendingLeaves,
        billingAlert,
        unreadNotificationCount = unreadCount
    });
}
```

---

## PHASE 6: (Mobile) No mobile changes in this prompt.

---

## PHASE 9: Testing

```bash
# Integration tests for all new endpoints
# Run after applying migrations:
dotnet ef database update

# Test with demo school:
curl -X GET https://api.vitanasms.com/api/mobile/app-config \
  -H "Authorization: Bearer $(login demo.parent)" \
  | jq '.data.modules'

curl -X GET https://api.vitanasms.com/api/mobile/parent-dashboard \
  -H "Authorization: Bearer $(login demo.parent)" \
  | jq '.data | keys'

# Test idempotency:
IDEM_KEY=$(uuidgen)
curl -X POST https://api.vitanasms.com/api/attendance/students/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $IDEM_KEY" \
  -d '{"classId":"...","date":"2026-06-10","records":[]}' # First call
# Second call with same key should return same response without duplicate writes
```

### Validation Checklist

- [ ] `GET /api/mobile/app-config` < 200ms (Redis cached after first call)
- [ ] Parent dashboard < 500ms (all parallel queries)
- [ ] `GET /api/students?minimal=true` returns id, firstName, lastName, rollNumber, photoUrl only
- [ ] Cashfree mobile-initiate returns `paymentSessionId`
- [ ] Device registration idempotent (call twice → one row in DB)
- [ ] Invalid FCM token → `IsActive = false` in DB after push attempt
- [ ] Idempotency key: same key twice → same response, no duplicate attendance record
- [ ] All endpoints have Swagger docs
- [ ] All endpoints return correct 403 when role doesn't have access

---

## PHASE 10: Documentation & Verification

### Migration Commands

```bash
# Run migrations in order
dotnet ef migrations add AddMobileDeviceTokens
dotnet ef migrations add AddMobileFeatureFlags
dotnet ef migrations add AddMobileAppConfiguration
dotnet ef migrations add AddMobileAppBranding
dotnet ef database update

# Verify tables exist
dotnet ef dbcontext info
```

### Git Commit

```bash
git add .
git commit -m "feat(backend/mobile): implement 10 mobile API endpoints

- GET /api/mobile/app-config (Redis 5min cache, role-aware)
- GET /api/mobile/parent-dashboard (parallel aggregation < 500ms)
- POST /api/fees/payments/mobile-initiate (Cashfree session)
- POST /api/fees/payments/verify (Cashfree webhook confirm)
- GET /api/students?minimal=true (150 bytes/student)
- GET /api/mobile/teacher-dashboard
- GET /api/mobile/student-dashboard
- POST /api/notifications/register-device (idempotent)
- Firebase Admin SDK + push delivery in NotificationService
- GET /api/mobile/admin-dashboard
- Idempotency key support on POST /api/attendance/students/bulk
- Migrations: MobileDeviceTokens, MobileFeatureFlags, MobileAppConfiguration, MobileAppBranding

Delivers: H-1 through H-8 handoffs to mobile team"
```

---

**END OF PROMPT-11**

# Coding Agent Guidelines — SMS API

**Framework:** ASP.NET Core 8 · .NET 8 | **Last Updated:** May 25, 2026 (Session 11)  
**Status:** Production Release Candidate

This is the primary instruction set for AI coding agents and developers performing bug fixes, maintenance, and feature work. Follow these architectural patterns to maintain code quality and system integrity.

---

## 0. AI Support First-Read (Before Any Edit)

For quick support tasks, read these in order:

1. `docs/AI_SUPPORT_RUNBOOK.md` (latest triage playbook)
2. `docs/TECHNICAL_DOCUMENT.md` (latest session changelog)
3. `docs/MODULE_STATUS.md` (module readiness and constraints)

### High-impact current behaviors (must preserve)

- Unified login UX is role-first (Admin/Staff/Parent) in `ui/src/pages/Login.tsx`.
- Super admin remains a dedicated entry route (`/super-admin-login`).
- Pre-login branding is provided by anonymous `GET /api/settings/public-branding`.
- `SchoolContext` caches branding (`school_branding_cache`) and falls back safely.
- Finance aggregated income must exclude petty cash.

### Non-negotiables for AI edits

1. Keep RBAC enforcement server-side (`[Authorize]`, role claims, tenant filters).
2. Do not treat UI role selection as a security boundary.
3. Avoid tenant-specific literals (for example, hardcoded school codes/domains) in comments or docs.
4. After login/branding edits, verify both `/login` and `/super-admin-login` flows.
5. After finance aggregation edits, verify backend + UI totals match.

---

## 1. Multi-Tenancy & Soft Delete (Secure-by-Default)

All entities use **EF Core Global Query Filters** in `AppDbContext` to enforce security automatically.

### The Golden Rules

```csharp
// ❌ WRONG: Manual filtering
var students = await _context.Students
    .Where(x => x.SchoolId == schoolId)  // Don't do this — filter already applied
    .Where(x => !x.IsDeleted)             // Don't do this — filter already applied
    .ToListAsync();

// ✅ CORRECT: Automatic filtering
var students = await _context.Students
    .AsNoTracking()  // Performance optimization for reads
    .ToListAsync();
// Global filters automatically applied based on ITenantContext
```

### Why This Matters

- **Single source of truth:** Filters defined once in `Data/AppDbContext.cs`
- **Data leakage prevention:** Impossible to accidentally expose another school's data
- **Soft delete enforcement:** Deleted records never visible without explicit override

### Implementation Details

**File:** `Data/AppDbContext.cs`

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    foreach (var entityType in modelBuilder.Model.GetEntityTypes())
    {
        if (entityType.ClrType.GetProperty("SchoolId") != null)
        {
            // Multi-tenancy: auto-filter by current school
            entityType.SetQueryFilter(/* lambda scoped to _tenant.SchoolId */);
        }
        if (entityType.ClrType.IsAssignableTo(typeof(BaseEntity)))
        {
            // Soft delete: auto-exclude IsDeleted == true
            entityType.SetQueryFilter(e => EF.Property<bool>(e, "IsDeleted") == false);
        }
    }
}
```

### When to Override Filters

```csharp
// ✅ ALLOWED: SuperAdmin viewing cross-school data
var allStudents = await _context.Students
    .IgnoreQueryFilters()  // Explicit override — SuperAdmin feature only
    .AsNoTracking()
    .ToListAsync();

// ✅ ALLOWED: Restore a soft-deleted record (admin function)
var deleted = await _context.Students
    .IgnoreQueryFilters()
    .FirstOrDefaultAsync(s => s.Id == id && s.IsDeleted);
```

---

## 2. Environment-Aware Configuration

The application switches behavior based on `ASPNETCORE_ENVIRONMENT`.

### Supported Environments

| Environment | Purpose | Database | Redis | HTTPS |
|---|---|---|---|---|
| **Development** | Local dev | SQLite / PostgreSQL (local) | Disabled | ❌ |
| **Testing** | Integration tests | In-Memory (EF Core) | Disabled | ❌ |
| **Production** | Live system | PostgreSQL (managed) | Enabled | ✅ |

### Configuration Priority

```
Environment Variables  (Highest)
    ↓
appsettings.{Environment}.json
    ↓
appsettings.json  (Base)
    ↓
Code Defaults  (Lowest)
```

### Key Config Files

| File | Purpose |
|---|---|
| `appsettings.json` | Base configuration — safe defaults |
| `appsettings.Development.json` | Local overrides |
| `appsettings.Production.json` | Production stub — real secrets via env vars |

**Never store real secrets in `appsettings.Production.json`.** Use environment variables.

---

## 3. Service Layer Patterns

### Read Operations

```csharp
// ✅ CORRECT: AsNoTracking for performance on reads
public async Task<StudentDto> GetStudentAsync(Guid id)
{
    return await _context.Students
        .AsNoTracking()
        .Include(s => s.Person)
        .Where(s => s.Id == id)
        .Select(s => new StudentDto
        {
            Id = s.Id,
            Name = s.Person.FirstName + " " + s.Person.LastName
        })
        .FirstOrDefaultAsync();
}
```

### Write Operations

```csharp
// ✅ CORRECT: Use transactions for multi-entity writes
public async Task<StudentDto> CreateStudentWithLoginAsync(CreateStudentRequest request)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        var person = new Person { FirstName = request.FirstName, Email = request.Email };
        _context.People.Add(person);
        await _context.SaveChangesAsync();

        var student = new Student { PersonId = person.Id };
        // Do NOT set SchoolId — global filter applies it automatically
        _context.Students.Add(student);
        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
        return MapToDto(student);
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### Audit Tracking

```csharp
// ✅ CORRECT: Use ITenantContext for audit trail
student.ModifiedBy = _tenant.UserId;
student.ModifiedAt = DateTime.UtcNow;
```

---

## 4. API Controller Patterns

### Standard Controller Structure

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _service;
    private readonly IValidator<CreateStudentRequest> _validator;

    public StudentsController(IStudentService service, IValidator<CreateStudentRequest> validator)
    {
        _service = service;
        _validator = validator;
    }

    // GET: Paginated list
    [HttpGet]
    [ProducesResponseType(typeof(ApiEnvelope<StudentListResponse>), 200)]
    public async Task<IActionResult> GetStudents([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _service.GetStudentsAsync(page, pageSize);
        return Ok(new ApiEnvelope<StudentListResponse> { Success = true, Data = result });
    }

    // GET: Single by ID
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiEnvelope<StudentDto>), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 404)]
    public async Task<IActionResult> GetStudent(Guid id)
    {
        var result = await _service.GetStudentAsync(id);
        if (result == null) return NotFound();
        return Ok(new ApiEnvelope<StudentDto> { Success = true, Data = result });
    }

    // POST: Create
    [HttpPost]
    [ProducesResponseType(typeof(ApiEnvelope<StudentDto>), 201)]
    [ProducesResponseType(typeof(ProblemDetails), 400)]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Message = "Validation failed",
                Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }).ToList()
            });

        var result = await _service.CreateStudentAsync(request);
        return CreatedAtAction(nameof(GetStudent), new { id = result.Id },
            new ApiEnvelope<StudentDto> { Success = true, Data = result });
    }

    // DELETE: Soft delete
    [HttpDelete("{id}")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> DeleteStudent(Guid id)
    {
        await _service.DeleteStudentAsync(id);
        return NoContent();
    }
}
```

### API Response Envelope

All endpoints return a consistent `ApiEnvelope<T>`:
```json
{
  "success": true,
  "data": { ... },
  "message": null,
  "errors": null
}
```

---

## 5. Error Handling

### Middleware Exception Handler

**File:** `Middleware/ErrorHandlingMiddleware.cs`

All unhandled exceptions are automatically converted to RFC 7807 `ProblemDetails`. **Do not wrap entire service methods in try-catch.**

```csharp
// ❌ WRONG: Swallowing exceptions
try { /* code */ }
catch (Exception ex) { return BadRequest(ex.Message); }

// ✅ CORRECT: Throw typed exceptions; middleware handles them
if (student == null)
    throw new NotFoundException($"Student {id} not found");
```

---

## 6. Validation

Use **FluentValidation** for all request DTOs.

```csharp
public class CreateStudentValidator : AbstractValidator<CreateStudentRequest>
{
    public CreateStudentValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.DateOfBirth)
            .Must(dob => dob < DateTime.UtcNow.AddYears(-5))
            .WithMessage("Student must be at least 5 years old");
        RuleFor(x => x.AadhaarNumber)
            .Must(AadhaarValidator.IsValid)
            .WithMessage("Invalid Aadhaar number");
    }
}
```

Validators are registered via DI in `Program.cs`:
```csharp
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
```

---

## 7. Testing Guidelines

### Unit Tests — `SmsApi.Tests/`

```csharp
// ✅ Test business logic in isolation (no DB, no HTTP)
public class StudentServiceTests
{
    private readonly Mock<IAppDbContext> _contextMock = new();
    private readonly StudentService _service;

    public StudentServiceTests()
    {
        _service = new StudentService(_contextMock.Object);
    }

    [Fact]
    public async Task CreateStudent_ValidRequest_ReturnsDto()
    {
        // Arrange + Act + Assert (AAA pattern)
        var result = await _service.CreateStudentAsync(new CreateStudentRequest { FirstName = "John" });
        result.Should().NotBeNull();
    }
}
```

### Integration Tests — `SmsApi.IntegrationTests/`

```csharp
// ✅ Test through full HTTP pipeline with in-memory DB
public class StudentsIntegrationTests : IClassFixture<SmsApiFactory>, IAsyncLifetime
{
    private readonly HttpClient _client;
    private string _adminToken = string.Empty;

    public StudentsIntegrationTests(SmsApiFactory factory) => _client = factory.CreateClient();

    public async Task InitializeAsync()
    {
        await _factory.SeedTestDataAsync();
        _adminToken = await AuthHelper.GetAdminTokenAsync(_client);
        AuthHelper.SetBearerToken(_client, _adminToken);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetStudents_NoToken_Returns401()
    {
        var response = await _client.GetAsync("/api/Students");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

See [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) for known issues with JWT in integration tests.

---

## 8. Git & Commit Standards

### Branch Naming

```
feature/student-bulk-import
bugfix/leave-balance-calculation
chore/update-nuget-packages
docs/api-reference-update
```

### Commit Messages

```
feat: add student bulk import endpoint
fix: correct leave balance calculation for carry-forward
docs: update API reference for fees module
test: add unit tests for payroll service
refactor: simplify attendance entity mapping
```

### Pull Request Checklist

- [ ] `dotnet build` succeeds with zero warnings
- [ ] `dotnet test SmsApi.Tests` — all 724 tests pass
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations created if schema changed
- [ ] Security checklist reviewed (see Section 10)
- [ ] Relevant documentation updated

---

## 9. Common Pitfalls

| Pitfall | ❌ Wrong | ✅ Correct |
|---------|---------|-----------|
| **Manual tenant filter** | `.Where(x => x.SchoolId == id)` | Remove it — global filter applied |
| **No tracking on reads** | `.ToListAsync()` | `.AsNoTracking().ToListAsync()` |
| **Missing transaction** | Two separate `SaveChangesAsync()` calls | `BeginTransactionAsync()` wrapper |
| **Hardcoding SchoolId** | `new Student { SchoolId = tenantId }` | Omit SchoolId — filter applies it |
| **Catching all exceptions** | `catch (Exception ex) { return BadRequest(); }` | Let middleware handle it |
| **N+1 queries** | Loop + lazy load | `.Include()` upfront |
| **Secrets in config** | `"Secret": "my-real-secret"` in appsettings.Production.json | Environment variable |
| **Role claim comparison** | `role is "admin"` | `role.ToLowerInvariant() is "admin"` — JWT stores title-case (`"Admin"`, `"Teacher"`) |
| **UserLogin.Id as StaffMember.Id** | `TeacherAssignment.StaffId == GetUserId()` | Resolve via email: `StaffMembers.Where(s => s.Email == userEmail)` — `UserLogin.Id ≠ StaffMember.Id` |
| **FK violation on EnteredByStaffId** | Store `UserLogin.Id` | Store resolved `StaffMember.Id` (nullable for admins who have no StaffMember row) |
| **Parent lookup via Guardians table** | `_context.Guardians` / `_context.GuardianStudents` | These tables are empty legacy tables. Use `from sg in _context.StudentGuardians join ul in _context.UserLogins on sg.Email equals ul.Email` |
| **Parent notification RecipientId** | Store student ID or guardian name | Store `UserLogins.Id` (the login record of the parent). `Notifications.RecipientId = UserLogin.Id` |
| **Staff deactivation — UserLogin sync** | Update only `StaffMember.Status` | Always also update `UserLogin.Status = "inactive"` + clear `RefreshTokenHash`/`RefreshTokenExpiry`. Use `LinkedEntityId`-first lookup: `UserLogins.Where(u => u.LinkedEntityId == staffId && u.LinkedEntityType == "staff")`. Email fallback only if `LinkedEntityId` is null. |
| **Staff login guard** | Trust only `UserLogin.Status` for staff roles | Query `StaffMember.Status` live at login (same as parent guard). A stale `UserLogin.Status` must not let an inactive staff member in. Pattern in `AuthController.Login` and `OnTokenValidated`. |
| **Fee structural override vs concession** | Call `inline-discount` to exempt a student from Library Fee | Use `PATCH /fees/records/{id}/fee-head-overrides` with `Overrides: {"libraryFee": 0}`. This reduces `TotalAmount` directly. `DiscountAmount` must stay for concessions/waivers only. Mixing them corrupts reports. |
| **FeeRecord fields — do not confuse** | Treat `DiscountAmount` as "total fee reduction" | `TotalAmount` = gross minus fee-head overrides. `DiscountAmount` = concession/waiver only. `PendingAmount` = `TotalAmount + LateFeeAmount − PaidAmount − DiscountAmount`. All three are distinct. |
| **Fee dialog — stale prop** | Read from the `record` prop passed into the fee dialog | Use `activeRecord = liveRecord ?? record`. After any fee operation, `liveRecord` is refreshed via `getFeeRecordById`; `record` is never mutated. Reading `record.*` after an operation shows stale data. |
| **Empty EF migration after model change** | Run `dotnet ef migrations add` immediately | Always `dotnet build SmsApi.csproj` first. The migrations tool uses the compiled assembly; if the binary is stale it produces an empty `Up()`. Manually write the SQL if the migration came out empty. |

---

## 10. Security Checklist

Before committing any code, verify:

- [ ] **Authentication:** All new endpoints decorated with `[Authorize]`
- [ ] **Authorization:** Role checks with `[Authorize(Roles = "Admin")]` where applicable
- [ ] **Input validation:** FluentValidation on all POST/PUT request bodies
- [ ] **Soft delete:** Deleted records not visible without `IgnoreQueryFilters()`
- [ ] **Tenant isolation:** Cannot query another school's data
- [ ] **Rate limiting:** Auth endpoints are rate-limited
- [ ] **CORS:** Only configured origins are permitted
- [ ] **JWT secrets:** From environment variables, never in source code
- [ ] **PII masking:** Aadhaar, PAN, phone numbers masked in logs

---

## 11. Project File Locations (Quick Reference)

| Component | Path |
|-----------|------|
| Main project | `SmsApi.csproj` |
| Entry point | `Program.cs` |
| DB context | `Data/AppDbContext.cs` |
| Controllers | `Controllers/` |
| Services | `Services/` |
| Models | `Models/` |
| Migrations | `Migrations/` |
| Middleware | `Middleware/` |
| Validators | `Validators/` |
| Infrastructure | `Infrastructure/` |
| Unit tests | `SmsApi.Tests/` |
| Integration tests | `SmsApi.IntegrationTests/` |
| Frontend (React 19) | `ui/` |
| Docker config | `Dockerfile`, `docker-compose.yml` |

---

## 12. When to Escalate

| Situation | Action |
|-----------|--------|
| Need to override global filter | Verify SuperAdmin requirement; use `IgnoreQueryFilters()` explicitly |
| Adding a new environment | Update `appsettings.{Env}.json` and `Program.cs` environment checks |
| JWT validation failing in tests | See [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) — known issue |
| Migration fails | Check for conflicting scaffold operations; try `dotnet ef database drop` on dev |
| Security concern | Review [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md) and OWASP Top 10 |
| Unknown module behaviour | See [FUNCTIONAL_DOCUMENT.md](./FUNCTIONAL_DOCUMENT.md) |

---

**Last Updated:** May 16, 2026 (Session 7) | **Project:** SMSRepoA (Release Candidate)  
**For architecture details:** [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md)  
**For deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

# Testing Infrastructure — SMS API

**Last Updated:** May 8, 2026 | **Status:** 724 Unit Tests Passing | **Project:** SMSRepoA  
**.NET:** 8.0 | **Framework:** xUnit 2.9.2 + Moq + FluentAssertions

---

## Test Coverage Summary

| Layer | Location | Tests | Status |
|-------|----------|-------|--------|
| **Unit Tests** | `SmsApi.Tests/` | 724 | ✅ All passing |
| **Integration Tests** | `SmsApi.IntegrationTests/` | 8/26 passing | 🟡 Partial (JWT issue — see below) |
| **E2E Tests** | Playwright (planned) | — | ⏳ Not yet implemented |

---

## Running Tests

### All Unit Tests

```bash
# From project root
dotnet test SmsApi.Tests

# With detailed output
dotnet test SmsApi.Tests --logger "console;verbosity=detailed"

# With coverage
dotnet test SmsApi.Tests --collect:"XPlat Code Coverage" --results-directory "TestResults/Coverage"
```

### All Integration Tests

```bash
dotnet test SmsApi.IntegrationTests

# Run specific test by name
dotnet test SmsApi.IntegrationTests --filter "HealthEndpoint"

# Run seeding tests only
dotnet test SmsApi.IntegrationTests --filter "Seeding"
```

### All Tests

```bash
dotnet test
```

Expected result: **724 unit tests passing, 8 integration tests passing.**

---

## Unit Test Architecture — `SmsApi.Tests/`

Unit tests isolate business logic from infrastructure (no database, no HTTP).

### Pattern

```csharp
public class StudentServiceTests
{
    private readonly Mock<IAppDbContext> _contextMock = new();
    private readonly Mock<ITenantContext> _tenantMock = new();
    private readonly StudentService _service;

    public StudentServiceTests()
    {
        _tenantMock.Setup(t => t.SchoolId).Returns(1);
        _service = new StudentService(_contextMock.Object, _tenantMock.Object);
    }

    [Fact]
    public async Task GetStudent_ValidId_ReturnsDto()
    {
        // Arrange
        var student = new Student { Id = Guid.NewGuid(), FirstName = "John" };
        _contextMock.Setup(/* ... */);

        // Act
        var result = await _service.GetStudentAsync(student.Id);

        // Assert
        result.Should().NotBeNull();
        result.FirstName.Should().Be("John");
    }

    [Fact]
    public async Task GetStudent_InvalidId_ThrowsNotFoundException()
    {
        // Arrange
        _contextMock.Setup(/* returns null */);

        // Act
        Func<Task> act = () => _service.GetStudentAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```

### Covered Modules (724 tests)

| Module | Tests |
|--------|-------|
| Staff Login (Attendance, Academics, Leave, Communication, Payroll, Assignments) | ~285 |
| Student Management | ~120 |
| Fee Management | ~95 |
| Exam / Marks | ~80 |
| Admission | ~60 |
| Auth / JWT | ~45 |
| Utilities / Validators | ~39 |

---

## Integration Test Architecture — `SmsApi.IntegrationTests/`

Integration tests fire real HTTP requests through the full ASP.NET Core pipeline, using an in-memory EF Core database.

### WebApplicationFactory (`SmsApiFactory`)

**File:** `SmsApi.IntegrationTests/Infrastructure/SmsApiFactory.cs`

```
┌──────────────────────────────────────────────────┐
│       WebApplicationFactory<Program>              │
│  (Real middleware, DI, authentication pipeline)  │
├──────────────────────────────────────────────────┤
│  In-Memory EF Core Database (per test class)     │
│  - Unique _databaseName per factory instance     │
│  - Replaces PostgreSQL automatically             │
├──────────────────────────────────────────────────┤
│  appsettings.Testing.json overrides              │
│  - JWT secret                                    │
│  - Rate limiting: 100× dev limits                │
│  - HTTPS redirect: disabled                      │
│  - Redis: disabled (in-memory)                   │
└──────────────────────────────────────────────────┘
```

```csharp
public class SmsApiFactory : WebApplicationFactory<Program>
{
    public static readonly Guid TestSchoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");
    public const string AdminUsername = "admin@vitanaschools.edu";
    public const string AdminPassword  = "Admin1234!";

    private readonly string _databaseName = $"SmsTest_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // Replace PostgreSQL with in-memory DB
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);
            services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase(_databaseName));
        });
    }

    public async Task SeedTestDataAsync() { /* creates School + Admin user */ }
}
```

### Tests That Pass (8/26)

| Test | File | Status |
|------|------|--------|
| `SchoolIsSeeded` | `SeedingTests.cs` | ✅ |
| `AdminUserIsSeeded` | `SeedingTests.cs` | ✅ |
| `AdminPasswordHashIsValid` | `SeedingTests.cs` | ✅ |
| `HealthEndpoint_Returns200` | `StudentsIntegrationTests.cs` | ✅ |
| `GetStudents_NoToken_Returns401` | `StudentsIntegrationTests.cs` | ✅ |
| `GetStudents_InvalidToken_Returns401` | `StudentsIntegrationTests.cs` | ✅ |
| `CreateStudent_NoToken_Returns401` | `StudentsIntegrationTests.cs` | ✅ |
| *(1 more auth guard test)* | `StudentsIntegrationTests.cs` | ✅ |

### Known Issue: 18 Tests Fail (JWT Token Rejection)

**Root cause:** `Program.cs` configures JWT middleware with production secret before the `WebApplicationFactory.ConfigureWebHost()` hook runs. Bearer tokens generated inside tests are rejected.

**Symptom:**
```
Login → 200 OK (token generated) ✅
POST /api/Students with Bearer token → 401 in 6ms ❌
```

**Affected:** All authenticated CRUD tests (18 tests).

**Workaround options:**

| Option | Status |
|--------|--------|
| Accept 8/26 passing; use unit tests for business logic | ✅ Current approach |
| Playwright E2E tests (full browser, bypasses JWT factory issue) | ⏳ Planned |
| Refactor `Program.cs` to defer JWT configuration | 🔧 Complex — future work |

---

## Integration Test File Structure

```
SmsApi.IntegrationTests/
├── Infrastructure/
│   ├── SmsApiFactory.cs           # WebApplicationFactory + seeding
│   ├── AuthHelper.cs              # Token generation helpers
│   └── TestData.cs                # Shared test data constants
└── Students/
    ├── SeedingTests.cs            # ✅ 3/3 passing
    └── StudentsIntegrationTests.cs # 🟡 5/23 passing (auth guard + health)
```

---

## Integration Test Template

Copy this for new modules:

```csharp
using SmsApi.IntegrationTests.Infrastructure;
using Xunit;

namespace SmsApi.IntegrationTests.YourModule;

public class YourModuleTests : IClassFixture<SmsApiFactory>, IAsyncLifetime
{
    private readonly SmsApiFactory _factory;
    private readonly HttpClient _client;
    private string _adminToken = string.Empty;

    public YourModuleTests(SmsApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.SeedTestDataAsync();
        _adminToken = await AuthHelper.GetAdminTokenAsync(_client);
        AuthHelper.SetBearerToken(_client, _adminToken);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Get_NoToken_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/YourEndpoint");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

---

## Troubleshooting

### Tests timeout

```bash
# Increase timeout
dotnet test SmsApi.IntegrationTests -- RunConfiguration.TestTimeout=30000
```

### PostgreSQL already exists error

```bash
# Drop and recreate dev database
dropdb sms_dev
createdb sms_dev
dotnet ef database update
```

### 401 on authenticated test requests

This is the known JWT factory issue. See the "Known Issue" section above. Verify unit tests cover the business logic instead.

### Rate limiting (429) in tests

Ensure `appsettings.Testing.json` exists in the project root and has rate limits set to 100× production values.

---

**Related:** [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md) | [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md)

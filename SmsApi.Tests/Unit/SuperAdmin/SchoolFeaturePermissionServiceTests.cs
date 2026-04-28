using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.SuperAdmin
{
    /// <summary>
    /// Comprehensive unit tests for SchoolFeaturePermissionService covering:
    ///  - School listing and filtering
    ///  - Permission CRUD (single + bulk)
    ///  - School CRUD with validation guards
    ///  - Platform user management with validation guards
    ///  - Platform stats aggregation
    ///  - Edge cases: duplicates, missing entities, empty inputs
    /// </summary>
    public class SchoolFeaturePermissionServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly SchoolFeaturePermissionService _service;

        // Shared test fixtures
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _inactiveSchoolId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();

        public SchoolFeaturePermissionServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new AppDbContext(options);
            _service = new SchoolFeaturePermissionService(_context);

            SeedData();
        }

        private void SeedData()
        {
            _context.Schools.AddRange(
                new School
                {
                    Id = _schoolId,
                    Name = "Alpha Academy",
                    SchoolCode = "AA001",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new School
                {
                    Id = _inactiveSchoolId,
                    Name = "Beta College",
                    SchoolCode = "BC001",
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow
                }
            );

            _context.UserLogins.Add(new UserLogin
            {
                Id = _userId,
                Username = "testadmin",
                Email = "admin@alpha.edu",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1"),
                Role = "Admin",
                SchoolId = _schoolId,
                Status = "active",
                CreatedAt = DateTime.UtcNow
            });

            _context.Students.Add(new Student
            {
                Id = Guid.NewGuid(),
                FirstName = "Test",
                LastName = "Student",
                SchoolId = _schoolId,
                AdmissionNumber = "STU001",
                CreatedAt = DateTime.UtcNow
            });

            _context.SaveChanges();
        }

        // ─── GetAllSchools ────────────────────────────────────────────────────────

        [Fact]
        public async Task GetAllSchools_ReturnsOnlyActiveSchools()
        {
            var result = await _service.GetAllSchoolsAsync();

            result.Should().HaveCount(1);
            result[0].Id.Should().Be(_schoolId);
            result[0].Name.Should().Be("Alpha Academy");
            result[0].IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task GetAllSchools_ReturnsCorrectModuleCounts_WhenNoPermissions()
        {
            // No permissions seeded — EnabledModulesCount should be 0
            var result = await _service.GetAllSchoolsAsync();

            result[0].EnabledModulesCount.Should().Be(0);
            result[0].TotalModulesCount.Should().Be(20); // default modules
        }

        [Fact]
        public async Task GetAllSchools_CountsEnabledModulesCorrectly_WhenPermissionsExist()
        {
            // Seed 3 enabled + 1 disabled permission for the active school
            _context.SchoolFeaturePermissions.AddRange(
                new SchoolFeaturePermission { Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "library",  IsEnabled = true,  CreatedAt = DateTime.UtcNow },
                new SchoolFeaturePermission { Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "fees",     IsEnabled = true,  CreatedAt = DateTime.UtcNow },
                new SchoolFeaturePermission { Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "hostel",   IsEnabled = false, CreatedAt = DateTime.UtcNow }
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetAllSchoolsAsync();

            result[0].EnabledModulesCount.Should().Be(2);
        }

        // ─── GetSchoolPermissions ─────────────────────────────────────────────────

        [Fact]
        public async Task GetSchoolPermissions_ReturnsAllDefaultModules()
        {
            var result = await _service.GetSchoolPermissionsAsync(_schoolId);

            result.Should().NotBeNull();
            result.SchoolId.Should().Be(_schoolId);
            result.Modules.Should().HaveCount(20);
        }

        [Fact]
        public async Task GetSchoolPermissions_AutoInitializesDefaults_WhenNoneExist()
        {
            // No permissions seeded yet
            var result = await _service.GetSchoolPermissionsAsync(_schoolId);

            // Verify defaults were written to the database
            var dbPerms = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == _schoolId)
                .ToListAsync();

            dbPerms.Should().HaveCount(20);
            dbPerms.All(p => p.IsEnabled).Should().BeTrue();
        }

        [Fact]
        public async Task GetSchoolPermissions_ReturnsExistingValues_WhenPermissionsAlreadyExist()
        {
            _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                ModuleName = "library",
                IsEnabled = false,
                PermissionLevels = "read",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetSchoolPermissionsAsync(_schoolId);

            result.Modules["library"].Enabled.Should().BeFalse();
        }

        [Fact]
        public async Task GetSchoolPermissions_ThrowsKeyNotFoundException_ForUnknownSchool()
        {
            await _service.Invoking(s => s.GetSchoolPermissionsAsync(Guid.NewGuid()))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task GetSchoolPermissions_ThrowsKeyNotFoundException_ForInactiveSchool()
        {
            await _service.Invoking(s => s.GetSchoolPermissionsAsync(_inactiveSchoolId))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── UpdateSchoolFeaturePermission ────────────────────────────────────────

        [Fact]
        public async Task UpdateModulePermission_CreatesNewRecord_WhenNoneExists()
        {
            var request = new UpdateSchoolFeaturePermissionRequest
            {
                SchoolId = _schoolId,
                ModuleName = "library",
                IsEnabled = false,
                PermissionLevels = new List<string> { "read" }
            };

            var result = await _service.UpdateSchoolFeaturePermissionAsync(request);

            result.Should().NotBeNull();
            result.ModuleName.Should().Be("library");
            result.IsEnabled.Should().BeFalse();

            var db = await _context.SchoolFeaturePermissions
                .FirstAsync(p => p.SchoolId == _schoolId && p.ModuleName == "library");
            db.IsEnabled.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateModulePermission_UpdatesExistingRecord()
        {
            _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                ModuleName = "fees",
                IsEnabled = true,
                PermissionLevels = "read,write",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var request = new UpdateSchoolFeaturePermissionRequest
            {
                SchoolId = _schoolId,
                ModuleName = "fees",
                IsEnabled = false,
                PermissionLevels = new List<string> { "read" }
            };

            var result = await _service.UpdateSchoolFeaturePermissionAsync(request);

            result.IsEnabled.Should().BeFalse();
            result.PermissionLevels.Should().ContainSingle("read");
        }

        [Fact]
        public async Task UpdateModulePermission_ThrowsArgumentException_ForEmptyModuleName()
        {
            var request = new UpdateSchoolFeaturePermissionRequest
            {
                SchoolId = _schoolId,
                ModuleName = "",
                IsEnabled = true
            };

            await _service.Invoking(s => s.UpdateSchoolFeaturePermissionAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Module name*");
        }

        [Fact]
        public async Task UpdateModulePermission_ThrowsArgumentException_ForEmptySchoolId()
        {
            var request = new UpdateSchoolFeaturePermissionRequest
            {
                SchoolId = Guid.Empty,
                ModuleName = "library",
                IsEnabled = true
            };

            await _service.Invoking(s => s.UpdateSchoolFeaturePermissionAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*School ID*");
        }

        [Fact]
        public async Task UpdateModulePermission_ThrowsKeyNotFoundException_ForUnknownSchool()
        {
            var request = new UpdateSchoolFeaturePermissionRequest
            {
                SchoolId = Guid.NewGuid(),
                ModuleName = "library",
                IsEnabled = true
            };

            await _service.Invoking(s => s.UpdateSchoolFeaturePermissionAsync(request))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── BulkUpdateSchoolFeatures ─────────────────────────────────────────────

        [Fact]
        public async Task BulkUpdate_UpdatesAllModules()
        {
            var request = new BulkUpdateSchoolFeaturesRequest
            {
                SchoolId = _schoolId,
                Modules = new Dictionary<string, ModulePermissionDto>
                {
                    ["library"]  = new ModulePermissionDto { Enabled = false },
                    ["fees"]     = new ModulePermissionDto { Enabled = false },
                    ["students"] = new ModulePermissionDto { Enabled = true }
                }
            };

            var result = await _service.BulkUpdateSchoolFeaturesAsync(request);

            result.Should().NotBeNull();
            result.Modules["library"].Enabled.Should().BeFalse();
            result.Modules["fees"].Enabled.Should().BeFalse();
            result.Modules["students"].Enabled.Should().BeTrue();
        }

        [Fact]
        public async Task BulkUpdate_ThrowsArgumentException_ForEmptyModulesDictionary()
        {
            var request = new BulkUpdateSchoolFeaturesRequest
            {
                SchoolId = _schoolId,
                Modules = new Dictionary<string, ModulePermissionDto>()
            };

            await _service.Invoking(s => s.BulkUpdateSchoolFeaturesAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*module*");
        }

        [Fact]
        public async Task BulkUpdate_ThrowsArgumentException_ForEmptySchoolId()
        {
            var request = new BulkUpdateSchoolFeaturesRequest
            {
                SchoolId = Guid.Empty,
                Modules = new Dictionary<string, ModulePermissionDto>
                {
                    ["library"] = new ModulePermissionDto { Enabled = true }
                }
            };

            await _service.Invoking(s => s.BulkUpdateSchoolFeaturesAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*School ID*");
        }

        // ─── CheckModuleAccess ────────────────────────────────────────────────────

        [Fact]
        public async Task CheckModuleAccess_ReturnsFalse_WhenModuleDisabled()
        {
            _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "hostel", IsEnabled = false, CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var result = await _service.CheckModuleAccessAsync(_schoolId, "hostel");

            result.Should().BeFalse();
        }

        [Fact]
        public async Task CheckModuleAccess_ReturnsTrue_WhenNoPermissionRecord()
        {
            // Default: if no record, treat as enabled
            var result = await _service.CheckModuleAccessAsync(_schoolId, "library");

            result.Should().BeTrue();
        }

        // ─── CreateSchool ─────────────────────────────────────────────────────────

        [Fact]
        public async Task CreateSchool_CreatesSchoolAndInitializesPermissions()
        {
            var request = new CreateSchoolRequest
            {
                Name = "Gamma Institute",
                SchoolCode = "GI001",
                Address = "123 Main St",
                Email = "info@gamma.edu"
            };

            var result = await _service.CreateSchoolAsync(request);

            result.Should().NotBeNull();
            result.Name.Should().Be("Gamma Institute");
            result.SchoolCode.Should().Be("GI001");
            result.IsActive.Should().BeTrue();

            // Verify default permissions were initialized
            var perms = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == result.Id)
                .CountAsync();
            perms.Should().Be(20);
        }

        [Fact]
        public async Task CreateSchool_ThrowsInvalidOperationException_ForDuplicateCode()
        {
            var request = new CreateSchoolRequest { Name = "Duplicate", SchoolCode = "AA001" };

            await _service.Invoking(s => s.CreateSchoolAsync(request))
                .Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*AA001*");
        }

        [Fact]
        public async Task CreateSchool_ThrowsArgumentException_ForEmptyName()
        {
            var request = new CreateSchoolRequest { Name = "", SchoolCode = "XX999" };

            await _service.Invoking(s => s.CreateSchoolAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*name*");
        }

        [Fact]
        public async Task CreateSchool_ThrowsArgumentException_ForEmptyCode()
        {
            var request = new CreateSchoolRequest { Name = "Valid Name", SchoolCode = "" };

            await _service.Invoking(s => s.CreateSchoolAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*code*");
        }

        // ─── UpdateSchool ─────────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateSchool_UpdatesProvidedFields()
        {
            var request = new UpdateSchoolRequest
            {
                Name = "Alpha Academy Updated",
                Phone = "555-0100"
            };

            var result = await _service.UpdateSchoolAsync(_schoolId, request);

            result.Name.Should().Be("Alpha Academy Updated");
            result.Phone.Should().Be("555-0100");
        }

        [Fact]
        public async Task UpdateSchool_ThrowsKeyNotFoundException_ForUnknownSchool()
        {
            await _service.Invoking(s => s.UpdateSchoolAsync(Guid.NewGuid(), new UpdateSchoolRequest()))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── ToggleSchoolStatus ───────────────────────────────────────────────────

        [Fact]
        public async Task ToggleSchoolStatus_DeactivatesActiveSchool()
        {
            var result = await _service.ToggleSchoolStatusAsync(_schoolId);

            result.Should().BeFalse();

            var school = await _context.Schools.FindAsync(_schoolId);
            school!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task ToggleSchoolStatus_ActivatesInactiveSchool()
        {
            var result = await _service.ToggleSchoolStatusAsync(_inactiveSchoolId);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task ToggleSchoolStatus_ThrowsKeyNotFoundException_ForUnknownSchool()
        {
            await _service.Invoking(s => s.ToggleSchoolStatusAsync(Guid.NewGuid()))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── CreatePlatformUser ───────────────────────────────────────────────────

        [Fact]
        public async Task CreatePlatformUser_CreatesUserSuccessfully()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "newteacher",
                Email = "teacher@alpha.edu",
                Password = "SecurePass1",
                Role = "Teacher",
                SchoolId = _schoolId
            };

            var result = await _service.CreatePlatformUserAsync(request);

            result.Should().NotBeNull();
            result.Username.Should().Be("newteacher");
            result.Email.Should().Be("teacher@alpha.edu");
            result.Role.Should().Be("Teacher");
            result.Status.Should().Be("active");
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsInvalidOperationException_ForDuplicateEmail()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "newuser",
                Email = "admin@alpha.edu", // duplicate
                Password = "SecurePass1",
                Role = "Staff",
                SchoolId = _schoolId
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsInvalidOperationException_ForDuplicateUsername()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "testadmin", // duplicate
                Email = "unique@alpha.edu",
                Password = "SecurePass1",
                Role = "Staff",
                SchoolId = _schoolId
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsArgumentException_ForEmptyUsername()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "",
                Email = "x@y.com",
                Password = "SecurePass1",
                Role = "Staff",
                SchoolId = _schoolId
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*Username*");
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsArgumentException_ForInvalidEmail()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "newuser",
                Email = "notanemail",
                Password = "SecurePass1",
                Role = "Staff",
                SchoolId = _schoolId
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*email*");
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsArgumentException_ForShortPassword()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "newuser",
                Email = "new@alpha.edu",
                Password = "short",
                Role = "Staff",
                SchoolId = _schoolId
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*8 characters*");
        }

        [Fact]
        public async Task CreatePlatformUser_ThrowsKeyNotFoundException_ForUnknownSchool()
        {
            var request = new CreatePlatformUserRequest
            {
                Username = "ghostuser",
                Email = "ghost@nowhere.com",
                Password = "SecurePass1",
                Role = "Staff",
                SchoolId = Guid.NewGuid()
            };

            await _service.Invoking(s => s.CreatePlatformUserAsync(request))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── ToggleUserStatus ─────────────────────────────────────────────────────

        [Fact]
        public async Task ToggleUserStatus_SuspendsActiveUser()
        {
            var result = await _service.ToggleUserStatusAsync(_userId);

            result.Should().Be("suspended");
        }

        [Fact]
        public async Task ToggleUserStatus_ReactivatesSuspendedUser()
        {
            var user = await _context.UserLogins.FindAsync(_userId);
            user!.Status = "suspended";
            await _context.SaveChangesAsync();

            var result = await _service.ToggleUserStatusAsync(_userId);

            result.Should().Be("active");
        }

        [Fact]
        public async Task ToggleUserStatus_ThrowsKeyNotFoundException_ForUnknownUser()
        {
            await _service.Invoking(s => s.ToggleUserStatusAsync(Guid.NewGuid()))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── ResetUserPassword ────────────────────────────────────────────────────

        [Fact]
        public async Task ResetUserPassword_UpdatesHashSuccessfully()
        {
            var originalHash = (await _context.UserLogins.FindAsync(_userId))!.PasswordHash;

            await _service.ResetUserPasswordAsync(_userId, "NewSecurePass1");

            var user = await _context.UserLogins.FindAsync(_userId);
            user!.PasswordHash.Should().NotBe(originalHash);
            BCrypt.Net.BCrypt.Verify("NewSecurePass1", user.PasswordHash).Should().BeTrue();
        }

        [Fact]
        public async Task ResetUserPassword_ThrowsArgumentException_ForShortPassword()
        {
            await _service.Invoking(s => s.ResetUserPasswordAsync(_userId, "short"))
                .Should().ThrowAsync<ArgumentException>()
                .WithMessage("*8 characters*");
        }

        [Fact]
        public async Task ResetUserPassword_ThrowsKeyNotFoundException_ForUnknownUser()
        {
            await _service.Invoking(s => s.ResetUserPasswordAsync(Guid.NewGuid(), "NewSecurePass1"))
                .Should().ThrowAsync<KeyNotFoundException>();
        }

        // ─── GetPlatformStats ─────────────────────────────────────────────────────

        [Fact]
        public async Task GetPlatformStats_ReturnsCorrectCounts()
        {
            var result = await _service.GetPlatformStatsAsync();

            result.TotalSchools.Should().Be(2);   // 1 active + 1 inactive
            result.ActiveSchools.Should().Be(1);
            result.TotalUsers.Should().Be(1);
            result.ActiveUsers.Should().Be(1);
            result.TotalStudents.Should().Be(1);
        }

        // ─── GetEnabledModules ────────────────────────────────────────────────────

        [Fact]
        public async Task GetEnabledModules_ReturnsAllModules_WhenNoPermissionsExist()
        {
            // When no permission rows exist, default to all modules enabled
            var result = await _service.GetEnabledModulesAsync(_schoolId);

            result.Should().HaveCount(20);
        }

        [Fact]
        public async Task GetEnabledModules_ReturnsOnlyEnabledModules()
        {
            _context.SchoolFeaturePermissions.AddRange(
                new SchoolFeaturePermission { Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "library", IsEnabled = true,  CreatedAt = DateTime.UtcNow },
                new SchoolFeaturePermission { Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "hostel",  IsEnabled = false, CreatedAt = DateTime.UtcNow }
            );
            await _context.SaveChangesAsync();

            var result = await _service.GetEnabledModulesAsync(_schoolId);

            result.Should().Contain("library");
            result.Should().NotContain("hostel");
        }

        // ─── InitializeDefaultPermissions ────────────────────────────────────────

        [Fact]
        public async Task InitializeDefaultPermissions_CreatesAllModules()
        {
            await _service.InitializeDefaultPermissionsAsync(_schoolId);

            var count = await _context.SchoolFeaturePermissions
                .CountAsync(p => p.SchoolId == _schoolId);

            count.Should().Be(20);
        }

        [Fact]
        public async Task InitializeDefaultPermissions_DoesNotDuplicateExistingModules()
        {
            _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, ModuleName = "library", IsEnabled = true, CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await _service.InitializeDefaultPermissionsAsync(_schoolId);
            await _service.InitializeDefaultPermissionsAsync(_schoolId); // second call

            var libraryCount = await _context.SchoolFeaturePermissions
                .CountAsync(p => p.SchoolId == _schoolId && p.ModuleName == "library");

            libraryCount.Should().Be(1); // no duplicates
        }

        // ─── GetAllUsers (filtering) ──────────────────────────────────────────────

        [Fact]
        public async Task GetAllUsers_ReturnsAllUsers_WhenNoFilter()
        {
            var result = await _service.GetAllUsersAsync(null, null, null);

            result.Should().HaveCount(1);
            result[0].Username.Should().Be("testadmin");
        }

        [Fact]
        public async Task GetAllUsers_FiltersBySchool()
        {
            var result = await _service.GetAllUsersAsync(_schoolId.ToString(), null, null);

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetAllUsers_FiltersByRole()
        {
            var result = await _service.GetAllUsersAsync(null, "Admin", null);

            result.Should().HaveCount(1);
            result[0].Role.Should().Be("Admin");
        }

        [Fact]
        public async Task GetAllUsers_FiltersBySearch_MatchesUsername()
        {
            var result = await _service.GetAllUsersAsync(null, null, "testadmin");

            result.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetAllUsers_FiltersBySearch_NoMatch_ReturnsEmpty()
        {
            var result = await _service.GetAllUsersAsync(null, null, "zzz_nomatch_zzz");

            result.Should().BeEmpty();
        }

        public void Dispose() => _context.Dispose();
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Permissions
{
    public class PermissionsServiceTests : IAsyncLifetime
    {
        private readonly AppDbContext _context;
        private readonly IPermissionsService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _userId = Guid.NewGuid();

        public PermissionsServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: $"PermissionsTestDb-{Guid.NewGuid()}")
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(options);
            _service = new PermissionsService(_context);
        }

        public async Task InitializeAsync()
        {
            await _context.Database.EnsureCreatedAsync();
            
            // Seed test school
            _context.Schools.Add(new School
            {
                Id = _schoolId,
                Name = "Test School",
                SchoolCode = "TS001",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            // Seed test user
            _context.UserLogins.Add(new UserLogin
            {
                Id = _userId,
                SchoolId = _schoolId,
                Username = "testuser",
                Email = "test@school.edu",
                FirstName = "Test",
                LastName = "User",
                PasswordHash = "hash",
                Status = "Active",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();
        }

        public async Task DisposeAsync()
        {
            await _context.Database.EnsureDeletedAsync();
            _context.Dispose();
        }

        #region Role CRUD Tests

        [Fact]
        public async Task CreateRoleAsync_Success()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Custom Role",
                DisplayName = "Custom Display Name",
                Description = "A custom role",
                CreatedBy = _userId,
            };

            var result = await _service.CreateRoleAsync(request);

            result.Should().NotBeNull();
            result.Name.Should().Be("Custom Role");
            result.DisplayName.Should().Be("Custom Display Name");
            result.SchoolId.Should().Be(_schoolId);
            result.IsSystemRole.Should().BeFalse();
            result.RoleType.Should().Be("Custom");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenNameMissing()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = string.Empty,
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("Role name is required");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenNameTooShort()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "A",
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("at least 2 characters");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenNameTooLong()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = new string('A', 101),
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("cannot exceed 100 characters");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenDuplicate()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Duplicate Role",
                CreatedBy = _userId,
            };

            await _service.CreateRoleAsync(request);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenDisplayNameTooLong()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Valid Name",
                DisplayName = new string('A', 101),
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("Display name cannot exceed 100 characters");
        }

        [Fact]
        public async Task CreateRoleAsync_Throws_WhenDescriptionTooLong()
        {
            var request = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Valid Name",
                Description = new string('A', 501),
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
            ex.Message.Should().Contain("Description cannot exceed 500 characters");
        }

        [Fact]
        public async Task UpdateRoleAsync_Success()
        {
            var createReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Original Name",
                DisplayName = "Original Display",
                CreatedBy = _userId,
            };
            var created = await _service.CreateRoleAsync(createReq);

            var updateReq = new UpdateRoleRequest
            {
                DisplayName = "Updated Display",
                Description = "Updated description",
                UpdatedBy = _userId,
            };

            var result = await _service.UpdateRoleAsync(created.Id, updateReq, _schoolId);

            result.DisplayName.Should().Be("Updated Display");
            result.Description.Should().Be("Updated description");
        }

        [Fact]
        public async Task UpdateRoleAsync_Throws_WhenRoleNotFound()
        {
            var updateReq = new UpdateRoleRequest { UpdatedBy = _userId };

            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _service.UpdateRoleAsync(Guid.NewGuid(), updateReq, _schoolId));
        }

        [Fact]
        public async Task UpdateRoleAsync_Throws_WhenDisplayNameTooLong()
        {
            var createReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var created = await _service.CreateRoleAsync(createReq);

            var updateReq = new UpdateRoleRequest
            {
                DisplayName = new string('A', 101),
                UpdatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.UpdateRoleAsync(created.Id, updateReq, _schoolId));
            ex.Message.Should().Contain("Display name cannot exceed 100 characters");
        }

        [Fact]
        public async Task DeleteRoleAsync_Success()
        {
            var createReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Role To Delete",
                CreatedBy = _userId,
            };
            var created = await _service.CreateRoleAsync(createReq);

            await _service.DeleteRoleAsync(created.Id, _schoolId);

            var retrieved = await _context.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == created.Id);
            retrieved.Should().NotBeNull();
            retrieved!.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteRoleAsync_Throws_WhenRoleNotFound()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _service.DeleteRoleAsync(Guid.NewGuid(), _schoolId));
        }

        [Fact]
        public async Task DeleteRoleAsync_Throws_WhenHasUsers()
        {
            var createReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Role With Users",
                CreatedBy = _userId,
            };
            var created = await _service.CreateRoleAsync(createReq);

            // Assign user to role
            var assignReq = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                RoleId = created.Id,
                CreatedBy = _userId,
            };
            await _service.AssignRoleToUserAsync(assignReq);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.DeleteRoleAsync(created.Id, _schoolId));
            ex.Message.Should().Contain("has users assigned");
        }

        #endregion

        #region Permission Tests

        [Fact]
        public async Task CreatePermissionAsync_Success()
        {
            var request = new CreatePermissionRequest
            {
                Module = "Students",
                Action = "View",
                DisplayName = "View Students",
                Description = "Allows viewing students",
                CreatedBy = _userId,
            };

            var result = await _service.CreatePermissionAsync(request);

            result.Should().NotBeNull();
            result.Name.Should().Be("Students.View");
            result.Module.Should().Be("Students");
            result.Action.Should().Be("View");
        }

        [Fact]
        public async Task CreatePermissionAsync_Throws_WhenModuleMissing()
        {
            var request = new CreatePermissionRequest
            {
                Module = string.Empty,
                Action = "View",
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePermissionAsync(request));
            ex.Message.Should().Contain("Module is required");
        }

        [Fact]
        public async Task CreatePermissionAsync_Throws_WhenActionMissing()
        {
            var request = new CreatePermissionRequest
            {
                Module = "Students",
                Action = string.Empty,
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePermissionAsync(request));
            ex.Message.Should().Contain("Action is required");
        }

        [Fact]
        public async Task CreatePermissionAsync_Throws_WhenDuplicate()
        {
            var request = new CreatePermissionRequest
            {
                Module = "Students",
                Action = "View",
                CreatedBy = _userId,
            };

            await _service.CreatePermissionAsync(request);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreatePermissionAsync(request));
            ex.Message.Should().Contain("already exists");
        }

        #endregion

        #region User Role Assignment Tests

        [Fact]
        public async Task AssignRoleToUserAsync_Success()
        {
            // Create role
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            var request = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                RoleId = role.Id,
                CreatedBy = _userId,
            };

            var result = await _service.AssignRoleToUserAsync(request);

            result.Should().NotBeNull();
            result.UserId.Should().Be(_userId);
            result.RoleId.Should().Be(role.Id);
        }

        [Fact]
        public async Task AssignRoleToUserAsync_Throws_WhenUserIdMissing()
        {
            var request = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = Guid.Empty,
                RoleId = Guid.NewGuid(),
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => _service.AssignRoleToUserAsync(request));
            ex.Message.Should().Contain("UserId is required");
        }

        [Fact]
        public async Task AssignRoleToUserAsync_Throws_WhenUserNotFound()
        {
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            var request = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = Guid.NewGuid(),
                RoleId = role.Id,
                CreatedBy = _userId,
            };

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.AssignRoleToUserAsync(request));
            ex.Message.Should().Contain("User not found");
        }

        [Fact]
        public async Task AssignRoleToUserAsync_Throws_WhenDuplicate()
        {
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            var request = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                RoleId = role.Id,
                CreatedBy = _userId,
            };

            await _service.AssignRoleToUserAsync(request);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AssignRoleToUserAsync(request));
            ex.Message.Should().Contain("already has this role");
        }

        [Fact]
        public async Task RemoveUserRoleAsync_Success()
        {
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            var assignReq = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                RoleId = role.Id,
                CreatedBy = _userId,
            };
            await _service.AssignRoleToUserAsync(assignReq);

            await _service.RemoveUserRoleAsync(_userId, role.Id, _schoolId);

            var userRoles = await _service.GetUserRolesAsync(_userId, _schoolId);
            userRoles.Should().BeEmpty();
        }

        #endregion

        #region Permission Check Tests

        [Fact]
        public async Task CheckUserPermissionAsync_ReturnsFalse_WhenUserHasNoRoles()
        {
            var request = new CheckPermissionRequest
            {
                SchoolId = _schoolId,
                UserId = Guid.NewGuid(),
                PermissionName = "Students.View",
            };

            var result = await _service.CheckUserPermissionAsync(request);

            result.HasPermission.Should().BeFalse();
        }

        [Fact]
        public async Task CheckUserPermissionAsync_ReturnsTrue_WhenUserHasPermission()
        {
            // Seed permissions
            await _service.EnsureSystemRolesAsync(_schoolId);

            // Get Admin role and assign to user
            var roles = await _service.GetRolesAsync(_schoolId);
            var adminRole = roles.Roles.FirstOrDefault(r => r.Name == "Admin");

            var assignReq = new AssignRoleRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                RoleId = adminRole.Id,
                CreatedBy = _userId,
            };
            await _service.AssignRoleToUserAsync(assignReq);

            var request = new CheckPermissionRequest
            {
                SchoolId = _schoolId,
                UserId = _userId,
                Module = "Students",
                Action = "View",
            };

            var result = await _service.CheckUserPermissionAsync(request);

            result.HasPermission.Should().BeTrue();
        }

        #endregion

        #region Pagination Tests

        [Fact]
        public async Task GetRolesAsync_NormalizesPaginationBounds()
        {
            await _service.EnsureSystemRolesAsync(_schoolId);

            // Test page < 1
            var result1 = await _service.GetRolesAsync(_schoolId, page: 0, pageSize: 50);
            result1.Page.Should().BeGreaterThanOrEqualTo(1);

            // Test pageSize > 200
            var result2 = await _service.GetRolesAsync(_schoolId, page: 1, pageSize: 500);
            result2.PageSize.Should().BeLessThanOrEqualTo(200);
        }

        [Fact]
        public async Task GetUsersWithRolesAsync_NormalizesPaginationBounds()
        {
            // Test pageSize > 200
            var result = await _service.GetUsersWithRolesAsync(_schoolId, page: 1, pageSize: 500);
            result.Users.Should().NotBeNull();
        }

        #endregion

        #region SetRolePermissions Tests

        [Fact]
        public async Task SetRolePermissionsAsync_Success()
        {
            // Create role
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            // Create permissions
            var perm1 = await _service.CreatePermissionAsync(new CreatePermissionRequest
            {
                Module = "Students",
                Action = "View",
                CreatedBy = _userId,
            });
            var perm2 = await _service.CreatePermissionAsync(new CreatePermissionRequest
            {
                Module = "Students",
                Action = "Create",
                CreatedBy = _userId,
            });

            // Assign permissions to role
            await _service.SetRolePermissionsAsync(role.Id, _schoolId, new List<Guid> { perm1.Id, perm2.Id });

            // Verify
            var permIds = await _service.GetRolePermissionIdsAsync(role.Id);
            permIds.Should().HaveCount(2);
            permIds.Should().Contain(new[] { perm1.Id, perm2.Id });
        }

        [Fact]
        public async Task SetRolePermissionsAsync_Throws_WhenRoleNotFound()
        {
            await Assert.ThrowsAsync<KeyNotFoundException>(() => 
                _service.SetRolePermissionsAsync(Guid.NewGuid(), _schoolId, new List<Guid>()));
        }

        [Fact]
        public async Task SetRolePermissionsAsync_Throws_WhenSystemRole()
        {
            await _service.EnsureSystemRolesAsync(_schoolId);
            var roles = await _service.GetRolesAsync(_schoolId);
            var adminRole = roles.Roles.FirstOrDefault(r => r.IsSystemRole);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.SetRolePermissionsAsync(adminRole.Id, _schoolId, new List<Guid>()));
            ex.Message.Should().Contain("Cannot modify permissions for system roles");
        }

        [Fact]
        public async Task SetRolePermissionsAsync_Throws_WhenPermissionIdInvalid()
        {
            var createRoleReq = new CreateRoleRequest
            {
                SchoolId = _schoolId,
                Name = "Test Role",
                CreatedBy = _userId,
            };
            var role = await _service.CreateRoleAsync(createRoleReq);

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => 
                _service.SetRolePermissionsAsync(role.Id, _schoolId, new List<Guid> { Guid.NewGuid() }));
            ex.Message.Should().Contain("do not exist");
        }

        #endregion

        #region Stats Tests

        [Fact]
        public async Task GetRoleStatsAsync_ReturnsCorrectStats()
        {
            await _service.EnsureSystemRolesAsync(_schoolId);

            var stats = await _service.GetRoleStatsAsync(_schoolId);

            stats.TotalRoles.Should().BeGreaterThan(0);
            stats.SystemRoles.Should().BeGreaterThan(0);
            stats.TotalPermissions.Should().BeGreaterThan(0);
        }

        #endregion
    }
}

using SmsApi.Models.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface ISchoolFeaturePermissionService
    {
        Task<List<SchoolListDto>> GetAllSchoolsAsync();
        Task<SchoolPermissionsResponse> GetSchoolPermissionsAsync(Guid schoolId);
        Task<SchoolFeaturePermissionDto> UpdateSchoolFeaturePermissionAsync(UpdateSchoolFeaturePermissionRequest request);
        Task<SchoolPermissionsResponse> BulkUpdateSchoolFeaturesAsync(BulkUpdateSchoolFeaturesRequest request);
        Task<bool> CheckModuleAccessAsync(Guid schoolId, string moduleName);
        Task<List<string>> GetEnabledModulesAsync(Guid schoolId);
        Task InitializeDefaultPermissionsAsync(Guid schoolId);
        // School CRUD
        Task<SchoolDetailDto> CreateSchoolAsync(CreateSchoolRequest request);
        Task<SchoolDetailDto> UpdateSchoolAsync(Guid schoolId, UpdateSchoolRequest request);
        Task<bool> ToggleSchoolStatusAsync(Guid schoolId);
        // User Management
        Task<List<PlatformUserDto>> GetAllUsersAsync(string? schoolId, string? role, string? search);
        Task<PlatformUserDto> CreatePlatformUserAsync(CreatePlatformUserRequest request);
        Task<string> ToggleUserStatusAsync(Guid userId);
        Task ResetUserPasswordAsync(Guid userId, string newPassword);
        // Stats
        Task<PlatformStatsDto> GetPlatformStatsAsync();
        // Onboarding
        Task<SchoolOnboardingResult> OnboardSchoolAsync(SchoolOnboardingRequest request);
        // Billing
        Task<SchoolBillingDto> GetSchoolBillingAsync(Guid schoolId);
        Task<SchoolBillingDto> UpdateSchoolBillingAsync(Guid schoolId, UpdateSchoolBillingRequest request);
        Task<BillingNotificationDto> GetBillingNotificationAsync(Guid schoolId);
    }

    public class SchoolFeaturePermissionService : ISchoolFeaturePermissionService
    {
        private readonly AppDbContext _context;
        
        // Default modules available in the system
        private readonly string[] _defaultModules = new[]
        {
            "students", "staff", "attendance", "fees", "timetable", "examinations",
            "announcements", "reports", "documents", "admissions", "library",
            "transport", "hostel", "health", "payroll", "communication",
            "analytics", "certificates", "store", "wallet"
        };

        public SchoolFeaturePermissionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<SchoolListDto>> GetAllSchoolsAsync()
        {
            var schools = await _context.Schools
                .Select(s => new SchoolListDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    SchoolCode = s.SchoolCode,
                    Address = s.Address,
                    Phone = s.Phone,
                    Email = s.Email,
                    Logo = s.Logo,
                    IsActive = s.IsActive,
                    EnabledModulesCount = _context.SchoolFeaturePermissions
                        .Count(p => p.SchoolId == s.Id && p.IsEnabled),
                    TotalModulesCount = _defaultModules.Length,
                    IsOnboarded = _context.UserLogins
                        .Any(u => u.SchoolId == s.Id && u.Role.ToLower() == "admin")
                })
                .OrderByDescending(s => s.IsActive)
                .ThenBy(s => s.Name)
                .ToListAsync();

            return schools;
        }

        public async Task<SchoolPermissionsResponse> GetSchoolPermissionsAsync(Guid schoolId)
        {
            var school = await _context.Schools
                .FirstOrDefaultAsync(s => s.Id == schoolId);

            if (school == null)
                throw new KeyNotFoundException($"School with ID {schoolId} not found");

            var permissions = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == schoolId)
                .ToListAsync();

            // If no permissions exist, initialize with defaults
            if (!permissions.Any())
            {
                await InitializeDefaultPermissionsAsync(schoolId);
                permissions = await _context.SchoolFeaturePermissions
                    .Where(p => p.SchoolId == schoolId)
                    .ToListAsync();
            }

            var response = new SchoolPermissionsResponse
            {
                SchoolId = school.Id,
                SchoolName = school.Name,
                Modules = new Dictionary<string, ModulePermissionDto>()
            };

            foreach (var module in _defaultModules)
            {
                var permission = permissions.FirstOrDefault(p => p.ModuleName == module);
                response.Modules[module] = new ModulePermissionDto
                {
                    Enabled = permission?.IsEnabled ?? true,
                    Permissions = permission?.PermissionLevels?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string> { "read" }
                };
            }

            return response;
        }

        public async Task<SchoolFeaturePermissionDto> UpdateSchoolFeaturePermissionAsync(UpdateSchoolFeaturePermissionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ModuleName))
                throw new ArgumentException("Module name is required.", nameof(request.ModuleName));
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("School ID is required.", nameof(request.SchoolId));

            var school = await _context.Schools
                .FirstOrDefaultAsync(s => s.Id == request.SchoolId);

            if (school == null)
                throw new KeyNotFoundException($"School with ID {request.SchoolId} not found");

            var permission = await _context.SchoolFeaturePermissions
                .FirstOrDefaultAsync(p => p.SchoolId == request.SchoolId && p.ModuleName == request.ModuleName);

            if (permission == null)
            {
                permission = new SchoolFeaturePermission
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    ModuleName = request.ModuleName,
                    IsEnabled = request.IsEnabled,
                    PermissionLevels = string.Join(",", request.PermissionLevels ?? new List<string> { "read" }),
                    PackageName = request.PackageName,
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow
                };
                _context.SchoolFeaturePermissions.Add(permission);
            }
            else
            {
                permission.IsEnabled = request.IsEnabled;
                permission.PermissionLevels = string.Join(",", request.PermissionLevels ?? new List<string> { "read" });
                permission.PackageName = request.PackageName;
                permission.Notes = request.Notes;
                permission.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return new SchoolFeaturePermissionDto
            {
                Id = permission.Id,
                SchoolId = permission.SchoolId,
                SchoolName = school.Name,
                ModuleName = permission.ModuleName,
                IsEnabled = permission.IsEnabled,
                PermissionLevels = permission.PermissionLevels.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                PackageName = permission.PackageName,
                Notes = permission.Notes,
                CreatedAt = permission.CreatedAt,
                UpdatedAt = permission.UpdatedAt
            };
        }

        public async Task<SchoolPermissionsResponse> BulkUpdateSchoolFeaturesAsync(BulkUpdateSchoolFeaturesRequest request)
        {
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("School ID is required.", nameof(request.SchoolId));
            if (request.Modules == null || !request.Modules.Any())
                throw new ArgumentException("At least one module must be provided.", nameof(request.Modules));

            var school = await _context.Schools
                .FirstOrDefaultAsync(s => s.Id == request.SchoolId);

            if (school == null)
                throw new KeyNotFoundException($"School with ID {request.SchoolId} not found");

            var existingPermissions = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == request.SchoolId)
                .ToListAsync();

            foreach (var kvp in request.Modules)
            {
                var moduleName = kvp.Key;
                var module = kvp.Value;
                var permission = existingPermissions.FirstOrDefault(p => p.ModuleName == moduleName);

                if (permission == null)
                {
                    permission = new SchoolFeaturePermission
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = request.SchoolId,
                        ModuleName = moduleName,
                        IsEnabled = module.Enabled,
                        PermissionLevels = string.Join(",", module.Permissions ?? new List<string> { "read" }),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SchoolFeaturePermissions.Add(permission);
                }
                else
                {
                    permission.IsEnabled = module.Enabled;
                    permission.PermissionLevels = string.Join(",", module.Permissions ?? new List<string> { "read" });
                    permission.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            return await GetSchoolPermissionsAsync(request.SchoolId);
        }

        public async Task<bool> CheckModuleAccessAsync(Guid schoolId, string moduleName)
        {
            var permission = await _context.SchoolFeaturePermissions
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.ModuleName == moduleName);

            // If no permission record exists, default to enabled
            return permission?.IsEnabled ?? true;
        }

        public async Task<List<string>> GetEnabledModulesAsync(Guid schoolId)
        {
            var enabledModules = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == schoolId && p.IsEnabled)
                .Select(p => p.ModuleName)
                .ToListAsync();

            // If no permissions exist, return all modules as enabled
            if (!enabledModules.Any())
                return _defaultModules.ToList();

            return enabledModules;
        }

        public async Task InitializeDefaultPermissionsAsync(Guid schoolId)
        {
            var existingPermissions = await _context.SchoolFeaturePermissions
                .Where(p => p.SchoolId == schoolId)
                .Select(p => p.ModuleName)
                .ToListAsync();

            foreach (var module in _defaultModules)
            {
                if (!existingPermissions.Contains(module))
                {
                    _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        ModuleName = module,
                        IsEnabled = true,
                        PermissionLevels = "read,write,delete",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        // ─── School CRUD ──────────────────────────────────────────────────────────

        public async Task<SchoolDetailDto> CreateSchoolAsync(CreateSchoolRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("School name is required.", nameof(request.Name));
            if (string.IsNullOrWhiteSpace(request.SchoolCode))
                throw new ArgumentException("School code is required.", nameof(request.SchoolCode));

            var exists = await _context.Schools.AnyAsync(s => s.SchoolCode == request.SchoolCode);
            if (exists)
                throw new InvalidOperationException($"School with code '{request.SchoolCode}' already exists.");

            var school = new School
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                SchoolCode = request.SchoolCode,
                Address = request.Address,
                Phone = request.Phone,
                Email = request.Email,
                Logo = request.Logo,
                IsActive = true,
            };

            _context.Schools.Add(school);
            await _context.SaveChangesAsync();
            await InitializeDefaultPermissionsAsync(school.Id);

            return MapToSchoolDetail(school);
        }

        public async Task<SchoolDetailDto> UpdateSchoolAsync(Guid schoolId, UpdateSchoolRequest request)
        {
            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                throw new KeyNotFoundException($"School {schoolId} not found.");

            if (request.Name != null) school.Name = request.Name;
            if (request.Address != null) school.Address = request.Address;
            if (request.Phone != null) school.Phone = request.Phone;
            if (request.Email != null) school.Email = request.Email;
            if (request.Logo != null) school.Logo = request.Logo;

            await _context.SaveChangesAsync();
            return MapToSchoolDetail(school);
        }

        public async Task<bool> ToggleSchoolStatusAsync(Guid schoolId)
        {
            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                throw new KeyNotFoundException($"School {schoolId} not found.");

            school.IsActive = !school.IsActive;

            var schoolAdmins = await _context.UserLogins
                .Where(u => !u.IsDeleted
                            && u.SchoolId == schoolId
                            && (u.Role.ToLower() == "admin" || u.Role.ToLower() == "administrator"))
                .ToListAsync();

            foreach (var admin in schoolAdmins)
            {
                if (!school.IsActive)
                {
                    admin.Status = StatusConstants.UserStatus.Inactive;
                    admin.RefreshTokenHash = null;
                    admin.RefreshTokenExpiry = null;
                }
                else if (admin.Status == StatusConstants.UserStatus.Inactive)
                {
                    admin.Status = StatusConstants.UserStatus.Active;
                }

                admin.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return school.IsActive;
        }

        private static SchoolDetailDto MapToSchoolDetail(School s) => new SchoolDetailDto
        {
            Id = s.Id,
            Name = s.Name,
            SchoolCode = s.SchoolCode,
            Address = s.Address,
            Phone = s.Phone,
            Email = s.Email,
            Logo = s.Logo,
            IsActive = s.IsActive
        };

        // ─── User Management ──────────────────────────────────────────────────────

        public async Task<List<PlatformUserDto>> GetAllUsersAsync(string? schoolId, string? role, string? search)
        {
            var query = _context.UserLogins.AsQueryable();

            if (!string.IsNullOrEmpty(schoolId) && Guid.TryParse(schoolId, out var sid))
                query = query.Where(u => u.SchoolId == sid);

            if (!string.IsNullOrEmpty(role))
                query = query.Where(u => u.Role == role);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(u => u.Username.Contains(search) || u.Email.Contains(search));

            var users = await query.OrderBy(u => u.Username).ToListAsync();
            var schoolIds = users.Select(u => u.SchoolId).Distinct().ToList();
            var schools = await _context.Schools.Where(s => schoolIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name);

            return users.Select(u => new PlatformUserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                SchoolId = u.SchoolId,
                SchoolName = schools.TryGetValue(u.SchoolId, out var n) ? n : "",
                Status = u.Status,
                CreatedAt = u.CreatedAt,
                LastLogin = u.LastLogin
            }).ToList();
        }

        public async Task<PlatformUserDto> CreatePlatformUserAsync(CreatePlatformUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
                throw new ArgumentException("Username is required.", nameof(request.Username));
            if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
                throw new ArgumentException("A valid email address is required.", nameof(request.Email));
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                throw new ArgumentException("Password must be at least 8 characters.", nameof(request.Password));
            if (string.IsNullOrWhiteSpace(request.Role))
                throw new ArgumentException("Role is required.", nameof(request.Role));
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("School ID is required.", nameof(request.SchoolId));

            var exists = await _context.UserLogins.AnyAsync(u => u.Email == request.Email || u.Username == request.Username);
            if (exists)
                throw new InvalidOperationException("A user with this email or username already exists.");

            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == request.SchoolId)
                ?? throw new KeyNotFoundException($"School {request.SchoolId} not found.");

            var user = new UserLogin
            {
                Id = Guid.NewGuid(),
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role,
                SchoolId = request.SchoolId,
                Status = "active",
                CreatedAt = DateTime.UtcNow
            };

            _context.UserLogins.Add(user);
            await _context.SaveChangesAsync();

            return new PlatformUserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                SchoolId = user.SchoolId,
                SchoolName = school.Name,
                Status = user.Status,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<string> ToggleUserStatusAsync(Guid userId)
        {
            var user = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new KeyNotFoundException($"User {userId} not found.");

            user.Status = user.Status == "active" ? "suspended" : "active";
            await _context.SaveChangesAsync();
            return user.Status;
        }

        public async Task ResetUserPasswordAsync(Guid userId, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
                throw new ArgumentException("Password must be at least 8 characters.", nameof(newPassword));

            var user = await _context.UserLogins.FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new KeyNotFoundException($"User {userId} not found.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();
        }

        // ─── Stats ────────────────────────────────────────────────────────────────

        public async Task<PlatformStatsDto> GetPlatformStatsAsync()
        {
            var totalSchools = await _context.Schools.CountAsync();
            var activeSchools = await _context.Schools.CountAsync(s => s.IsActive);
            var totalUsers = await _context.UserLogins.CountAsync();
            var activeUsers = await _context.UserLogins.CountAsync(u => u.Status == "active");
            var totalStudents = await _context.Students.CountAsync();
            var totalStaff = await _context.UserLogins.CountAsync(u => u.Role == "Staff" || u.Role == StatusConstants.Roles.Admin);

            return new PlatformStatsDto
            {
                TotalSchools = totalSchools,
                ActiveSchools = activeSchools,
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                TotalStudents = totalStudents,
                TotalStaff = totalStaff
            };
        }

        // ─── Onboarding ───────────────────────────────────────────────────────────

        public async Task<SchoolOnboardingResult> OnboardSchoolAsync(SchoolOnboardingRequest request)
        {
            // Step 1: Create school + auto-initialize default module permissions
            var school = await CreateSchoolAsync(new CreateSchoolRequest
            {
                Name = request.Name,
                SchoolCode = request.SchoolCode,
                Address = request.Address,
                Phone = request.Phone,
                Email = request.Email,
                Logo = request.Logo,
            });

            var schoolId = school.Id;

            // Step 2: Apply module overrides (disable/enable specific modules)
            if (request.ModuleOverrides != null && request.ModuleOverrides.Count > 0)
            {
                foreach (var (moduleName, isEnabled) in request.ModuleOverrides)
                {
                    var perm = await _context.SchoolFeaturePermissions
                        .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.ModuleName == moduleName);
                    if (perm != null)
                    {
                        perm.IsEnabled = isEnabled;
                        perm.UpdatedAt = DateTime.UtcNow;
                    }
                }
                await _context.SaveChangesAsync();
            }

            // Step 3: Create the first academic year for this school
            var academicYear = new AcademicYear
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = request.AcademicYearName,
                StartDate = request.AcademicYearStart,
                EndDate = request.AcademicYearEnd,
                IsCurrent = request.AcademicYearIsCurrent,
                Status = "active",
            };
            _context.AcademicYears.Add(academicYear);
            await _context.SaveChangesAsync();

            // Step 4: Create the school's first admin user
            var adminUser = await CreatePlatformUserAsync(new CreatePlatformUserRequest
            {
                Username = request.AdminUsername,
                Email = request.AdminEmail,
                Password = request.AdminPassword,
                Role = StatusConstants.Roles.Admin,
                SchoolId = schoolId,
            });

            var enabledModules = await GetEnabledModulesAsync(schoolId);

            // Step 5: Attach board configurations if supplied
            if (request.BoardConfigurationIds != null && request.BoardConfigurationIds.Count > 0)
            {
                for (int i = 0; i < request.BoardConfigurationIds.Count; i++)
                {
                    var boardId = request.BoardConfigurationIds[i];
                    var isDefault = request.DefaultBoardConfigurationId.HasValue
                        ? boardId == request.DefaultBoardConfigurationId.Value
                        : i == 0; // first one is default if no explicit default given
                    try
                    {
                        var boardExists = await _context.BoardConfigurations
                            .AnyAsync(b => b.Id == boardId && b.IsActive);
                        if (!boardExists) continue; // skip invalid ids silently

                        // Unset prior defaults when this one is being set as default
                        if (isDefault)
                        {
                            var priorDefaults = await _context.SchoolBoardConfigs
                                .Where(s => s.SchoolId == schoolId && s.IsActive && s.IsDefault)
                                .ToListAsync();
                            foreach (var d in priorDefaults) d.IsDefault = false;
                        }

                        _context.SchoolBoardConfigs.Add(new SmsApi.Models.Entities.SchoolBoardConfig
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            BoardConfigurationId = boardId,
                            IsDefault = isDefault,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                        });
                    }
                    catch { /* skip any individual board failures */ }
                }
                await _context.SaveChangesAsync();
            }

            return new SchoolOnboardingResult
            {
                SchoolId = schoolId,
                SchoolName = school.Name,
                SchoolCode = school.SchoolCode,
                AdminUserId = adminUser.Id,
                AdminEmail = adminUser.Email,
                AcademicYearId = academicYear.Id,
                AcademicYearName = academicYear.Name,
                EnabledModules = enabledModules,
            };
        }

        // ── Billing ──────────────────────────────────────────────────────────

        public async Task<SchoolBillingDto> GetSchoolBillingAsync(Guid schoolId)
        {
            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                throw new KeyNotFoundException($"School {schoolId} not found");

            return BuildBillingDto(school);
        }

        public async Task<SchoolBillingDto> UpdateSchoolBillingAsync(Guid schoolId, UpdateSchoolBillingRequest request)
        {
            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                throw new KeyNotFoundException($"School {schoolId} not found");

            if (request.BillingPlan   != null) school.BillingPlan          = request.BillingPlan;
            if (request.BillingStatus != null) school.BillingStatus        = request.BillingStatus;
            if (request.BillingExpiryDate.HasValue) school.BillingExpiryDate = request.BillingExpiryDate;
            if (request.RenewalReminderDays.HasValue) school.RenewalReminderDays = request.RenewalReminderDays.Value;

            await _context.SaveChangesAsync();
            return BuildBillingDto(school);
        }

        public async Task<BillingNotificationDto> GetBillingNotificationAsync(Guid schoolId)
        {
            var school = await _context.Schools.FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null)
                return new BillingNotificationDto { HasWarning = false };

            if (school.BillingExpiryDate == null)
                return new BillingNotificationDto
                {
                    HasWarning = false,
                    BillingPlan = school.BillingPlan,
                    BillingStatus = school.BillingStatus,
                };

            var today = DateTime.UtcNow.Date;
            var expiry = school.BillingExpiryDate.Value.Date;
            var daysLeft = (expiry - today).Days;

            string severity, message;
            bool hasWarning = false;

            if (daysLeft < 0)
            {
                hasWarning = true; severity = "critical";
                message = $"Your subscription has expired {Math.Abs(daysLeft)} day(s) ago. Please renew immediately to avoid service interruption.";
            }
            else if (daysLeft == 0)
            {
                hasWarning = true; severity = "critical";
                message = "Your subscription expires today. Please renew immediately.";
            }
            else if (daysLeft <= school.RenewalReminderDays)
            {
                hasWarning = true;
                severity = daysLeft <= 7 ? "critical" : "warning";
                message = $"Your {school.BillingPlan} subscription expires in {daysLeft} day(s) on {expiry:dd MMM yyyy}. Please renew to continue uninterrupted access.";
            }
            else
            {
                severity = "info";
                message = $"Your {school.BillingPlan} plan is active until {expiry:dd MMM yyyy}.";
            }

            return new BillingNotificationDto
            {
                HasWarning    = hasWarning,
                Message       = message,
                Severity      = severity,
                DaysUntilExpiry = daysLeft,
                BillingPlan   = school.BillingPlan,
                BillingStatus = school.BillingStatus,
                BillingExpiryDate = school.BillingExpiryDate,
            };
        }

        private static SchoolBillingDto BuildBillingDto(School school)
        {
            int? daysLeft = null;
            bool expiringSoon = false, isExpired = false;

            if (school.BillingExpiryDate.HasValue)
            {
                daysLeft = (school.BillingExpiryDate.Value.Date - DateTime.UtcNow.Date).Days;
                isExpired    = daysLeft < 0;
                expiringSoon = !isExpired && daysLeft <= school.RenewalReminderDays;
            }

            return new SchoolBillingDto
            {
                SchoolId            = school.Id,
                SchoolName          = school.Name,
                BillingPlan         = school.BillingPlan,
                BillingStatus       = school.BillingStatus,
                BillingExpiryDate   = school.BillingExpiryDate,
                RenewalReminderDays = school.RenewalReminderDays,
                DaysUntilExpiry     = daysLeft,
                IsExpiringSoon      = expiringSoon,
                IsExpired           = isExpired,
            };
        }
    }
}

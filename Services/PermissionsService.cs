using SmsApi.Models.Constants;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IPermissionsService
    {
        // Roles
        Task<RoleListResponse> GetRolesAsync(Guid schoolId, int page = 1, int pageSize = 50);
        Task<RoleResponse> GetRoleByIdAsync(Guid id, Guid schoolId);
        Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
        Task<RoleResponse> UpdateRoleAsync(Guid id, UpdateRoleRequest request, Guid schoolId);
        Task DeleteRoleAsync(Guid id, Guid schoolId);

        // Permissions
        Task<PermissionListResponse> GetPermissionsAsync(string? module = null);
        Task<List<PermissionGroupResponse>> GetPermissionsGroupedAsync();
        Task<PermissionResponse> CreatePermissionAsync(CreatePermissionRequest request);

        // User Role Assignments
        Task<UserRoleResponse> AssignRoleToUserAsync(AssignRoleRequest request);
        Task<List<UserRoleResponse>> GetUserRolesAsync(Guid userId, Guid schoolId);
        Task RemoveUserRoleAsync(Guid userId, Guid roleId, Guid schoolId);

        // Role Permission Assignments
        Task<RolePermissionResponse> AssignPermissionsToRoleAsync(AssignPermissionsRequest request);
        Task<List<RolePermissionResponse>> GetRolePermissionsAsync(Guid roleId);
        Task<List<Guid>> GetRolePermissionIdsAsync(Guid roleId);
        Task SetRolePermissionsAsync(Guid roleId, Guid schoolId, List<Guid> permissionIds);

        // Permission Checking
        Task<CheckPermissionResponse> CheckUserPermissionAsync(CheckPermissionRequest request);

        // Users with roles
        Task<UserListWithRolesResponse> GetUsersWithRolesAsync(Guid schoolId, int page = 1, int pageSize = 50, bool staffOnly = false);
        Task<UserWithRolesResponse> ProvisionStaffLoginAsync(Guid staffId, Guid schoolId);

        // Stats
        Task<RoleStatsResponse> GetRoleStatsAsync(Guid schoolId);

        // Seed
        Task EnsureSystemRolesAsync(Guid schoolId);
    }

    public class PermissionsService : IPermissionsService
    {
        private readonly AppDbContext _context;

        public PermissionsService(AppDbContext context)
        {
            _context = context;
        }

        // --- Static permission definitions ---------------------------------------

        private static readonly Dictionary<string, string[]> ModuleActions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Students"]        = new[] { "View", "Create", "Edit", "Delete", "Export" },
            ["Staff"]           = new[] { "View", "Create", "Edit", "Delete", "Export" },
            ["Admissions"]      = new[] { "View", "Create", "Edit", "Delete", "Approve" },
            ["Attendance"]      = new[] { "View", "Create", "Edit", "Delete", "Export" },
            ["Fees"]            = new[] { "View", "Create", "Edit", "Delete", "Approve", "Export" },
            ["Timetable"]       = new[] { "View", "Create", "Edit", "Delete" },
            ["Examinations"]    = new[] { "View", "Create", "Edit", "Delete", "Approve", "Export" },
            ["Grades"]          = new[] { "View", "Create", "Edit", "Delete", "Export" },
            ["Library"]         = new[] { "View", "Create", "Edit", "Delete" },
            ["Transport"]       = new[] { "View", "Create", "Edit", "Delete" },
            ["Hostel"]          = new[] { "View", "Create", "Edit", "Delete" },
            ["Health"]          = new[] { "View", "Create", "Edit", "Delete" },
            ["Payroll"]         = new[] { "View", "Create", "Edit", "Delete", "Approve", "Export" },
            ["Communication"]   = new[] { "View", "Create", "Edit", "Delete" },
            ["Announcements"]   = new[] { "View", "Create", "Edit", "Delete" },
            ["Analytics"]       = new[] { "View", "Export" },
            ["Reports"]         = new[] { "View", "Export" },
            ["Certificates"]    = new[] { "View", "Create", "Export" },
            ["Settings"]        = new[] { "View", "Edit" },
            ["UserManagement"]  = new[] { "View", "Create", "Edit", "Delete" },
        };

        // System role name ? display name, description, permission set
        private static readonly Dictionary<string, string> SystemRoleDisplayNames = new(StringComparer.OrdinalIgnoreCase)
        {
            [StatusConstants.Roles.Admin]               = "Administrator",
            ["Principal"]           = "Principal",
            ["Vice Principal"]      = "Vice Principal",
            ["Head of Department"]  = "Head of Department",
            ["Class Teacher"]       = "Class Teacher",
            ["Teacher"]             = "Subject Teacher",
            ["Accountant"]          = "Accountant / Finance Officer",
            ["HR Manager"]          = "HR Manager",
            ["Librarian"]           = "Librarian",
            ["Transport Manager"]   = "Transport Manager",
            ["Hostel Warden"]       = "Hostel Warden",
            ["Admissions Officer"]  = "Admissions Officer",
            ["Counselor"]           = "Counselor / Student Welfare",
        };

        private static readonly Dictionary<string, string> SystemRoleDescriptions = new(StringComparer.OrdinalIgnoreCase)
        {
            [StatusConstants.Roles.Admin]               = "Full system access. Manages all modules, users, roles, and school settings.",
            ["Principal"]           = "School head. Full academic control, student & staff management, and financial oversight.",
            ["Vice Principal"]      = "Deputy head. Academic management, exams, timetable, attendance. No financial access.",
            ["Head of Department"]  = "Department lead. Manages department timetable, exams, grades, and staff attendance.",
            ["Class Teacher"]       = "Class in-charge. Full access to class students, attendance, marks, and parent communication.",
            ["Teacher"]             = "Subject teacher. Marks attendance, enters exam marks, views timetable and student profiles.",
            ["Accountant"]          = "Finance officer. Full access to fees, payroll, and financial reports. No academic access.",
            ["HR Manager"]          = "HR officer. Staff management, payroll processing, attendance, and user account management.",
            ["Librarian"]           = "Library in-charge. Manages books, issues, returns, and fines. View-only student/staff access.",
            ["Transport Manager"]   = "Transport in-charge. Manages routes, buses, and driver assignments. View-only student data.",
            ["Hostel Warden"]       = "Hostel in-charge. Room allocation, student health records, and facilities management.",
            ["Admissions Officer"]  = "Handles new admissions, enrolment, fee initiation, and parent communication.",
            ["Counselor"]           = "Student welfare. Manages health records, counseling notes, and wellbeing communication.",
        };

        // System role name ? set of "Module.Action" strings it gets
        private static readonly Dictionary<string, HashSet<string>> SystemRolePermissions = new(StringComparer.OrdinalIgnoreCase)
        {
            // -- Tier 1: Leadership ----------------------------------------------
            [StatusConstants.Roles.Admin] = BuildAllPermissions(),

            ["Principal"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Create","Students.Edit","Students.Delete","Students.Export",
                "Admissions.View","Admissions.Create","Admissions.Edit","Admissions.Approve",
                "Staff.View","Staff.Create","Staff.Edit","Staff.Export",
                "Attendance.View","Attendance.Create","Attendance.Edit","Attendance.Export",
                "Fees.View","Fees.Approve","Fees.Export",
                "Timetable.View","Timetable.Create","Timetable.Edit","Timetable.Delete",
                "Examinations.View","Examinations.Create","Examinations.Edit","Examinations.Delete","Examinations.Approve","Examinations.Export",
                "Grades.View","Grades.Create","Grades.Edit","Grades.Export",
                "Library.View","Library.Create","Library.Edit",
                "Transport.View","Transport.Create","Transport.Edit",
                "Hostel.View","Hostel.Create","Hostel.Edit",
                "Health.View","Health.Create","Health.Edit","Health.Delete",
                "Payroll.View","Payroll.Export",
                "Communication.View","Communication.Create","Communication.Edit","Communication.Delete",
                "Announcements.View","Announcements.Create","Announcements.Edit","Announcements.Delete",
                "Analytics.View","Analytics.Export",
                "Reports.View","Reports.Export",
                "Certificates.View","Certificates.Create","Certificates.Export",
                "Settings.View",
                "UserManagement.View","UserManagement.Create","UserManagement.Edit",
            },

            ["Vice Principal"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Create","Students.Edit","Students.Export",
                "Admissions.View","Admissions.Create","Admissions.Edit",
                "Staff.View",
                "Attendance.View","Attendance.Create","Attendance.Edit","Attendance.Export",
                "Fees.View",
                "Timetable.View","Timetable.Create","Timetable.Edit","Timetable.Delete",
                "Examinations.View","Examinations.Create","Examinations.Edit","Examinations.Approve","Examinations.Export",
                "Grades.View","Grades.Create","Grades.Edit","Grades.Export",
                "Library.View","Transport.View","Hostel.View",
                "Health.View","Health.Create","Health.Edit",
                "Communication.View","Communication.Create","Communication.Edit","Communication.Delete",
                "Announcements.View","Announcements.Create","Announcements.Edit","Announcements.Delete",
                "Analytics.View","Analytics.Export",
                "Reports.View","Reports.Export",
                "Certificates.View","Certificates.Create","Certificates.Export",
                "Settings.View",
                "UserManagement.View",
            },

            // -- Tier 2: Academic ------------------------------------------------
            ["Head of Department"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Edit",
                "Staff.View",
                "Attendance.View","Attendance.Create","Attendance.Edit","Attendance.Export",
                "Timetable.View","Timetable.Create","Timetable.Edit",
                "Examinations.View","Examinations.Create","Examinations.Edit","Examinations.Approve","Examinations.Export",
                "Grades.View","Grades.Create","Grades.Edit","Grades.Export",
                "Library.View",
                "Communication.View","Communication.Create","Communication.Edit",
                "Announcements.View","Announcements.Create","Announcements.Edit",
                "Analytics.View",
                "Reports.View","Reports.Export",
                "Certificates.View",
            },

            ["Class Teacher"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Edit",
                "Attendance.View","Attendance.Create","Attendance.Edit",
                "Timetable.View",
                "Examinations.View","Examinations.Create","Examinations.Edit",
                "Grades.View","Grades.Create","Grades.Edit",
                "Library.View",
                "Health.View",
                "Communication.View","Communication.Create","Communication.Edit",
                "Announcements.View","Announcements.Create",
                "Reports.View","Reports.Export",
                "Certificates.View",
            },

            ["Teacher"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View",
                "Attendance.View","Attendance.Create","Attendance.Edit",
                "Timetable.View",
                "Examinations.View","Examinations.Create","Examinations.Edit",
                "Grades.View","Grades.Create","Grades.Edit",
                "Library.View",
                "Communication.View","Communication.Create",
                "Announcements.View",
                "Reports.View",
            },

            // -- Tier 3: Finance & HR --------------------------------------------
            ["Accountant"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Export",
                "Staff.View",
                "Fees.View","Fees.Create","Fees.Edit","Fees.Delete","Fees.Approve","Fees.Export",
                "Payroll.View","Payroll.Create","Payroll.Edit","Payroll.Approve","Payroll.Export",
                "Analytics.View","Analytics.Export",
                "Reports.View","Reports.Export",
                "Communication.View",
            },

            ["HR Manager"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View",
                "Staff.View","Staff.Create","Staff.Edit","Staff.Export",
                "Attendance.View","Attendance.Create","Attendance.Edit","Attendance.Export",
                "Payroll.View","Payroll.Create","Payroll.Edit","Payroll.Approve","Payroll.Export",
                "Analytics.View","Analytics.Export",
                "Reports.View","Reports.Export",
                "Communication.View","Communication.Create",
                "Announcements.View","Announcements.Create",
                "UserManagement.View","UserManagement.Create","UserManagement.Edit",
            },

            // -- Tier 4: Domain Operations ---------------------------------------
            ["Librarian"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Staff.View",
                "Library.View","Library.Create","Library.Edit","Library.Delete",
                "Reports.View","Reports.Export",
                "Communication.View",
            },

            ["Transport Manager"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View",
                "Transport.View","Transport.Create","Transport.Edit","Transport.Delete",
                "Reports.View","Reports.Export",
                "Communication.View",
                "Announcements.View",
            },

            ["Hostel Warden"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View",
                "Attendance.View","Attendance.Create",
                "Hostel.View","Hostel.Create","Hostel.Edit","Hostel.Delete",
                "Health.View","Health.Create","Health.Edit",
                "Communication.View","Communication.Create",
                "Announcements.View","Announcements.Create",
                "Reports.View","Reports.Export",
            },

            ["Admissions Officer"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View","Students.Create","Students.Edit",
                "Admissions.View","Admissions.Create","Admissions.Edit","Admissions.Approve",
                "Fees.View",
                "Communication.View","Communication.Create","Communication.Edit",
                "Announcements.View",
                "Certificates.View",
                "Reports.View",
            },

            ["Counselor"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Students.View",
                "Attendance.View",
                "Health.View","Health.Create","Health.Edit",
                "Communication.View","Communication.Create","Communication.Edit",
                "Announcements.View","Announcements.Create",
                "Reports.View",
            },
        };

        private static HashSet<string> BuildAllPermissions()
        {
            var all = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var (module, actions) in ModuleActions)
                foreach (var action in actions)
                    all.Add($"{module}.{action}");
            return all;
        }

        // --- Seed -----------------------------------------------------------------

        public async Task EnsureSystemRolesAsync(Guid schoolId)
        {
            // 1. Seed global permissions if missing
            var existingPermissionNames = await _context.Permissions
                .Select(p => p.Name)
                .ToListAsync();

            var existingSet = new HashSet<string>(existingPermissionNames, StringComparer.OrdinalIgnoreCase);
            var toAdd = new List<Permission>();

            foreach (var (module, actions) in ModuleActions)
            {
                foreach (var action in actions)
                {
                    var name = $"{module}.{action}";
                    if (existingSet.Contains(name)) continue;
                    toAdd.Add(new Permission
                    {
                        Id = Guid.NewGuid(),
                        Name = name,
                        DisplayName = $"{action} {module}",
                        Module = module,
                        Action = action,
                        Description = $"Allows {action.ToLower()} access to {module}",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
            }

            if (toAdd.Any())
            {
                _context.Permissions.AddRange(toAdd);
                await _context.SaveChangesAsync();
            }

            // 2. Seed system roles for the school
            var allPermissions = await _context.Permissions.ToDictionaryAsync(p => p.Name, StringComparer.OrdinalIgnoreCase);

            foreach (var (roleName, permNames) in SystemRolePermissions)
            {
                var existingRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.SchoolId == schoolId && r.Name == roleName && r.IsSystemRole && !r.IsDeleted);

                Guid roleId;

                if (existingRole == null)
                {
                    var role = new Role
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        Name = roleName,
                        DisplayName = SystemRoleDisplayNames.TryGetValue(roleName, out var dn) ? dn : roleName,
                        Description = SystemRoleDescriptions.TryGetValue(roleName, out var desc) ? desc : $"System role: {roleName}",
                        RoleType = "System",
                        IsSystemRole = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };
                    _context.Roles.Add(role);
                    await _context.SaveChangesAsync();
                    roleId = role.Id;
                }
                else
                {
                    roleId = existingRole.Id;
                }

                // Add any missing permissions for this system role
                var existingRolePermIds = await _context.RolePermissions
                    .Where(rp => rp.RoleId == roleId && !rp.IsDeleted)
                    .Select(rp => rp.PermissionId)
                    .ToListAsync();

                var existingRolePermSet = new HashSet<Guid>(existingRolePermIds);

                foreach (var permName in permNames)
                {
                    if (!allPermissions.TryGetValue(permName, out var perm)) continue;
                    if (existingRolePermSet.Contains(perm.Id)) continue;

                    _context.RolePermissions.Add(new RolePermission
                    {
                        Id = Guid.NewGuid(),
                        RoleId = roleId,
                        PermissionId = perm.Id,
                        IsGranted = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }

                await _context.SaveChangesAsync();
            }
        }

        // --- Roles ----------------------------------------------------------------

        public async Task<RoleListResponse> GetRolesAsync(Guid schoolId, int page = 1, int pageSize = 50)
        {
            // Normalize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 200) pageSize = 200;

            // Auto-seed on first load
            var hasRoles = await _context.Roles
                .AnyAsync(r => r.SchoolId == schoolId && !r.IsDeleted);
            if (!hasRoles)
                await EnsureSystemRolesAsync(schoolId);

            var query = _context.Roles
                .Where(r => (r.SchoolId == schoolId || r.IsSystemRole) && !r.IsDeleted);

            var total = await query.CountAsync();

            // Fetch roles with counts using efficient subqueries
            var roles = await query
                .OrderByDescending(r => r.IsSystemRole)
                .ThenBy(r => r.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    Role = r,
                    UserCount = _context.UserRoles.Count(ur => ur.RoleId == r.Id && ur.SchoolId == schoolId && !ur.IsDeleted),
                    PermissionCount = _context.RolePermissions.Count(rp => rp.RoleId == r.Id && rp.IsGranted && !rp.IsDeleted),
                })
                .ToListAsync();

            var result = roles.Select(x => new RoleResponse
            {
                Id = x.Role.Id,
                SchoolId = x.Role.SchoolId,
                Name = x.Role.Name,
                DisplayName = x.Role.DisplayName,
                Description = x.Role.Description,
                RoleType = x.Role.RoleType,
                IsSystemRole = x.Role.IsSystemRole,
                IsActive = !x.Role.IsDeleted,
                UserCount = x.UserCount,
                PermissionCount = x.PermissionCount,
                CreatedAt = x.Role.CreatedAt,
                UpdatedAt = x.Role.UpdatedAt,
            }).ToList();

            return new RoleListResponse
            {
                Roles = result,
                Items = result,
                Total = total,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize),
            };
        }

        public async Task<RoleResponse> GetRoleByIdAsync(Guid id, Guid schoolId)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == id && (r.SchoolId == schoolId || r.IsSystemRole) && !r.IsDeleted);

            if (role == null) throw new KeyNotFoundException("Role not found");

            var userCount = await _context.UserRoles.CountAsync(ur => ur.RoleId == id && ur.SchoolId == schoolId && !ur.IsDeleted);
            var permCount = await _context.RolePermissions.CountAsync(rp => rp.RoleId == id && rp.IsGranted && !rp.IsDeleted);

            return new RoleResponse
            {
                Id = role.Id,
                SchoolId = role.SchoolId,
                Name = role.Name,
                DisplayName = role.DisplayName,
                Description = role.Description,
                RoleType = role.RoleType,
                IsSystemRole = role.IsSystemRole,
                IsActive = !role.IsDeleted,
                UserCount = userCount,
                PermissionCount = permCount,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt,
            };
        }

        public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request)
        {
            // VALIDATION: Name required
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Role name is required");

            var trimmedName = request.Name.Trim();
            if (trimmedName.Length < 2)
                throw new ArgumentException("Role name must be at least 2 characters");
            if (trimmedName.Length > 100)
                throw new ArgumentException("Role name cannot exceed 100 characters");

            // VALIDATION: DisplayName length
            if (!string.IsNullOrEmpty(request.DisplayName) && request.DisplayName.Trim().Length > 100)
                throw new ArgumentException("Display name cannot exceed 100 characters");

            // VALIDATION: Description length
            if (!string.IsNullOrEmpty(request.Description) && request.Description.Trim().Length > 500)
                throw new ArgumentException("Description cannot exceed 500 characters");

            // VALIDATION: RoleType must be Custom (system roles are seeded internally)
            if (!string.IsNullOrEmpty(request.RoleType))
            {
                var normalizedType = request.RoleType.Trim();
                if (!normalizedType.Equals("Custom", StringComparison.OrdinalIgnoreCase) &&
                    !normalizedType.Equals("System", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("RoleType must be 'Custom' or 'System'");
            }

            // VALIDATION: SchoolId must be provided
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required");

            // Validate unique name in school (case-insensitive)
            var exists = await _context.Roles
                .AnyAsync(r => r.SchoolId == request.SchoolId &&
                               r.Name.ToLower() == trimmedName.ToLower() && !r.IsDeleted);
            if (exists)
                throw new InvalidOperationException($"A role named '{trimmedName}' already exists in this school");

            var role = new Role
            {
                Name = trimmedName,
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                DisplayName = string.IsNullOrEmpty(request.DisplayName) ? trimmedName : request.DisplayName.Trim(),
                Description = request.Description?.Trim(),
                RoleType = "Custom",
                IsSystemRole = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy == Guid.Empty ? null : request.CreatedBy,
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
            return await GetRoleByIdAsync(role.Id, request.SchoolId);
        }

        public async Task<RoleResponse> UpdateRoleAsync(Guid id, UpdateRoleRequest request, Guid schoolId)
        {
            if (id == Guid.Empty)
                throw new ArgumentException("Role ID is required");
            if (schoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required");

            // VALIDATION: DisplayName length
            if (!string.IsNullOrEmpty(request.DisplayName) && request.DisplayName.Trim().Length > 100)
                throw new ArgumentException("Display name cannot exceed 100 characters");

            // VALIDATION: Description length
            if (!string.IsNullOrEmpty(request.Description) && request.Description.Trim().Length > 500)
                throw new ArgumentException("Description cannot exceed 500 characters");

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId && !r.IsDeleted);

            if (role == null) throw new KeyNotFoundException("Role not found");
            if (role.IsSystemRole) throw new InvalidOperationException("Cannot modify system roles");

            role.DisplayName = string.IsNullOrEmpty(request.DisplayName) ? role.DisplayName : request.DisplayName.Trim();
            role.Description = string.IsNullOrEmpty(request.Description) ? role.Description : request.Description.Trim();
            role.UpdatedAt = DateTime.UtcNow;
            role.UpdatedBy = request.UpdatedBy == Guid.Empty ? null : request.UpdatedBy;

            await _context.SaveChangesAsync();
            return await GetRoleByIdAsync(id, schoolId);
        }

        public async Task DeleteRoleAsync(Guid id, Guid schoolId)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId && !r.IsDeleted);

            if (role == null) throw new KeyNotFoundException("Role not found");
            if (role.IsSystemRole) throw new InvalidOperationException("Cannot delete system roles");

            var hasActiveUsers = await _context.UserRoles
                .AnyAsync(ur => ur.RoleId == id && !ur.IsDeleted);
            if (hasActiveUsers)
                throw new InvalidOperationException("Cannot delete a role that has users assigned to it. Remove all user assignments first.");

            // Soft delete
            role.IsDeleted = true;
            role.DeletedAt = DateTime.UtcNow;
            role.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        // --- Permissions ----------------------------------------------------------

        public async Task<PermissionListResponse> GetPermissionsAsync(string? module = null)
        {
            var query = _context.Permissions.Where(p => !p.IsDeleted);
            if (!string.IsNullOrEmpty(module))
                query = query.Where(p => p.Module == module);

            var permissions = await query.OrderBy(p => p.Module).ThenBy(p => p.Action).ToListAsync();
            return new PermissionListResponse
            {
                Permissions = permissions.Select(MapToPermissionResponse).ToList(),
                Items = permissions.Select(MapToPermissionResponse).ToList(),
                TotalCount = permissions.Count,
            };
        }

        public async Task<List<PermissionGroupResponse>> GetPermissionsGroupedAsync()
        {
            var permissions = await _context.Permissions
                .Where(p => !p.IsDeleted)
                .OrderBy(p => p.Module)
                .ThenBy(p => p.Action)
                .ToListAsync();

            return permissions
                .GroupBy(p => p.Module)
                .OrderBy(g => g.Key)
                .Select(g => new PermissionGroupResponse
                {
                    Module = g.Key,
                    Permissions = g.Select(MapToPermissionResponse).ToList(),
                })
                .ToList();
        }

        public async Task<PermissionResponse> CreatePermissionAsync(CreatePermissionRequest request)
        {
            // VALIDATION: Module required
            if (string.IsNullOrWhiteSpace(request.Module))
                throw new ArgumentException("Module is required");

            // VALIDATION: Action required
            if (string.IsNullOrWhiteSpace(request.Action))
                throw new ArgumentException("Action is required");

            var module = request.Module.Trim();
            var action = request.Action.Trim();

            // VALIDATION: Module must be a known module
            if (!ModuleActions.ContainsKey(module))
                throw new ArgumentException($"Unknown module '{module}'. Valid modules: {string.Join(", ", ModuleActions.Keys)}");

            // VALIDATION: Action must be a known action for this module
            var validActions = ModuleActions[module];
            if (!validActions.Contains(action, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Invalid action '{action}' for module '{module}'. Valid actions: {string.Join(", ", validActions)}");

            // VALIDATION: Description length
            if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > 500)
                throw new ArgumentException("Description cannot exceed 500 characters");

            // VALIDATION: Duplicate check
            var permName = $"{module}.{action}";
            var duplicate = await _context.Permissions
                .AnyAsync(p => p.Name == permName && !p.IsDeleted);
            if (duplicate)
                throw new InvalidOperationException($"Permission '{permName}' already exists");

            var permission = new Permission
            {
                Id = Guid.NewGuid(),
                Name = permName,
                DisplayName = request.DisplayName ?? $"{action} {module}",
                Description = request.Description,
                Module = module,
                Action = action,
                ResourcePattern = request.ResourcePattern,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _context.Permissions.Add(permission);
            await _context.SaveChangesAsync();
            return MapToPermissionResponse(permission);
        }

        // --- User Role Assignments ------------------------------------------------

        public async Task<UserRoleResponse> AssignRoleToUserAsync(AssignRoleRequest request)
        {
            // VALIDATION: Required fields
            if (request.UserId == Guid.Empty)
                throw new ArgumentException("UserId is required");
            if (request.RoleId == Guid.Empty)
                throw new ArgumentException("RoleId is required");
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required");

            // VALIDATION: Date range
            if (request.ValidFrom.HasValue && request.ValidTo.HasValue &&
                request.ValidTo <= request.ValidFrom)
                throw new ArgumentException("ValidTo must be after ValidFrom");

            if (request.ValidTo.HasValue && request.ValidTo <= DateTime.UtcNow)
                throw new ArgumentException("ValidTo must be a future date");

            // VALIDATION: User exists in this school
            var userExists = await _context.UserLogins
                .AnyAsync(u => u.Id == request.UserId && u.SchoolId == request.SchoolId && !u.IsDeleted);
            if (!userExists)
                throw new KeyNotFoundException("User not found in this school");

            // VALIDATION: Role exists for this school
            var roleExists = await _context.Roles
                .AnyAsync(r => r.Id == request.RoleId &&
                               (r.SchoolId == request.SchoolId || r.IsSystemRole) &&
                               !r.IsDeleted);
            if (!roleExists)
                throw new KeyNotFoundException("Role not found for this school");

            var existing = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId && ur.SchoolId == request.SchoolId && !ur.IsDeleted);

            if (existing != null)
                throw new InvalidOperationException("User already has this role assigned");

            var userRole = new UserRole
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                UserId = request.UserId,
                RoleId = request.RoleId,
                ValidFrom = request.ValidFrom ?? DateTime.UtcNow,
                ValidTo = request.ValidTo,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy == Guid.Empty ? null : request.CreatedBy,
            };

            _context.UserRoles.Add(userRole);
            await _context.SaveChangesAsync();
            return await MapToUserRoleResponse(userRole);
        }

        public async Task<List<UserRoleResponse>> GetUserRolesAsync(Guid userId, Guid schoolId)
        {
            var userRoles = await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.UserId == userId && ur.SchoolId == schoolId && !ur.IsDeleted)
                .ToListAsync();

            var responses = new List<UserRoleResponse>();
            foreach (var ur in userRoles)
                responses.Add(await MapToUserRoleResponse(ur));
            return responses;
        }

        public async Task RemoveUserRoleAsync(Guid userId, Guid roleId, Guid schoolId)
        {
            var userRole = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId && ur.SchoolId == schoolId && !ur.IsDeleted);

            if (userRole == null) throw new KeyNotFoundException("User role assignment not found");

            userRole.IsDeleted = true;
            userRole.DeletedAt = DateTime.UtcNow;
            userRole.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // --- Role Permission Assignments ------------------------------------------

        public async Task<RolePermissionResponse> AssignPermissionsToRoleAsync(AssignPermissionsRequest request)
        {
            var existing = await _context.RolePermissions
                .Where(rp => rp.RoleId == request.RoleId)
                .ToListAsync();

            _context.RolePermissions.RemoveRange(existing);

            foreach (var permissionId in request.PermissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = request.RoleId,
                    PermissionId = permissionId,
                    IsGranted = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            await _context.SaveChangesAsync();
            var perms = await _context.Permissions
                .Where(p => request.PermissionIds.Contains(p.Id) && !p.IsDeleted)
                .ToListAsync();

            return new RolePermissionResponse
            {
                RoleId = request.RoleId,
                PermissionIds = request.PermissionIds,
                Permissions = perms.Select(MapToPermissionResponse).ToList(),
            };
        }

        public async Task<List<RolePermissionResponse>> GetRolePermissionsAsync(Guid roleId)
        {
            var rolePermissions = await _context.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId && rp.IsGranted && !rp.IsDeleted)
                .ToListAsync();

            return rolePermissions.Select(rp => new RolePermissionResponse
            {
                RoleId = rp.RoleId,
                PermissionIds = new List<Guid> { rp.PermissionId },
                PermissionName = rp.Permission?.Name,
                PermissionDisplayName = rp.Permission?.DisplayName,
            }).ToList();
        }

        public async Task<List<Guid>> GetRolePermissionIdsAsync(Guid roleId)
        {
            return await _context.RolePermissions
                .Where(rp => rp.RoleId == roleId && rp.IsGranted && !rp.IsDeleted)
                .Select(rp => rp.PermissionId)
                .ToListAsync();
        }

        public async Task SetRolePermissionsAsync(Guid roleId, Guid schoolId, List<Guid> permissionIds)
        {
            // VALIDATION: Required IDs
            if (roleId == Guid.Empty)
                throw new ArgumentException("RoleId is required");
            if (schoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required");

            // VALIDATION: PermissionIds must not be null (empty list is allowed - clears all permissions)
            if (permissionIds == null)
                throw new ArgumentException("PermissionIds must not be null");

            // VALIDATION: Max 500 permissions at once
            if (permissionIds.Count > 500)
                throw new ArgumentException("Cannot assign more than 500 permissions at once");

            // Validate role belongs to this school (or is system role for this school)
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == roleId && (r.SchoolId == schoolId || r.IsSystemRole) && !r.IsDeleted);
            if (role == null) throw new KeyNotFoundException("Role not found");
            
            // Prevent editing system roles (UI should already prevent this, but enforce on backend)
            if (role.IsSystemRole) 
                throw new InvalidOperationException("Cannot modify permissions for system roles");

            // VALIDATION: All provided permission IDs must exist
            if (permissionIds.Any())
            {
                var existingPermIds = await _context.Permissions
                    .Where(p => permissionIds.Contains(p.Id) && !p.IsDeleted)
                    .Select(p => p.Id)
                    .ToListAsync();
                var invalidIds = permissionIds.Except(existingPermIds).ToList();
                if (invalidIds.Any())
                    throw new ArgumentException($"One or more permission IDs do not exist: {string.Join(", ", invalidIds.Take(5))}");
            }

            // Full replace
            var existing = await _context.RolePermissions
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            foreach (var permId in permissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = roleId,
                    PermissionId = permId,
                    IsGranted = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            await _context.SaveChangesAsync();
        }

        // --- Permission Checking --------------------------------------------------

        public async Task<CheckPermissionResponse> CheckUserPermissionAsync(CheckPermissionRequest request)
        {
            // VALIDATION: UserId required
            if (request.UserId == Guid.Empty)
                throw new ArgumentException("UserId is required");
            if (request.SchoolId == Guid.Empty)
                throw new ArgumentException("SchoolId is required");

            // Build permission name from Module.Action if PermissionName not supplied
            var permName = request.PermissionName;
            if (string.IsNullOrWhiteSpace(permName))
            {
                if (string.IsNullOrWhiteSpace(request.Module) || string.IsNullOrWhiteSpace(request.Action))
                    throw new ArgumentException("Either PermissionName or both Module and Action are required");
                permName = $"{request.Module.Trim()}.{request.Action.Trim()}";
            }

            var userRoleIds = await _context.UserRoles
                .Where(ur => ur.UserId == request.UserId && ur.SchoolId == request.SchoolId && !ur.IsDeleted &&
                             (ur.ValidTo == null || ur.ValidTo > DateTime.UtcNow))
                .Select(ur => ur.RoleId)
                .ToListAsync();

            if (!userRoleIds.Any())
                return new CheckPermissionResponse { UserId = request.UserId, PermissionName = permName, HasPermission = false };

            var hasPermission = await _context.RolePermissions
                .Include(rp => rp.Permission)
                .AnyAsync(rp => userRoleIds.Contains(rp.RoleId) &&
                               rp.Permission!.Name == permName &&
                               rp.IsGranted && !rp.IsDeleted);

            return new CheckPermissionResponse
            {
                UserId = request.UserId,
                PermissionName = permName,
                HasPermission = hasPermission,
            };
        }

        // --- Users with Roles -----------------------------------------------------

        /// <summary>
        /// Maps a staff designation string to a UserLogin.Role portal-type string.
        /// </summary>
        private static string DesignationToLoginRole(string designation)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Principal"]           = "principal",
                ["Vice Principal"]      = "vice principal",
                ["Head of Department"]  = "head of department",
                ["HOD"]                 = "head of department",
                ["Class Teacher"]       = "class teacher",
                ["Teacher"]             = "teacher",
                ["Subject Teacher"]     = "teacher",
                ["Accountant"]          = "accountant",
                ["HR Manager"]          = "hr manager",
                ["Librarian"]           = "librarian",
                ["Transport Manager"]   = "transport manager",
                ["Hostel Warden"]       = "hostel warden",
                ["Warden"]              = "hostel warden",
                ["Admissions Officer"]  = "admissions officer",
                ["Counselor"]           = "counselor",
            };
            return map.TryGetValue(designation ?? "", out var r) ? r : "staff";
        }

        /// <summary>
        /// Maps a designation to the system Role.Name used in the Roles table.
        /// Falls back to null if no matching system role exists.
        /// </summary>
        private static string? DesignationToRoleName(string designation)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Principal"]           = "Principal",
                ["Vice Principal"]      = "Vice Principal",
                ["Head of Department"]  = "Head of Department",
                ["HOD"]                 = "Head of Department",
                ["Class Teacher"]       = "Class Teacher",
                ["Teacher"]             = "Teacher",
                ["Subject Teacher"]     = "Teacher",
                ["Accountant"]          = "Accountant",
                ["HR Manager"]          = "HR Manager",
                ["Librarian"]           = "Librarian",
                ["Transport Manager"]   = "Transport Manager",
                ["Hostel Warden"]       = "Hostel Warden",
                ["Warden"]              = "Hostel Warden",
                ["Admissions Officer"]  = "Admissions Officer",
                ["Counselor"]           = "Counselor",
            };
            return map.TryGetValue(designation ?? "", out var r) ? r : null;
        }

        public async Task<UserListWithRolesResponse> GetUsersWithRolesAsync(Guid schoolId, int page = 1, int pageSize = 50, bool staffOnly = false)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 200) pageSize = 200;

            // ── Step 1: All staff members (authoritative staff registry) ──────
            var allStaff = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
                .OrderBy(s => s.FirstName).ThenBy(s => s.LastName)
                .ToListAsync();

            var staffEmails = allStaff.Select(s => s.Email.ToLower()).ToHashSet(StringComparer.OrdinalIgnoreCase);

            // ── Step 2: Admin/system logins not in StaffMembers (e.g. Admin user) ──
            var nonStaffRoles = new[] { "parent", "student" };
            var adminLogins = await _context.UserLogins
                .Where(u => u.SchoolId == schoolId && !u.IsDeleted
                    && !nonStaffRoles.Contains((u.Role ?? "").ToLower())
                    && !staffEmails.Contains(u.Email.ToLower()))
                .ToListAsync();

            // ── Step 3: UserLogins for the staff members ──────────────────────
            var staffLoginList = await _context.UserLogins
                .Where(u => u.SchoolId == schoolId && !u.IsDeleted
                    && staffEmails.Contains(u.Email.ToLower()))
                .ToListAsync();
            var loginByEmail = staffLoginList.ToDictionary(u => u.Email.ToLower(), u => u, StringComparer.OrdinalIgnoreCase);

            // ── Step 4: Role assignments for all known login IDs ──────────────
            var allLoginIds = staffLoginList.Select(u => u.Id)
                .Concat(adminLogins.Select(u => u.Id)).ToList();
            var userRoles = await _context.UserRoles
                .Where(ur => allLoginIds.Contains(ur.UserId) && ur.SchoolId == schoolId && !ur.IsDeleted)
                .Include(ur => ur.Role).AsNoTracking().ToListAsync();
            var rolesByUser = userRoles
                .Where(ur => ur.Role != null)
                .GroupBy(ur => ur.UserId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // ── Step 5: Build combined list ───────────────────────────────────
            // Staff members first
            var staffEntries = allStaff.Select(s =>
            {
                loginByEmail.TryGetValue(s.Email.ToLower(), out var login);
                var roles = login != null && rolesByUser.TryGetValue(login.Id, out var r) ? r : new List<UserRole>();
                return new UserWithRolesResponse
                {
                    Id = login?.Id ?? s.Id,
                    Username = login?.Username ?? s.EmployeeId ?? "",
                    Email = s.Email,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    PrimaryRole = login?.Role ?? DesignationToLoginRole(s.Designation),
                    Status = s.Status ?? "active",
                    LastLogin = login?.LastLogin,
                    CreatedAt = s.CreatedAt,
                    HasLoginAccount = login != null,
                    StaffId = s.Id,
                    AssignedRoles = roles.Where(ur => ur.Role != null)
                        .Select(ur => new RoleBasicDto { Id = ur.Role!.Id, Name = ur.Role.Name, DisplayName = ur.Role.DisplayName, IsActive = !ur.Role.IsDeleted })
                        .ToList(),
                };
            }).ToList();

            // Admin/system logins not in StaffMembers
            var adminEntries = adminLogins.Select(u =>
            {
                var roles = rolesByUser.TryGetValue(u.Id, out var r) ? r : new List<UserRole>();
                return new UserWithRolesResponse
                {
                    Id = u.Id,
                    Username = u.Username ?? "",
                    Email = u.Email ?? "",
                    FirstName = u.FirstName ?? "",
                    LastName = u.LastName ?? "",
                    PrimaryRole = u.Role ?? "Admin",
                    Status = u.Status ?? "active",
                    LastLogin = u.LastLogin,
                    CreatedAt = u.CreatedAt,
                    HasLoginAccount = true,
                    StaffId = null,
                    AssignedRoles = roles.Where(ur => ur.Role != null)
                        .Select(ur => new RoleBasicDto { Id = ur.Role!.Id, Name = ur.Role.Name, DisplayName = ur.Role.DisplayName, IsActive = !ur.Role.IsDeleted })
                        .ToList(),
                };
            }).ToList();

            // Combine: admin first, then staff sorted by name
            var combined = adminEntries
                .Concat(staffEntries.OrderBy(s => s.FirstName).ThenBy(s => s.LastName))
                .ToList();

            var total = combined.Count;
            var result = combined.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new UserListWithRolesResponse { Users = result, Total = total, Page = page, PageSize = pageSize };
        }

        public async Task<UserWithRolesResponse> ProvisionStaffLoginAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted)
                ?? throw new InvalidOperationException("Staff member not found.");

            // Check if login already exists
            var existing = await _context.UserLogins
                .FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Email.ToLower() == staff.Email.ToLower() && !u.IsDeleted);

            Guid loginId;
            if (existing != null)
            {
                loginId = existing.Id;
            }
            else
            {
                // Create UserLogin with designation-based role and a forced-change temp password
                var username = staff.Email.Split('@')[0].ToLower().Replace(".", "");
                var usernameExists = await _context.UserLogins.AnyAsync(u => u.Username == username && u.SchoolId == schoolId);
                if (usernameExists) username = username + staff.EmployeeId?.ToLower().Replace("-", "");

                var login = new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Email = staff.Email,
                    Username = username,
                    FirstName = staff.FirstName,
                    LastName = staff.LastName,
                    Role = DesignationToLoginRole(staff.Designation),
                    Status = staff.Status ?? "active",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("ChangeMe@123", workFactor: 12),
                    RequirePasswordChange = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _context.UserLogins.Add(login);
                await _context.SaveChangesAsync();
                loginId = login.Id;
            }

            // Auto-assign matching system role based on designation
            var roleName = DesignationToRoleName(staff.Designation);
            if (roleName != null)
            {
                var role = await _context.Roles
                    .FirstOrDefaultAsync(r => r.SchoolId == schoolId && r.Name == roleName && r.IsSystemRole && !r.IsDeleted);
                if (role != null)
                {
                    var alreadyAssigned = await _context.UserRoles
                        .AnyAsync(ur => ur.UserId == loginId && ur.RoleId == role.Id && ur.SchoolId == schoolId && !ur.IsDeleted);
                    if (!alreadyAssigned)
                    {
                        _context.UserRoles.Add(new UserRole
                        {
                            Id = Guid.NewGuid(),
                            UserId = loginId,
                            RoleId = role.Id,
                            SchoolId = schoolId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                        });
                        await _context.SaveChangesAsync();
                    }
                }
            }

            // Return the updated entry
            var updatedLogin = await _context.UserLogins.FirstAsync(u => u.Id == loginId);
            var assignedRoles = await _context.UserRoles
                .Where(ur => ur.UserId == loginId && ur.SchoolId == schoolId && !ur.IsDeleted)
                .Include(ur => ur.Role).AsNoTracking().ToListAsync();

            return new UserWithRolesResponse
            {
                Id = loginId,
                Username = updatedLogin.Username ?? "",
                Email = staff.Email,
                FirstName = staff.FirstName,
                LastName = staff.LastName,
                PrimaryRole = updatedLogin.Role ?? "staff",
                Status = staff.Status ?? "active",
                LastLogin = updatedLogin.LastLogin,
                CreatedAt = staff.CreatedAt,
                HasLoginAccount = true,
                StaffId = staffId,
                AssignedRoles = assignedRoles.Where(ur => ur.Role != null)
                    .Select(ur => new RoleBasicDto { Id = ur.Role!.Id, Name = ur.Role.Name, DisplayName = ur.Role.DisplayName, IsActive = !ur.Role.IsDeleted })
                    .ToList(),
            };
        }

        // --- Stats ----------------------------------------------------------------

        public async Task<RoleStatsResponse> GetRoleStatsAsync(Guid schoolId)
        {
            var totalRoles = await _context.Roles.CountAsync(r => (r.SchoolId == schoolId || r.IsSystemRole) && !r.IsDeleted);
            var customRoles = await _context.Roles.CountAsync(r => r.SchoolId == schoolId && !r.IsSystemRole && !r.IsDeleted);
            var systemRoles = await _context.Roles.CountAsync(r => r.SchoolId == schoolId && r.IsSystemRole && !r.IsDeleted);
            var usersWithRoles = await _context.UserRoles
                .Where(ur => ur.SchoolId == schoolId && !ur.IsDeleted)
                .Select(ur => ur.UserId)
                .Distinct()
                .CountAsync();
            var totalPermissions = await _context.Permissions.CountAsync(p => !p.IsDeleted);

            return new RoleStatsResponse
            {
                TotalRoles = totalRoles,
                CustomRoles = customRoles,
                SystemRoles = systemRoles,
                TotalUsersWithRoles = usersWithRoles,
                TotalPermissions = totalPermissions,
            };
        }

        // --- Mappers --------------------------------------------------------------

        private static PermissionResponse MapToPermissionResponse(Permission permission) =>
            new()
            {
                Id = permission.Id,
                Name = permission.Name,
                DisplayName = permission.DisplayName,
                Description = permission.Description,
                Module = permission.Module,
                Action = permission.Action,
                ResourcePattern = permission.ResourcePattern,
                IsActive = !permission.IsDeleted,
                CreatedAt = permission.CreatedAt,
            };

        private async Task<UserRoleResponse> MapToUserRoleResponse(UserRole userRole)
        {
            var role = userRole.Role ?? await _context.Roles.FindAsync(userRole.RoleId);
            return new UserRoleResponse
            {
                Id = userRole.Id,
                UserId = userRole.UserId,
                RoleId = userRole.RoleId,
                RoleName = role?.Name ?? string.Empty,
                RoleDisplayName = role?.DisplayName,
                ValidFrom = userRole.ValidFrom,
                ValidTo = userRole.ValidTo,
                IsActive = !userRole.IsDeleted,
                CreatedAt = userRole.CreatedAt,
            };
        }
    }
}

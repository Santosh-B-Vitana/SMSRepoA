using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IStaffService
    {
        Task<StaffListResponse> GetStaffMembersAsync(Guid schoolId, int page, int pageSize, string? search, string? status,
            string? department = null, string? designation = null, string? employmentType = null,
            string? sortBy = null, string? sortOrder = null);
        Task<StaffResponse?> GetStaffByIdAsync(Guid id, Guid schoolId);
        Task<StaffResponse> CreateStaffAsync(CreateStaffRequest request);
        Task<StaffResponse?> UpdateStaffAsync(Guid id, Guid schoolId, UpdateStaffRequest request);
        Task<bool> DeleteStaffAsync(Guid id, Guid schoolId);
        Task<StaffStatsResponse> GetStaffStatsAsync(Guid schoolId);
        Task<StaffDocumentDto> UploadDocumentAsync(Guid staffId, Guid schoolId, string documentType, string fileName, byte[] fileData);
        Task<string> UploadPhotoAsync(Guid staffId, Guid schoolId, string fileName, byte[] fileData);
        Task<bool> DeleteDocumentAsync(Guid documentId, Guid schoolId);
        Task<List<string>> GetDepartmentsAsync(Guid schoolId);
        Task<List<string>> GetDesignationsAsync(Guid schoolId);
        Task<List<StaffBasicResponse>> GetSubordinatesAsync(Guid staffId, Guid schoolId);
        Task<BulkOperationResult> BulkUpdateStaffStatusAsync(Guid schoolId, BulkUpdateStaffStatusRequest request);
        Task<BulkOperationResult> BulkImportStaffAsync(Guid schoolId, List<CreateStaffRequest> requests);
        Task<byte[]> ExportStaffToCsvAsync(Guid schoolId, string? department, string? status, string? designation);

        // Qualifications Management
        Task<List<QualificationDto>> GetQualificationsAsync(Guid staffId, Guid schoolId);
        Task<QualificationDto> AddQualificationAsync(Guid schoolId, Guid staffId, CreateQualificationDto dto, Guid userId);
        Task<QualificationDto> UpdateQualificationAsync(Guid schoolId, Guid qualificationId, UpdateQualificationDto dto);
        Task<bool> DeleteQualificationAsync(Guid schoolId, Guid qualificationId);

        // PF/ESI Management
        Task<PFESIDetailsDto> GetPFESIDetailsAsync(Guid staffId, Guid schoolId);
        Task<PFESIDetailsDto> UpdatePFESIDetailsAsync(Guid schoolId, Guid staffId, UpdatePFESIDto dto);

        // Bank Details
        Task<BankDetailsDto> GetBankDetailsAsync(Guid staffId, Guid schoolId);
        Task<BankDetailsDto> UpdateBankDetailsAsync(Guid schoolId, Guid staffId, UpdateBankDetailsDto dto);

        // Document Management (enhanced)
        Task<List<StaffDocumentDto>> GetStaffDocumentsAsync(Guid staffId, Guid schoolId);

        // Performance Management
        Task<List<PerformanceReviewDto>> GetPerformanceReviewsAsync(Guid staffId, Guid schoolId);
        Task<PerformanceReviewDto> AddPerformanceReviewAsync(Guid schoolId, Guid staffId, CreatePerformanceReviewDto dto, Guid userId);

        // Leave Balance
        Task<LeaveBalanceDto> GetStaffLeaveBalanceAsync(Guid staffId, Guid schoolId);
        Task<LeaveBalanceDto> UpdateLeaveBalanceAsync(Guid schoolId, Guid staffId, UpdateLeaveBalanceDto dto);

        /// <summary>Assign system roles to all active staff logins that are currently unroled.</summary>
        Task<int> BulkAutoAssignRolesAsync(Guid schoolId);
    }

    public class StaffService : IStaffService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<StaffService> _logger;
        private readonly IFileStorageService _fileStorage;

        private static readonly HashSet<string> ValidGenders = new(StringComparer.OrdinalIgnoreCase)
            { "male", "female", "other", "prefer_not_to_say" };
        private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
            { "active", "inactive", "on_leave", "terminated", "probation" };
        private static readonly HashSet<string> ValidEmploymentTypes = new(StringComparer.OrdinalIgnoreCase)
            { "permanent", "contract", "part_time", "probation", "intern", "consultant" };

        public StaffService(AppDbContext context, ILogger<StaffService> logger, IFileStorageService fileStorage)
        {
            _context = context;
            _logger = logger;
            _fileStorage = fileStorage;
        }

        // â”€â”€ PRIVATE HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        /// <summary>Mask Aadhar: show only last 4 digits.</summary>
        private static string? MaskAadhar(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return raw;
            var digits = raw.Replace("-", "").Replace(" ", "");
            if (digits.Length < 4) return "****";
            return "XXXX-XXXX-" + digits[^4..];
        }

        /// <summary>Mask PAN: show only last 4 chars.</summary>
        private static string? MaskPan(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return raw;
            if (raw.Length < 4) return "****";
            return "XXXXXX" + raw[^4..];
        }

        /// <summary>Mask bank account: show only last 4 digits.</summary>
        private static string? MaskBankAccount(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return raw;
            var digits = raw.Replace(" ", "").Replace("-", "");
            if (digits.Length < 4) return "****";
            return "XXXX-XXXX-" + digits[^4..];
        }

        private static string CsvEscape(string? value)
        {
            if (value == null) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            return value;
        }

        public async Task<StaffListResponse> GetStaffMembersAsync(
            Guid schoolId,
            int page,
            int pageSize,
            string? search,
            string? status,
            string? department = null,
            string? designation = null,
            string? employmentType = null,
            string? sortBy = null,
            string? sortOrder = null)
        {
            var query = _context.StaffMembers.Where(s => s.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(x =>
                    x.FirstName.ToLower().Contains(s) ||
                    x.LastName.ToLower().Contains(s) ||
                    x.EmployeeId.ToLower().Contains(s) ||
                    x.Email.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);

            if (!string.IsNullOrWhiteSpace(department))
                query = query.Where(s => s.Department == department);

            if (!string.IsNullOrWhiteSpace(designation))
                query = query.Where(s => s.Designation == designation);

            if (!string.IsNullOrWhiteSpace(employmentType))
                query = query.Where(s => s.EmploymentType == employmentType);

            // Sorting
            bool desc = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
            query = (sortBy?.ToLower()) switch
            {
                "name"           => desc ? query.OrderByDescending(s => s.FirstName).ThenByDescending(s => s.LastName)
                                         : query.OrderBy(s => s.FirstName).ThenBy(s => s.LastName),
                "department"     => desc ? query.OrderByDescending(s => s.Department)   : query.OrderBy(s => s.Department),
                "designation"    => desc ? query.OrderByDescending(s => s.Designation)  : query.OrderBy(s => s.Designation),
                "joiningdate"    => desc ? query.OrderByDescending(s => s.JoiningDate)  : query.OrderBy(s => s.JoiningDate),
                "status"         => desc ? query.OrderByDescending(s => s.Status)       : query.OrderBy(s => s.Status),
                "employeeid"     => desc ? query.OrderByDescending(s => s.EmployeeId)   : query.OrderBy(s => s.EmployeeId),
                _                => query.OrderBy(s => s.EmployeeId)
            };

            var total = await query.CountAsync();

            var staff = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StaffBasicResponse
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Designation = s.Designation,
                    Department = s.Department,
                    Email = s.Email,
                    Status = s.Status,
                    ProfilePhoto = s.ProfilePhoto
                })
                .ToListAsync();

            return new StaffListResponse
            {
                Staff = staff,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<StaffResponse?> GetStaffByIdAsync(Guid id, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .Include(s => s.Documents)
                .Include(s => s.ReportingTo)
                .Where(s => s.Id == id && s.SchoolId == schoolId)
                .FirstOrDefaultAsync();

            if (staff == null)
                return null;

            // Resolve UserLogin.Id via email match — leave requests are stored with UserLogin.Id as ApplicantId
            var userLoginId = await _context.UserLogins
                .Where(u => u.SchoolId == schoolId && u.Email.ToLower() == staff.Email.ToLower() && !u.IsDeleted)
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync();

            return new StaffResponse
            {
                Id = staff.Id,
                SchoolId = staff.SchoolId,
                EmployeeId = staff.EmployeeId,
                FirstName = staff.FirstName,
                LastName = staff.LastName,
                Gender = staff.Gender,
                DateOfBirth = staff.DateOfBirth,
                Designation = staff.Designation,
                Department = staff.Department,
                JoiningDate = staff.JoiningDate,
                Qualification = staff.Qualification,
                Experience = staff.Experience,

                // Address
                Address = staff.Address,
                PermanentAddress = staff.PermanentAddress,
                City = staff.City,
                State = staff.State,
                Pincode = staff.Pincode,

                // Contact
                Phone = staff.Phone,
                Email = staff.Email,

                // PII â€” always masked in response (last 4 only)
                AadharNumber = MaskAadhar(staff.AadharNumber),
                PanNumber = MaskPan(staff.PanNumber),
                PassportNumber = staff.PassportNumber,

                // Professional
                Specialization = staff.Specialization,
                EmploymentType = staff.EmploymentType,
                ReportingToId = staff.ReportingToId,
                ReportingToName = staff.ReportingTo != null
                    ? $"{staff.ReportingTo.FirstName} {staff.ReportingTo.LastName}"
                    : null,
                Subjects = staff.Subjects,
                Classes = staff.Classes,

                // Banking â€” masked
                BankName = staff.BankName,
                BankAccountNumber = MaskBankAccount(staff.BankAccountNumber),
                IfscCode = staff.IfscCode,

                // PF/ESI
                PfNumber = staff.PfNumber,
                EsiNumber = staff.EsiNumber,
                UanNumber = staff.UanNumber,

                // Emergency Contact
                EmergencyContactName = staff.EmergencyContactName,
                EmergencyContactPhone = staff.EmergencyContactPhone,
                EmergencyContactRelationship = staff.EmergencyContactRelationship,

                Status = staff.Status,
                Salary = staff.Salary,
                ProfilePhoto = staff.ProfilePhoto,

                Documents = (staff.Documents ?? new List<StaffDocument>()).Select(d => new StaffDocumentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Type = d.Type,
                    Url = d.Url,
                    UploadedAt = d.UploadedAt
                }).ToList(),

                CreatedAt = staff.CreatedAt,
                UpdatedAt = staff.UpdatedAt,
                UserLoginId = userLoginId
            };
        }

        // ========== PRIVATE HELPER METHODS FOR AUTO-GENERATION ==========

        /// <summary>
        /// Creates a UserLogin (and assigns the matching system role) for a staff member
        /// if one does not already exist. Called during staff creation.
        /// </summary>
        private async Task AutoProvisionUserLoginAsync(Staff staff)
        {
            if (string.IsNullOrWhiteSpace(staff.Email)) return;

            var existing = await _context.UserLogins
                .AnyAsync(u => u.SchoolId == staff.SchoolId && u.Email.ToLower() == staff.Email.ToLower() && !u.IsDeleted);
            if (existing) return;

            // Map designation → portal-role string
            var roleMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
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
                ["Receptionist"]        = "receptionist",
                ["Front Desk Officer"]  = "receptionist",
            };
            var loginRole = roleMap.TryGetValue(staff.Designation ?? "", out var r) ? r : "staff";

            // Derive a unique username
            var username = staff.Email.Split('@')[0].ToLower().Replace(".", "");
            var usernameExists = await _context.UserLogins.AnyAsync(u => u.Username == username && u.SchoolId == staff.SchoolId);
            if (usernameExists) username += (staff.EmployeeId ?? "").ToLower().Replace("-", "");

            var login = new UserLogin
            {
                Id = Guid.NewGuid(),
                SchoolId = staff.SchoolId,
                Email = staff.Email,
                Username = username,
                FirstName = staff.FirstName,
                LastName = staff.LastName,
                Role = loginRole,
                Status = staff.Status ?? "active",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("ChangeMe@123", workFactor: 12),
                RequirePasswordChange = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _context.UserLogins.Add(login);
            await _context.SaveChangesAsync();

            // Auto-assign matching system role
            var systemRoleNameMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
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
                ["Receptionist"]        = "Receptionist",
                ["Front Desk Officer"]  = "Receptionist",
            };

            if (systemRoleNameMap.TryGetValue(staff.Designation ?? "", out var roleName))
            {
                var role = await _context.Roles
                    .FirstOrDefaultAsync(ro => ro.SchoolId == staff.SchoolId && ro.Name == roleName && ro.IsSystemRole && !ro.IsDeleted);
                if (role != null)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        Id = Guid.NewGuid(),
                        UserId = login.Id,
                        RoleId = role.Id,
                        SchoolId = staff.SchoolId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Auto-assigned role '{Role}' to new staff {EmployeeId}", roleName, staff.EmployeeId);
                }
            }
        }

        /// <summary>
        /// Assigns system roles to existing active staff whose login has no UserRole yet.
        /// Safe to run on every startup — skips logins that already have a role assigned.
        /// </summary>
        public async Task<int> BulkAutoAssignRolesAsync(Guid schoolId)
        {
            var systemRoleNameMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["principal"]          = "Principal",
                ["vice principal"]     = "Vice Principal",
                ["head of department"] = "Head of Department",
                ["class teacher"]      = "Class Teacher",
                ["teacher"]            = "Teacher",
                ["subject teacher"]    = "Teacher",
                ["accountant"]         = "Accountant",
                ["hr manager"]         = "HR Manager",
                ["librarian"]          = "Librarian",
                ["transport manager"]  = "Transport Manager",
                ["hostel warden"]      = "Hostel Warden",
                ["admissions officer"] = "Admissions Officer",
                ["counselor"]          = "Counselor",
                ["receptionist"]       = "Receptionist",
                ["front desk officer"] = "Receptionist",
                ["support staff"]      = "Support Staff",
            };

            // Get all system roles for this school once
            var systemRoles = await _context.Roles
                .Where(r => r.SchoolId == schoolId && r.IsSystemRole && !r.IsDeleted)
                .ToListAsync();

            // Get all logins that have no UserRole
            var loginsWithoutRole = await _context.UserLogins
                .Where(u => u.SchoolId == schoolId && !u.IsDeleted &&
                            !_context.UserRoles.Any(ur => ur.UserId == u.Id && ur.SchoolId == schoolId))
                .ToListAsync();

            int assigned = 0;
            var newRoles = new List<UserRole>();

            foreach (var login in loginsWithoutRole)
            {
                if (!systemRoleNameMap.TryGetValue(login.Role ?? "", out var roleName)) continue;
                var sysRole = systemRoles.FirstOrDefault(r => r.Name == roleName);
                if (sysRole == null) continue;

                newRoles.Add(new UserRole
                {
                    Id        = Guid.NewGuid(),
                    UserId    = login.Id,
                    RoleId    = sysRole.Id,
                    SchoolId  = schoolId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                assigned++;
            }

            if (newRoles.Count > 0)
            {
                _context.UserRoles.AddRange(newRoles);
                await _context.SaveChangesAsync();
                _logger.LogInformation("BulkAutoAssignRoles: assigned {Count} missing roles for school {SchoolId}", assigned, schoolId);
            }

            return assigned;
        }

        private async Task CreateSalaryBreakdownAsync(Staff staff, decimal totalSalary)
        {
            try
            {
                decimal basicSalary = Math.Round(totalSalary * 0.60m, 2);
                staff.BasicSalary = basicSalary;
                _logger.LogDebug("Salary breakdown set for {EmployeeId}: Basic={Basic}", staff.EmployeeId, basicSalary);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create salary breakdown for {EmployeeId}", staff.EmployeeId);
            }
        }

        private async Task CreateInitialPayrollRecordAsync(Staff staff, decimal totalSalary)
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var month = currentDate.Month;
                var year = currentDate.Year;

                var exists = await _context.Set<PayrollRecord>()
                    .AnyAsync(p => p.StaffId == staff.Id && p.Month == month && p.Year == year);

                if (exists) return;

                decimal basicSalary = staff.BasicSalary ?? Math.Round(totalSalary * 0.60m, 2);
                decimal hra = Math.Round(basicSalary * 0.30m, 2);
                decimal da = Math.Round(basicSalary * 0.10m, 2);
                decimal conveyance = 1600m;
                decimal medical = 1250m;
                decimal totalAllowances = hra + da + conveyance + medical;

                var payrollRecord = new PayrollRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = staff.SchoolId,
                    StaffId = staff.Id,
                    Month = month,
                    Year = year,
                    BasicSalary = basicSalary,
                    Allowances = totalAllowances,
                    Deductions = 0,
                    Bonus = 0,
                    NetSalary = totalSalary,
                    Status = "pending",
                    PaymentDate = null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Set<PayrollRecord>().Add(payrollRecord);

                var allowances = new[]
                {
                    new PayrollAllowance { Id = Guid.NewGuid(), PayrollId = payrollRecord.Id, AllowanceType = "HRA", Amount = hra, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new PayrollAllowance { Id = Guid.NewGuid(), PayrollId = payrollRecord.Id, AllowanceType = "DA", Amount = da, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new PayrollAllowance { Id = Guid.NewGuid(), PayrollId = payrollRecord.Id, AllowanceType = "Conveyance", Amount = conveyance, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new PayrollAllowance { Id = Guid.NewGuid(), PayrollId = payrollRecord.Id, AllowanceType = "Medical", Amount = medical, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                };

                _context.Set<PayrollAllowance>().AddRange(allowances);
                _logger.LogDebug("Initial payroll record created for {EmployeeId}", staff.EmployeeId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create payroll record for {EmployeeId}", staff.EmployeeId);
            }
        }

        private async Task SetupPFESIComplianceAsync(Staff staff, decimal totalSalary)
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var monthYear = $"{currentDate.Year}-{currentDate.Month:D2}";
                decimal basicSalary = staff.BasicSalary ?? Math.Round(totalSalary * 0.60m, 2);

                if (totalSalary >= 15000m)
                {
                    var pfContribution = new PFESIContribution
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = staff.SchoolId,
                        StaffId = staff.Id,
                        Type = "PF",
                        Month = monthYear,
                        BasicSalary = basicSalary,
                        GrossSalary = totalSalary,
                        EmployeeContribution = Math.Round(basicSalary * 0.12m, 2),
                        EmployerContribution = Math.Round(basicSalary * 0.12m, 2),
                        PensionContribution = Math.Round(basicSalary * 0.0833m, 2),
                        TotalContribution = Math.Round(basicSalary * 0.24m, 2),
                        Status = "Calculated",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Set<PFESIContribution>().Add(pfContribution);
                }

                if (totalSalary <= 21000m)
                {
                    var esiContribution = new PFESIContribution
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = staff.SchoolId,
                        StaffId = staff.Id,
                        Type = "ESI",
                        Month = monthYear,
                        BasicSalary = basicSalary,
                        GrossSalary = totalSalary,
                        EmployeeContribution = Math.Round(totalSalary * 0.0075m, 2),
                        EmployerContribution = Math.Round(totalSalary * 0.0325m, 2),
                        TotalContribution = Math.Round(totalSalary * 0.04m, 2),
                        Status = "Calculated",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Set<PFESIContribution>().Add(esiContribution);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to setup PF/ESI for {EmployeeId}", staff.EmployeeId);
            }
        }

        // ========== VALIDATION HELPERS ==========

        private static (bool ok, string error) ValidateCreateRequest(CreateStaffRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
                return (false, "FirstName is required.");
            if (string.IsNullOrWhiteSpace(request.LastName))
                return (false, "LastName is required.");
            if (string.IsNullOrWhiteSpace(request.Email))
                return (false, "Email is required.");
            if (string.IsNullOrWhiteSpace(request.Phone))
                return (false, "Phone is required.");
            if (string.IsNullOrWhiteSpace(request.Department))
                return (false, "Department is required — e.g. 'Science', 'Mathematics', 'Administration'.");
            if (string.IsNullOrWhiteSpace(request.Designation))
                return (false, "Designation is required — e.g. 'Teacher', 'Principal', 'Clerk'.");

            // Normalise gender before checking (M/F accepted in addition to full words)
            request.Gender = request.Gender?.Trim().ToLower() switch
            {
                "m" or "gents" or "boy"                              => "male",
                "f" or "ladies" or "lady" or "girl"                  => "female",
                "other" or "others"                                   => "other",
                "prefer_not_to_say" or "na" or "not specified"       => "prefer_not_to_say",
                var g                                                 => g
            };
            if (!ValidGenders.Contains(request.Gender ?? ""))
                return (false, $"Gender '{request.Gender}' is not recognised — use: Male, Female, Other (or M/F as shorthand).");

            // Normalise status
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                request.Status = request.Status.Trim().ToLower() switch
                {
                    "enabled" or "working"             => "active",
                    "disabled"                          => "inactive",
                    "on leave" or "leave"               => "on_leave",
                    "dismissed" or "fired"             => "terminated",
                    "probationary"                     => "probation",
                    var s                              => s
                };
                if (!ValidStatuses.Contains(request.Status))
                    return (false, $"Status '{request.Status}' is not valid — accepted: {string.Join(", ", ValidStatuses)} (leave blank to default to 'active').");
            }

            // Normalise employment type
            if (!string.IsNullOrWhiteSpace(request.EmploymentType))
            {
                request.EmploymentType = request.EmploymentType.Trim().ToLower() switch
                {
                    "full time" or "fulltime" or "full_time" or "regular" => "permanent",
                    "contractual" or "temp" or "temporary"                => "contract",
                    "part time" or "parttime"                             => "part_time",
                    "probationary" or "on probation"                      => "probation",
                    "internship" or "trainee" or "apprentice"            => "intern",
                    "consulting" or "freelance" or "visiting"            => "consultant",
                    var e                                                 => e
                };
                if (!ValidEmploymentTypes.Contains(request.EmploymentType))
                    return (false, $"EmploymentType '{request.EmploymentType}' is not valid — accepted: {string.Join(", ", ValidEmploymentTypes)}.");
            }

            if (request.DateOfBirth == default)
                return (false, "DateOfBirth is required — use DD/MM/YYYY or YYYY-MM-DD format.");
            if (request.DateOfBirth >= DateTime.UtcNow.Date)
                return (false, $"DateOfBirth '{request.DateOfBirth:yyyy-MM-dd}' is in the future — please check the year.");
            if (request.DateOfBirth > DateTime.UtcNow.AddYears(-18))
                return (false, "Staff member must be at least 18 years old.");

            // PAN length check
            if (!string.IsNullOrWhiteSpace(request.PanNumber) && request.PanNumber.Length != 10)
                return (false, $"PanNumber '{request.PanNumber}' has {request.PanNumber.Length} characters — PAN must be exactly 10 (format: ABCDE1234F).");

            if (request.Salary.HasValue && request.Salary.Value < 0)
                return (false, "Salary cannot be negative.");
            return (true, string.Empty);
        }

        private static (bool ok, string error) ValidateUpdateRequest(UpdateStaffRequest request)
        {
            if (request.Gender != null && !ValidGenders.Contains(request.Gender))
                return (false, $"Gender must be one of: {string.Join(", ", ValidGenders)}.");
            if (request.Status != null && !ValidStatuses.Contains(request.Status))
                return (false, $"Status must be one of: {string.Join(", ", ValidStatuses)}.");
            if (request.EmploymentType != null && !ValidEmploymentTypes.Contains(request.EmploymentType))
                return (false, $"EmploymentType must be one of: {string.Join(", ", ValidEmploymentTypes)}.");
            if (request.DateOfBirth.HasValue && request.DateOfBirth.Value >= DateTime.UtcNow.Date)
                return (false, "DateOfBirth must be in the past.");
            if (request.DateOfBirth.HasValue && request.DateOfBirth.Value > DateTime.UtcNow.AddYears(-18))
                return (false, "Staff member must be at least 18 years old.");
            if (request.Salary.HasValue && request.Salary.Value < 0)
                return (false, "Salary cannot be negative.");
            return (true, string.Empty);
        }

        // ========== ENHANCED CREATE STAFF ==========

        public async Task<StaffResponse> CreateStaffAsync(CreateStaffRequest request)
        {
            // Validation
            var (ok, error) = ValidateCreateRequest(request);
            if (!ok) throw new InvalidOperationException(error);

            // Auto-generate EmployeeId if not provided
            if (string.IsNullOrWhiteSpace(request.EmployeeId))
                request.EmployeeId = "EMP" + DateTime.Now.ToString("yyyyMMddHHmmss") + Random.Shared.Next(100, 999);

            var exists = await _context.StaffMembers
                .AnyAsync(s => s.SchoolId == request.SchoolId && s.EmployeeId == request.EmployeeId);
            if (exists)
                throw new InvalidOperationException("A staff member with this employee ID already exists.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailExists = await _context.StaffMembers
                    .AnyAsync(s => s.SchoolId == request.SchoolId && s.Email == request.Email);
                if (emailExists)
                    throw new InvalidOperationException("A staff member with this email already exists.");
            }

            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var phoneExists = await _context.StaffMembers
                    .AnyAsync(s => s.SchoolId == request.SchoolId && s.Phone == request.Phone);
                if (phoneExists)
                    throw new InvalidOperationException("A staff member with this phone already exists.");
            }

            if (request.ReportingToId.HasValue)
            {
                var reportingToExists = await _context.StaffMembers
                    .AnyAsync(s => s.Id == request.ReportingToId.Value && s.SchoolId == request.SchoolId);
                if (!reportingToExists)
                    throw new InvalidOperationException("ReportingToId must reference an existing staff member in the same school.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            StaffResponse? createdResponse = null;

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var totalSalary = request.Salary ?? 0;

                    var staff = new Staff
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = request.SchoolId,
                        EmployeeId = request.EmployeeId,
                        FirstName = request.FirstName,
                        LastName = request.LastName,
                        Gender = request.Gender,
                        DateOfBirth = request.DateOfBirth,
                        Designation = request.Designation,
                        Department = request.Department,
                        JoiningDate = request.JoiningDate,
                        Qualification = request.Qualification,
                        Experience = request.Experience,
                        Address = request.Address ?? string.Empty,
                        PermanentAddress = request.PermanentAddress,
                        City = request.City,
                        State = request.State,
                        Pincode = request.Pincode,
                        Phone = request.Phone,
                        Email = request.Email,
                        AadharNumber = request.AadharNumber,
                        PanNumber = request.PanNumber,
                        PassportNumber = request.PassportNumber,
                        Specialization = request.Specialization,
                        EmploymentType = request.EmploymentType,
                        ReportingToId = request.ReportingToId,
                        Subjects = request.Subjects,
                        Classes = request.Classes,
                        BankName = request.BankName,
                        BankAccountNumber = request.BankAccountNumber,
                        IfscCode = request.IfscCode,
                        PfNumber = request.PfNumber,
                        EsiNumber = request.EsiNumber,
                        UanNumber = request.UanNumber,
                        EmergencyContactName = request.EmergencyContactName,
                        EmergencyContactPhone = request.EmergencyContactPhone,
                        EmergencyContactRelationship = request.EmergencyContactRelationship,
                        CasualLeave = 12,
                        SickLeave = 12,
                        EarnedLeave = 15,
                        MaternityLeave = 180,
                        PaternityLeave = 15,
                        Status = request.Status ?? "active",
                        Salary = totalSalary,
                        BasicSalary = null,
                        ProfilePhoto = request.ProfilePhoto,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StaffMembers.Add(staff);
                    await _context.SaveChangesAsync();

                    await CreateSalaryBreakdownAsync(staff, totalSalary);
                    await CreateInitialPayrollRecordAsync(staff, totalSalary);
                    await SetupPFESIComplianceAsync(staff, totalSalary);

                    // Auto-create UserLogin for the new staff member
                    await AutoProvisionUserLoginAsync(staff);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Staff onboarding complete for {EmployeeId}", staff.EmployeeId);

                    createdResponse = await GetStaffByIdAsync(staff.Id, staff.SchoolId)
                        ?? throw new InvalidOperationException("Failed to retrieve created staff.");
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });

            return createdResponse ?? throw new InvalidOperationException("Failed to create staff.");
        }

        public async Task<StaffResponse?> UpdateStaffAsync(Guid id, Guid schoolId, UpdateStaffRequest request)
        {
            var (ok, error) = ValidateUpdateRequest(request);
            if (!ok) throw new InvalidOperationException(error);

            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (staff == null) return null;

            if (!string.IsNullOrWhiteSpace(request.EmployeeId))
            {
                var employeeIdExists = await _context.StaffMembers
                    .AnyAsync(s => s.SchoolId == schoolId && s.EmployeeId == request.EmployeeId && s.Id != id);
                if (employeeIdExists)
                    throw new InvalidOperationException("A staff member with this employee ID already exists.");
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailExists = await _context.StaffMembers
                    .AnyAsync(s => s.SchoolId == schoolId && s.Email == request.Email && s.Id != id);
                if (emailExists)
                    throw new InvalidOperationException("A staff member with this email already exists.");
            }

            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var phoneExists = await _context.StaffMembers
                    .AnyAsync(s => s.SchoolId == schoolId && s.Phone == request.Phone && s.Id != id);
                if (phoneExists)
                    throw new InvalidOperationException("A staff member with this phone already exists.");
            }

            if (request.ReportingToId.HasValue)
            {
                if (request.ReportingToId.Value == id)
                    throw new InvalidOperationException("ReportingToId cannot be the same as staff ID.");

                var reportingToExists = await _context.StaffMembers
                    .AnyAsync(s => s.Id == request.ReportingToId.Value && s.SchoolId == schoolId);
                if (!reportingToExists)
                    throw new InvalidOperationException("ReportingToId must reference an existing staff member in the same school.");
            }

            if (request.EmployeeId != null) staff.EmployeeId = request.EmployeeId;
            if (request.FirstName != null) staff.FirstName = request.FirstName;
            if (request.LastName != null) staff.LastName = request.LastName;
            if (request.Gender != null) staff.Gender = request.Gender;
            if (request.DateOfBirth.HasValue) staff.DateOfBirth = request.DateOfBirth.Value;
            if (request.Designation != null) staff.Designation = request.Designation;
            if (request.Department != null) staff.Department = request.Department;
            if (request.JoiningDate.HasValue) staff.JoiningDate = request.JoiningDate.Value;
            if (request.Qualification != null) staff.Qualification = request.Qualification;
            if (request.Experience.HasValue) staff.Experience = request.Experience.Value;
            if (request.Address != null) staff.Address = request.Address;
            if (request.PermanentAddress != null) staff.PermanentAddress = request.PermanentAddress;
            if (request.City != null) staff.City = request.City;
            if (request.State != null) staff.State = request.State;
            if (request.Pincode != null) staff.Pincode = request.Pincode;
            if (request.Phone != null) staff.Phone = request.Phone;
            if (request.Email != null) staff.Email = request.Email;
            if (request.AadharNumber != null) staff.AadharNumber = request.AadharNumber;
            if (request.PanNumber != null) staff.PanNumber = request.PanNumber;
            if (request.PassportNumber != null) staff.PassportNumber = request.PassportNumber;
            if (request.Specialization != null) staff.Specialization = request.Specialization;
            if (request.EmploymentType != null) staff.EmploymentType = request.EmploymentType;
            if (request.ReportingToId.HasValue) staff.ReportingToId = request.ReportingToId;
            if (request.Subjects != null) staff.Subjects = request.Subjects;
            if (request.Classes != null) staff.Classes = request.Classes;
            if (request.BankName != null) staff.BankName = request.BankName;
            if (request.BankAccountNumber != null) staff.BankAccountNumber = request.BankAccountNumber;
            if (request.IfscCode != null) staff.IfscCode = request.IfscCode;
            if (request.PfNumber != null) staff.PfNumber = request.PfNumber;
            if (request.EsiNumber != null) staff.EsiNumber = request.EsiNumber;
            if (request.UanNumber != null) staff.UanNumber = request.UanNumber;
            if (request.EmergencyContactName != null) staff.EmergencyContactName = request.EmergencyContactName;
            if (request.EmergencyContactPhone != null) staff.EmergencyContactPhone = request.EmergencyContactPhone;
            if (request.EmergencyContactRelationship != null) staff.EmergencyContactRelationship = request.EmergencyContactRelationship;
            if (request.Status != null) staff.Status = request.Status;
            if (request.Salary.HasValue) staff.Salary = request.Salary.Value;
            if (request.ProfilePhoto != null) staff.ProfilePhoto = request.ProfilePhoto;

            staff.UpdatedAt = DateTime.UtcNow;

            // Sync UserLogin status — primary lookup by LinkedEntityId, email fallback
            if (request.Status != null)
            {
                var linkedLogin = await _context.UserLogins
                    .FirstOrDefaultAsync(u =>
                        u.SchoolId == staff.SchoolId &&
                        u.LinkedEntityId == id &&
                        u.LinkedEntityType == "staff" &&
                        !u.IsDeleted);

                if (linkedLogin == null && !string.IsNullOrEmpty(staff.Email))
                {
                    linkedLogin = await _context.UserLogins
                        .FirstOrDefaultAsync(u =>
                            u.SchoolId == staff.SchoolId &&
                            u.Email.ToLower() == staff.Email.Trim().ToLower() &&
                            !u.IsDeleted);
                }

                if (linkedLogin != null)
                {
                    linkedLogin.Status = request.Status == "inactive" ? "inactive" : "active";
                    if (request.Status == "inactive")
                    {
                        linkedLogin.RefreshTokenHash = null;
                        linkedLogin.RefreshTokenExpiry = null;
                    }
                    linkedLogin.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Clear ClassSubjects.TeacherId when staff is deactivated via plain update
            if (request.Status == "inactive")
            {
                var classSubjectsToUnassign = await _context.ClassSubjects
                    .Where(cs => cs.SchoolId == schoolId && cs.TeacherId == id)
                    .ToListAsync();
                foreach (var cs in classSubjectsToUnassign)
                {
                    cs.TeacherId = null;
                    cs.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return await GetStaffByIdAsync(id, schoolId);
        }

        public async Task<bool> DeleteStaffAsync(Guid id, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (staff == null) return false;

            // SOFT DELETE â€” preserve record for audit/referential integrity
            staff.IsDeleted = true;
            staff.DeletedAt = DateTime.UtcNow;
            staff.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<StaffStatsResponse> GetStaffStatsAsync(Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId)
                .ToListAsync();

            return new StaffStatsResponse
            {
                TotalStaff = staff.Count,
                ActiveStaff = staff.Count(s => s.Status == "active"),
                InactiveStaff = staff.Count(s => s.Status == "inactive"),
                OnLeave = staff.Count(s => s.Status == "on_leave"),
                ByDepartment = staff.Where(s => !string.IsNullOrEmpty(s.Department))
                    .GroupBy(s => s.Department!)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ByDesignation = staff.Where(s => !string.IsNullOrEmpty(s.Designation))
                    .GroupBy(s => s.Designation!)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ByEmploymentType = staff.Where(s => !string.IsNullOrEmpty(s.EmploymentType))
                    .GroupBy(s => s.EmploymentType!)
                    .ToDictionary(g => g.Key, g => g.Count())
            };
        }

        // ========== BULK IMPORT ==========

        public async Task<BulkOperationResult> BulkImportStaffAsync(Guid schoolId, List<CreateStaffRequest> requests)
        {
            const int MaxRows = 500;
            var result = new BulkOperationResult();

            if (requests.Count > MaxRows)
            {
                result.Errors.Add($"Bulk import limited to {MaxRows} rows. Received {requests.Count}.");
                result.FailureCount = requests.Count;
                return result;
            }

            // Pre-load existing employeeIds and emails for fast duplicate detection
            var existingEmployeeIds = (await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId)
                .Select(s => s.EmployeeId)
                .ToListAsync())
                .Select(x => x.ToLower())
                .ToHashSet();

            var existingEmails = (await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId)
                .Select(s => s.Email)
                .ToListAsync())
                .Select(x => x.ToLower())
                .ToHashSet();

            var existingPhones = (await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId)
                .Select(s => s.Phone)
                .ToListAsync())
                .Select(x => x.ToLower())
                .ToHashSet();

            var seenEmployeeIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var seenPhones = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < requests.Count; i++)
            {
                var req = requests[i];
                req.SchoolId = schoolId;

                // Row-level validation
                var (ok, validationError) = ValidateCreateRequest(req);
                if (!ok)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: {validationError}");
                    continue;
                }

                // Auto-generate EmployeeId if missing
                if (string.IsNullOrWhiteSpace(req.EmployeeId))
                    req.EmployeeId = "EMP" + DateTime.Now.ToString("yyyyMMddHHmmss") + Random.Shared.Next(100, 999) + i;

                // In-batch duplicate check
                if (!string.IsNullOrWhiteSpace(req.EmployeeId) && !seenEmployeeIds.Add(req.EmployeeId.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: Duplicate EmployeeId '{req.EmployeeId}' within the import batch.");
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(req.Email) && !seenEmails.Add(req.Email.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: Duplicate email '{req.Email}' within the import batch.");
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(req.Phone) && !seenPhones.Add(req.Phone.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: Duplicate phone '{req.Phone}' within the import batch.");
                    continue;
                }

                // DB duplicate check
                if (!string.IsNullOrWhiteSpace(req.EmployeeId) && existingEmployeeIds.Contains(req.EmployeeId.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: EmployeeId '{req.EmployeeId}' already exists.");
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(req.Email) && existingEmails.Contains(req.Email.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: Email '{req.Email}' already exists.");
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(req.Phone) && existingPhones.Contains(req.Phone.ToLower()))
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: Phone '{req.Phone}' already exists.");
                    continue;
                }

                if (req.ReportingToId.HasValue)
                {
                    var reportingToExists = await _context.StaffMembers
                        .AnyAsync(s => s.Id == req.ReportingToId.Value && s.SchoolId == schoolId);
                    if (!reportingToExists)
                    {
                        result.FailureCount++;
                        result.Errors.Add($"Row {i + 1}: ReportingToId must reference an existing staff member in the same school.");
                        continue;
                    }
                }

                try
                {
                    var staff = new Staff
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        EmployeeId = req.EmployeeId!,
                        FirstName = req.FirstName,
                        LastName = req.LastName,
                        Gender = req.Gender,
                        DateOfBirth = req.DateOfBirth,
                        Designation = req.Designation,
                        Department = req.Department,
                        JoiningDate = req.JoiningDate,
                        Qualification = req.Qualification,
                        Experience = req.Experience,
                        Address = req.Address ?? string.Empty,
                        PermanentAddress = req.PermanentAddress,
                        City = req.City,
                        State = req.State,
                        Pincode = req.Pincode,
                        Phone = req.Phone,
                        Email = req.Email,
                        AadharNumber = req.AadharNumber,
                        PanNumber = req.PanNumber,
                        PassportNumber = req.PassportNumber,
                        Specialization = req.Specialization,
                        EmploymentType = req.EmploymentType,
                        BankName = req.BankName,
                        BankAccountNumber = req.BankAccountNumber,
                        IfscCode = req.IfscCode,
                        PfNumber = req.PfNumber,
                        EsiNumber = req.EsiNumber,
                        UanNumber = req.UanNumber,
                        EmergencyContactName = req.EmergencyContactName,
                        EmergencyContactPhone = req.EmergencyContactPhone,
                        EmergencyContactRelationship = req.EmergencyContactRelationship,
                        CasualLeave = 12,
                        SickLeave = 12,
                        EarnedLeave = 15,
                        MaternityLeave = 180,
                        PaternityLeave = 15,
                        Status = req.Status ?? "active",
                        Salary = req.Salary ?? 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StaffMembers.Add(staff);
                    await _context.SaveChangesAsync();

                    // Provision a login account + system role (same as single-create flow)
                    await AutoProvisionUserLoginAsync(staff);

                    result.SuccessCount++;
                    result.SuccessfulIds.Add(staff.Id);

                    // Track for future rows in batch
                    existingEmployeeIds.Add(staff.EmployeeId.ToLower());
                    existingEmails.Add(staff.Email.ToLower());
                    existingPhones.Add(staff.Phone.ToLower());
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Row {i + 1}: {ex.Message}");
                }
            }

            return result;
        }

        // ========== CSV EXPORT ==========

        public async Task<byte[]> ExportStaffToCsvAsync(Guid schoolId, string? department, string? status, string? designation)
        {
            var query = _context.StaffMembers.Where(s => s.SchoolId == schoolId);
            if (!string.IsNullOrWhiteSpace(department)) query = query.Where(s => s.Department == department);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(s => s.Status == status);
            if (!string.IsNullOrWhiteSpace(designation)) query = query.Where(s => s.Designation == designation);

            var staff = await query.OrderBy(s => s.EmployeeId).ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("EmployeeId,FirstName,LastName,Gender,DateOfBirth,Email,Phone,Department,Designation," +
                          "EmploymentType,JoiningDate,Experience,Qualification,Specialization,Status,Salary," +
                          "Address,City,State,Pincode,AadharNumber,PanNumber," +
                          "BankName,BankAccountNumber,IfscCode,PfNumber,EsiNumber,UanNumber," +
                          "EmergencyContactName,EmergencyContactPhone,EmergencyContactRelationship," +
                          "CasualLeave,SickLeave,EarnedLeave,MaternityLeave,PaternityLeave");

            foreach (var s in staff)
            {
                sb.AppendLine(string.Join(",",
                    CsvEscape(s.EmployeeId),
                    CsvEscape(s.FirstName),
                    CsvEscape(s.LastName),
                    CsvEscape(s.Gender),
                    s.DateOfBirth.ToString("yyyy-MM-dd"),
                    CsvEscape(s.Email),
                    CsvEscape(s.Phone),
                    CsvEscape(s.Department),
                    CsvEscape(s.Designation),
                    CsvEscape(s.EmploymentType),
                    s.JoiningDate.ToString("yyyy-MM-dd"),
                    s.Experience.ToString(),
                    CsvEscape(s.Qualification),
                    CsvEscape(s.Specialization),
                    CsvEscape(s.Status),
                    s.Salary.ToString("F2"),
                    CsvEscape(s.Address),
                    CsvEscape(s.City),
                    CsvEscape(s.State),
                    CsvEscape(s.Pincode),
                    CsvEscape(MaskAadhar(s.AadharNumber)),
                    CsvEscape(MaskPan(s.PanNumber)),
                    CsvEscape(s.BankName),
                    CsvEscape(MaskBankAccount(s.BankAccountNumber)),
                    CsvEscape(s.IfscCode),
                    CsvEscape(s.PfNumber),
                    CsvEscape(s.EsiNumber),
                    CsvEscape(s.UanNumber),
                    CsvEscape(s.EmergencyContactName),
                    CsvEscape(s.EmergencyContactPhone),
                    CsvEscape(s.EmergencyContactRelationship),
                    s.CasualLeave.ToString(),
                    s.SickLeave.ToString(),
                    s.EarnedLeave.ToString(),
                    s.MaternityLeave.ToString(),
                    s.PaternityLeave.ToString()
                ));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        /// <summary>Returns a blank CSV template with headers and an example row.</summary>
        public static string GetImportTemplate()
        {
            return "EmployeeId,FirstName,LastName,Gender,DateOfBirth,Email,Phone,Department,Designation," +
                   "EmploymentType,JoiningDate,Experience,Qualification,Specialization,Status,Salary," +
                   "Address,City,State,Pincode,AadharNumber,PanNumber," +
                   "BankName,BankAccountNumber,IfscCode,PfNumber,EsiNumber,UanNumber," +
                   "EmergencyContactName,EmergencyContactPhone,EmergencyContactRelationship\n" +
                   "EMP001,John,Doe,male,1985-06-15,john.doe@school.edu,9876543210," +
                   "Mathematics,Teacher,permanent,2020-07-01,5,B.Ed,Mathematics,active,45000," +
                   "123 Main St,Mumbai,Maharashtra,400001,1234-5678-9012,ABCDE1234F," +
                   "HDFC Bank,123456789012,HDFC0001234,PF001,ESI001,UAN001," +
                   "Jane Doe,9876543211,Spouse\n";
        }

        public async Task<StaffDocumentDto> UploadDocumentAsync(Guid staffId, Guid schoolId, string documentType, string fileName, byte[] fileData)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new InvalidOperationException("Staff member not found.");

            // Structured S3 key: SMS-Test/schools/{schoolId}/staff/{staffId}/documents/{type}/{guid}.{ext}
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var key = _fileStorage.BuildAssetKey($"schools/{schoolId}/staff/{staffId}/documents/{documentType}/{Guid.NewGuid()}{ext}");

            using var stream = new MemoryStream(fileData);
            var saved = await _fileStorage.SaveFileAsync(key, stream);
            if (!saved)
                throw new InvalidOperationException("Failed to upload document to cloud storage.");

            var fileUrl = _fileStorage.GetPublicUrl(key);

            var document = new StaffDocument
            {
                Id = Guid.NewGuid(),
                StaffId = staffId,
                Name = fileName,
                Type = documentType,
                Url = fileUrl,
                UploadedAt = DateTime.UtcNow
            };

            _context.StaffDocuments.Add(document);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Staff document uploaded: staffId={StaffId}, type={Type}, key={Key}", staffId, documentType, key);

            return new StaffDocumentDto
            {
                Id = document.Id,
                Name = document.Name,
                Type = document.Type,
                Url = document.Url,
                UploadedAt = document.UploadedAt
            };
        }

        public async Task<string> UploadPhotoAsync(Guid staffId, Guid schoolId, string fileName, byte[] fileData)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new InvalidOperationException("Staff member not found.");

            // Delete the previous photo from storage if one exists
            if (!string.IsNullOrEmpty(staff.ProfilePhoto))
                await _fileStorage.DeleteAsync(staff.ProfilePhoto);

            // Structured S3 key: SMS-Test/schools/{schoolId}/staff/{staffId}/photos/{guid}.{ext}
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var key = _fileStorage.BuildAssetKey($"schools/{schoolId}/staff/{staffId}/photos/{Guid.NewGuid()}{ext}");

            using var stream = new MemoryStream(fileData);
            var saved = await _fileStorage.SaveFileAsync(key, stream);
            if (!saved)
                throw new InvalidOperationException("Failed to upload photo to cloud storage.");

            var photoUrl = _fileStorage.GetPublicUrl(key);
            staff.ProfilePhoto = photoUrl;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Staff photo uploaded: staffId={StaffId}, key={Key}", staffId, key);
            return photoUrl;
        }

        public async Task<bool> DeleteDocumentAsync(Guid documentId, Guid schoolId)
        {
            var document = await _context.StaffDocuments
                .Include(d => d.Staff)
                .FirstOrDefaultAsync(d => d.Id == documentId && d.Staff!.SchoolId == schoolId);

            if (document == null) return false;

            // Delete from S3 storage (accepts full URL or key — service handles extraction)
            if (!string.IsNullOrEmpty(document.Url))
                await _fileStorage.DeleteAsync(document.Url);

            _context.StaffDocuments.Remove(document);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<string>> GetDepartmentsAsync(Guid schoolId)
        {
            return await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && !string.IsNullOrEmpty(s.Department))
                .Select(s => s.Department!)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();
        }

        public async Task<List<string>> GetDesignationsAsync(Guid schoolId)
        {
            return await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && !string.IsNullOrEmpty(s.Designation))
                .Select(s => s.Designation!)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();
        }

        public async Task<List<StaffBasicResponse>> GetSubordinatesAsync(Guid staffId, Guid schoolId)
        {
            return await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && s.ReportingToId == staffId)
                .Select(s => new StaffBasicResponse
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Designation = s.Designation,
                    Department = s.Department,
                    Email = s.Email,
                    Status = s.Status,
                    ProfilePhoto = s.ProfilePhoto
                })
                .ToListAsync();
        }

        public async Task<BulkOperationResult> BulkUpdateStaffStatusAsync(Guid schoolId, BulkUpdateStaffStatusRequest request)
        {
            const int MaxRows = 500;
            var result = new BulkOperationResult();

            if (request.StaffIds == null || request.StaffIds.Count == 0)
            {
                result.Errors.Add("StaffIds is required and cannot be empty.");
                result.FailureCount = 1;
                return result;
            }

            if (request.StaffIds.Count > MaxRows)
            {
                result.Errors.Add($"Bulk update limited to {MaxRows} records. Received {request.StaffIds.Count}.");
                result.FailureCount = request.StaffIds.Count;
                return result;
            }

            if (!ValidStatuses.Contains(request.Status))
            {
                result.Errors.Add($"Invalid status '{request.Status}'. Must be one of: {string.Join(", ", ValidStatuses)}.");
                result.FailureCount = request.StaffIds.Count;
                return result;
            }

            var staffMembers = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && request.StaffIds.Contains(s.Id))
                .ToListAsync();

            // Track IDs not found
            var foundIds = staffMembers.Select(s => s.Id).ToHashSet();
            foreach (var missingId in request.StaffIds.Where(id => !foundIds.Contains(id)))
            {
                result.FailureCount++;
                result.Errors.Add($"Staff ID {missingId} not found.");
            }

            foreach (var staff in staffMembers)
            {
                try
                {
                    staff.Status = request.Status;
                    staff.UpdatedAt = DateTime.UtcNow;

                    // Primary lookup by LinkedEntityId, email fallback
                    var linkedLogin = await _context.UserLogins
                        .FirstOrDefaultAsync(u =>
                            u.SchoolId == schoolId &&
                            u.LinkedEntityId == staff.Id &&
                            u.LinkedEntityType == "staff" &&
                            !u.IsDeleted);

                    if (linkedLogin == null && !string.IsNullOrEmpty(staff.Email))
                    {
                        linkedLogin = await _context.UserLogins
                            .FirstOrDefaultAsync(u =>
                                u.SchoolId == schoolId &&
                                u.Email.ToLower() == staff.Email.Trim().ToLower() &&
                                !u.IsDeleted);
                    }

                    if (linkedLogin != null)
                    {
                        linkedLogin.Status = request.Status == "inactive" ? "inactive" : "active";
                        if (request.Status == "inactive")
                        {
                            linkedLogin.RefreshTokenHash = null;
                            linkedLogin.RefreshTokenExpiry = null;
                        }
                        linkedLogin.UpdatedAt = DateTime.UtcNow;
                    }

                    result.SuccessCount++;
                    result.SuccessfulIds.Add(staff.Id);
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Staff {staff.Id}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return result;
        }

        // ===========================
        // Qualifications Management
        // ===========================

        public async Task<List<QualificationDto>> GetQualificationsAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .Include(s => s.Qualifications)
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                return new List<QualificationDto>();

            return staff.Qualifications?.Select(q => new QualificationDto
            {
                Id = q.Id,
                QualificationType = q.QualificationType,
                DegreeName = q.DegreeName,
                InstitutionName = q.InstitutionName,
                UniversityBoard = q.UniversityBoard,
                Specialization = q.Specialization,
                YearOfPassing = q.YearOfPassing,
                Grade = q.Grade,
                Percentage = q.Percentage,
                CertificateUrl = q.CertificateUrl,
                Remarks = q.Remarks
            }).ToList() ?? new List<QualificationDto>();
        }

        public async Task<QualificationDto> AddQualificationAsync(Guid schoolId, Guid staffId, CreateQualificationDto dto, Guid userId)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            var qualification = new StaffQualification
            {
                Id = Guid.NewGuid(),
                StaffId = staffId,
                QualificationType = dto.QualificationType,
                DegreeName = dto.DegreeName,
                InstitutionName = dto.InstitutionName,
                UniversityBoard = dto.UniversityBoard,
                Specialization = dto.Specialization,
                YearOfPassing = dto.YearOfPassing,
                Grade = dto.Grade,
                Percentage = dto.Percentage,
                CertificateUrl = dto.CertificateUrl,
                Remarks = dto.Remarks,
                SchoolId = schoolId,
                CreatedAt = DateTime.UtcNow
            };

            _context.StaffQualifications.Add(qualification);
            await _context.SaveChangesAsync();

            return new QualificationDto
            {
                Id = qualification.Id,
                QualificationType = qualification.QualificationType,
                DegreeName = qualification.DegreeName,
                InstitutionName = qualification.InstitutionName,
                UniversityBoard = qualification.UniversityBoard,
                Specialization = qualification.Specialization,
                YearOfPassing = qualification.YearOfPassing,
                Grade = qualification.Grade,
                Percentage = qualification.Percentage,
                CertificateUrl = qualification.CertificateUrl,
                Remarks = qualification.Remarks
            };
        }

        public async Task<QualificationDto> UpdateQualificationAsync(Guid schoolId, Guid qualificationId, UpdateQualificationDto dto)
        {
            var qualification = await _context.StaffQualifications
                .FirstOrDefaultAsync(q => q.Id == qualificationId && q.SchoolId == schoolId);

            if (qualification == null)
                throw new Exception("Qualification not found");

            if (dto.QualificationType != null) qualification.QualificationType = dto.QualificationType;
            if (dto.DegreeName != null) qualification.DegreeName = dto.DegreeName;
            if (dto.InstitutionName != null) qualification.InstitutionName = dto.InstitutionName;
            if (dto.UniversityBoard != null) qualification.UniversityBoard = dto.UniversityBoard;
            if (dto.Specialization != null) qualification.Specialization = dto.Specialization;
            if (dto.YearOfPassing.HasValue) qualification.YearOfPassing = dto.YearOfPassing.Value;
            if (dto.Grade != null) qualification.Grade = dto.Grade;
            if (dto.Percentage.HasValue) qualification.Percentage = dto.Percentage;
            if (dto.CertificateUrl != null) qualification.CertificateUrl = dto.CertificateUrl;
            if (dto.Remarks != null) qualification.Remarks = dto.Remarks;
            qualification.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new QualificationDto
            {
                Id = qualification.Id,
                QualificationType = qualification.QualificationType,
                DegreeName = qualification.DegreeName,
                InstitutionName = qualification.InstitutionName,
                UniversityBoard = qualification.UniversityBoard,
                Specialization = qualification.Specialization,
                YearOfPassing = qualification.YearOfPassing,
                Grade = qualification.Grade,
                Percentage = qualification.Percentage,
                CertificateUrl = qualification.CertificateUrl,
                Remarks = qualification.Remarks
            };
        }

        public async Task<bool> DeleteQualificationAsync(Guid schoolId, Guid qualificationId)
        {
            var qualification = await _context.StaffQualifications
                .FirstOrDefaultAsync(q => q.Id == qualificationId && q.SchoolId == schoolId);

            if (qualification == null) return false;

            _context.StaffQualifications.Remove(qualification);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===========================
        // PF/ESI Management
        // ===========================

        public async Task<PFESIDetailsDto> GetPFESIDetailsAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            return new PFESIDetailsDto { StaffId = staff.Id, PfNumber = staff.PfNumber, EsiNumber = staff.EsiNumber, UanNumber = staff.UanNumber };
        }

        public async Task<PFESIDetailsDto> UpdatePFESIDetailsAsync(Guid schoolId, Guid staffId, UpdatePFESIDto dto)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            if (dto.PfNumber != null) staff.PfNumber = dto.PfNumber;
            if (dto.EsiNumber != null) staff.EsiNumber = dto.EsiNumber;
            if (dto.UanNumber != null) staff.UanNumber = dto.UanNumber;
            staff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new PFESIDetailsDto { StaffId = staff.Id, PfNumber = staff.PfNumber, EsiNumber = staff.EsiNumber, UanNumber = staff.UanNumber };
        }

        // ===========================
        // Bank Details
        // ===========================

        public async Task<BankDetailsDto> GetBankDetailsAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            return new BankDetailsDto { StaffId = staff.Id, BankName = staff.BankName, BankAccountNumber = MaskBankAccount(staff.BankAccountNumber), IfscCode = staff.IfscCode };
        }

        public async Task<BankDetailsDto> UpdateBankDetailsAsync(Guid schoolId, Guid staffId, UpdateBankDetailsDto dto)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            if (dto.BankName != null) staff.BankName = dto.BankName;
            if (dto.BankAccountNumber != null) staff.BankAccountNumber = dto.BankAccountNumber;
            if (dto.IfscCode != null) staff.IfscCode = dto.IfscCode;
            staff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new BankDetailsDto { StaffId = staff.Id, BankName = staff.BankName, BankAccountNumber = MaskBankAccount(staff.BankAccountNumber), IfscCode = staff.IfscCode };
        }

        // ===========================
        // Document Management (Enhanced)
        // ===========================

        public async Task<List<StaffDocumentDto>> GetStaffDocumentsAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .Include(s => s.Documents)
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null) return new List<StaffDocumentDto>();

            return (staff.Documents ?? new List<StaffDocument>()).Select(d => new StaffDocumentDto
            {
                Id = d.Id,
                Name = d.Name,
                Type = d.Type,
                Url = d.Url,
                UploadedAt = d.UploadedAt
            }).ToList();
        }

        // ===========================
        // Performance Management
        // ===========================

        public async Task<List<PerformanceReviewDto>> GetPerformanceReviewsAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .Include(s => s.PerformanceReviews)
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null) return new List<PerformanceReviewDto>();

            return (staff.PerformanceReviews ?? new List<PerformanceReview>())
                .OrderByDescending(r => r.ReviewDate)
                .Select(r => new PerformanceReviewDto
                {
                    Id = r.Id, StaffId = r.StaffId, ReviewDate = r.ReviewDate, ReviewPeriod = r.ReviewPeriod,
                    ReviewerId = r.ReviewerId, ReviewerName = r.ReviewerName,
                    TeachingQuality = r.TeachingQuality, ClassroomManagement = r.ClassroomManagement,
                    StudentEngagement = r.StudentEngagement, Punctuality = r.Punctuality,
                    Professionalism = r.Professionalism, Collaboration = r.Collaboration,
                    OverallRating = r.OverallRating, Strengths = r.Strengths,
                    AreasOfImprovement = r.AreasOfImprovement, Goals = r.Goals,
                    Comments = r.Comments, Status = r.Status, AcknowledgedAt = r.AcknowledgedAt,
                    CreatedAt = r.CreatedAt
                }).ToList();
        }

        public async Task<PerformanceReviewDto> AddPerformanceReviewAsync(Guid schoolId, Guid staffId, CreatePerformanceReviewDto dto, Guid userId)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            var reviewer = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == userId && s.SchoolId == schoolId);

            var reviewerName = reviewer != null ? $"{reviewer.FirstName} {reviewer.LastName}" : "System";

            var review = new PerformanceReview
            {
                Id = Guid.NewGuid(),
                StaffId = staffId,
                ReviewDate = dto.ReviewDate,
                ReviewPeriod = dto.ReviewPeriod,
                ReviewerId = userId,
                ReviewerName = reviewerName,
                TeachingQuality = dto.TeachingQuality,
                ClassroomManagement = dto.ClassroomManagement,
                StudentEngagement = dto.StudentEngagement,
                Punctuality = dto.Punctuality,
                Professionalism = dto.Professionalism,
                Collaboration = dto.Collaboration,
                OverallRating = dto.OverallRating,
                Strengths = dto.Strengths,
                AreasOfImprovement = dto.AreasOfImprovement,
                Goals = dto.Goals,
                Comments = dto.Comments,
                Status = "submitted",
                SchoolId = schoolId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PerformanceReviews.Add(review);
            await _context.SaveChangesAsync();

            return new PerformanceReviewDto
            {
                Id = review.Id, StaffId = review.StaffId, ReviewDate = review.ReviewDate,
                ReviewPeriod = review.ReviewPeriod, ReviewerId = review.ReviewerId, ReviewerName = review.ReviewerName,
                TeachingQuality = review.TeachingQuality, ClassroomManagement = review.ClassroomManagement,
                StudentEngagement = review.StudentEngagement, Punctuality = review.Punctuality,
                Professionalism = review.Professionalism, Collaboration = review.Collaboration,
                OverallRating = review.OverallRating, Strengths = review.Strengths,
                AreasOfImprovement = review.AreasOfImprovement, Goals = review.Goals,
                Comments = review.Comments, Status = review.Status, AcknowledgedAt = review.AcknowledgedAt,
                CreatedAt = review.CreatedAt
            };
        }

        // ===========================
        // Leave Balance
        // ===========================

        public async Task<LeaveBalanceDto> GetStaffLeaveBalanceAsync(Guid staffId, Guid schoolId)
        {
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            return new LeaveBalanceDto
            {
                StaffId = staff.Id,
                CasualLeave = staff.CasualLeave,
                SickLeave = staff.SickLeave,
                EarnedLeave = staff.EarnedLeave,
                MaternityLeave = staff.MaternityLeave,
                PaternityLeave = staff.PaternityLeave,
                UnpaidLeave = staff.UnpaidLeave
            };
        }

        public async Task<LeaveBalanceDto> UpdateLeaveBalanceAsync(Guid schoolId, Guid staffId, UpdateLeaveBalanceDto dto)
        {
            var staff = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);

            if (staff == null)
                throw new Exception("Staff member not found");

            if (dto.CasualLeave.HasValue) staff.CasualLeave = dto.CasualLeave.Value;
            if (dto.SickLeave.HasValue) staff.SickLeave = dto.SickLeave.Value;
            if (dto.EarnedLeave.HasValue) staff.EarnedLeave = dto.EarnedLeave.Value;
            if (dto.MaternityLeave.HasValue) staff.MaternityLeave = dto.MaternityLeave.Value;
            if (dto.PaternityLeave.HasValue) staff.PaternityLeave = dto.PaternityLeave.Value;
            if (dto.UnpaidLeave.HasValue) staff.UnpaidLeave = dto.UnpaidLeave.Value;
            staff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new LeaveBalanceDto
            {
                StaffId = staff.Id,
                CasualLeave = staff.CasualLeave,
                SickLeave = staff.SickLeave,
                EarnedLeave = staff.EarnedLeave,
                MaternityLeave = staff.MaternityLeave,
                PaternityLeave = staff.PaternityLeave,
                UnpaidLeave = staff.UnpaidLeave
            };
        }
    }
}

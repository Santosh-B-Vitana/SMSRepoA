using SmsApi.Models.Constants;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface ILeaveManagementService
    {
        Task<List<LeaveTypeResponse>> GetLeaveTypesAsync(Guid schoolId, string? applicableTo = null);
        Task<LeaveTypeResponse> CreateLeaveTypeAsync(CreateLeaveTypeRequest request);
        Task<LeaveTypeResponse?> UpdateLeaveTypeAsync(Guid id, UpdateLeaveTypeRequest request, Guid schoolId);
        Task DeleteLeaveTypeAsync(Guid id, Guid schoolId);
        Task<LeaveRequestListResponse> GetLeaveRequestsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? applicantId = null, string? status = null, string? staffEmail = null);
        Task<LeaveRequestResponse?> GetLeaveRequestByIdAsync(Guid id, Guid schoolId);
        Task<LeaveRequestResponse> CreateLeaveRequestAsync(CreateLeaveRequestRequest request);
        Task<LeaveRequestResponse?> ApproveLeaveAsync(Guid id, ApproveLeaveRequest request, Guid schoolId);
        Task<LeaveRequestResponse?> RejectLeaveAsync(Guid id, RejectLeaveRequest request, Guid schoolId);
        Task<List<LeaveBalanceResponse>> GetLeaveBalanceAsync(Guid userId, string userType, Guid schoolId);
        Task<List<LeaveBalanceResponse>> GetMyLeaveBalanceAsync(string callerEmail, Guid schoolId);
        // Student leave (parent-initiated)
        Task<StudentLeaveResponse> CreateStudentLeaveAsync(string parentEmail, CreateStudentLeaveRequest request, Guid schoolId);
        Task<StudentLeaveListResponse> GetStudentLeaveRequestsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status, Guid? callerUserId = null, string? callerRole = null);
        Task<StudentLeaveResponse?> ApproveStudentLeaveAsync(Guid id, ApproveLeaveRequest request, Guid schoolId, Guid? callerUserId = null, string? callerRole = null);
        Task<StudentLeaveResponse?> RejectStudentLeaveAsync(Guid id, RejectLeaveRequest request, Guid schoolId, Guid? callerUserId = null, string? callerRole = null);
    }

    public class LeaveManagementService : ILeaveManagementService
    {
        private readonly AppDbContext _context;
        private readonly IParentAuthorizationService _parentAuth;
        private static readonly HashSet<string> AllowedApplicableTo = new(StringComparer.OrdinalIgnoreCase)
        {
            "All", "Staff", "Teacher", "Student"
        };
        private static readonly HashSet<string> AllowedUserTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Staff", "Student"
        };

        public LeaveManagementService(AppDbContext context, IParentAuthorizationService parentAuth)
        {
            _context = context;
            _parentAuth = parentAuth;
        }

        public async Task<List<LeaveTypeResponse>> GetLeaveTypesAsync(Guid schoolId, string? applicableTo = null)
        {
            var query = _context.LeaveTypes.Where(lt => lt.SchoolId == schoolId && lt.IsActive);

            if (!string.IsNullOrWhiteSpace(applicableTo))
            {
                query = query.Where(lt => lt.ApplicableTo == applicableTo || lt.ApplicableTo == "All");
            }

            var leaveTypes = await query.OrderBy(lt => lt.Name).ToListAsync();

            return leaveTypes.Select(MapToLeaveTypeResponse).ToList();
        }

        public async Task<LeaveTypeResponse> CreateLeaveTypeAsync(CreateLeaveTypeRequest request)
        {
            ValidateLeaveTypePayload(request.Name, request.ApplicableTo, request.MaxDaysPerYear, request.MinNoticeDays);

            var normalizedName = request.Name.Trim();
            var normalizedApplicableTo = NormalizeApplicableTo(request.ApplicableTo);

            var duplicateExists = await _context.LeaveTypes
                .AnyAsync(lt => lt.SchoolId == request.SchoolId
                             && !lt.IsDeleted
                             && lt.Name.ToLower() == normalizedName.ToLower()
                             && lt.ApplicableTo.ToLower() == normalizedApplicableTo.ToLower());
            if (duplicateExists)
            {
                throw new InvalidOperationException("A leave type with the same name already exists for this scope.");
            }

            var leaveType = new LeaveType
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = normalizedName,
                Description = request.Description,
                ApplicableTo = normalizedApplicableTo,
                MaxDaysPerYear = request.MaxDaysPerYear,
                RequiresApproval = request.RequiresApproval,
                RequiresDocument = request.RequiresDocument,
                MinNoticeDays = request.MinNoticeDays,
                IsCarryForward = request.IsCarryForward,
                IsPaid = request.IsPaid,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeaveTypes.Add(leaveType);
            await _context.SaveChangesAsync();

            return MapToLeaveTypeResponse(leaveType);
        }

        public async Task<LeaveTypeResponse?> UpdateLeaveTypeAsync(Guid id, UpdateLeaveTypeRequest request, Guid schoolId)
        {
            var leaveType = await _context.LeaveTypes
                .FirstOrDefaultAsync(lt => lt.Id == id && lt.SchoolId == schoolId);

            if (leaveType == null)
            {
                throw new KeyNotFoundException($"Leave type with ID {id} not found");
            }

            ValidateLeaveTypePayload(request.Name, leaveType.ApplicableTo, request.MaxDaysPerYear, request.MinNoticeDays);

            var normalizedName = request.Name.Trim();
            var duplicateExists = await _context.LeaveTypes
                .AnyAsync(lt => lt.SchoolId == schoolId
                             && lt.Id != id
                             && !lt.IsDeleted
                             && lt.Name.ToLower() == normalizedName.ToLower()
                             && lt.ApplicableTo.ToLower() == leaveType.ApplicableTo.ToLower());
            if (duplicateExists)
            {
                throw new InvalidOperationException("A leave type with the same name already exists for this scope.");
            }

            var oldMax = leaveType.MaxDaysPerYear;

            leaveType.Name = normalizedName;
            leaveType.Description = request.Description;
            leaveType.MaxDaysPerYear = request.MaxDaysPerYear;
            leaveType.RequiresApproval = request.RequiresApproval;
            leaveType.RequiresDocument = request.RequiresDocument;
            leaveType.MinNoticeDays = request.MinNoticeDays;
            leaveType.IsCarryForward = request.IsCarryForward;
            leaveType.IsPaid = request.IsPaid;
            leaveType.IsActive = request.IsActive;
            leaveType.UpdatedAt = DateTime.UtcNow;

            // Propagate the new quota to all existing LeaveBalance records for the current academic year
            // that still hold the old default (i.e. haven't been individually overridden).
            if (request.MaxDaysPerYear != oldMax)
            {
                var currentYear = DateTime.UtcNow.Year.ToString();
                var affectedBalances = await _context.LeaveBalances
                    .Where(lb => lb.LeaveTypeId == id
                              && lb.SchoolId == schoolId
                              && lb.AcademicYear == currentYear
                              && lb.TotalAllowed == oldMax)
                    .ToListAsync();

                foreach (var bal in affectedBalances)
                {
                    bal.TotalAllowed = request.MaxDaysPerYear;
                    bal.Available = Math.Max(0, request.MaxDaysPerYear - bal.Used);
                    bal.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            return MapToLeaveTypeResponse(leaveType);
        }

        public async Task<LeaveRequestListResponse> GetLeaveRequestsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? applicantId = null, string? status = null, string? staffEmail = null)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 200);

            // If staffEmail provided, resolve to UserLogin.Id and use as applicantId filter
            if (!string.IsNullOrWhiteSpace(staffEmail) && !applicantId.HasValue)
            {
                var loginId = await _context.UserLogins
                    .Where(u => u.Email == staffEmail && u.SchoolId == schoolId && !u.IsDeleted)
                    .Select(u => (Guid?)u.Id)
                    .FirstOrDefaultAsync();
                if (loginId.HasValue)
                    applicantId = loginId;
            }

            var query = _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .Where(lr => lr.SchoolId == schoolId);

            if (applicantId.HasValue)
            {
                // Also include admin-created leave records where ApplicantId == Staff.Id (LinkedEntityId)
                // This happens when no UserLogin was found for the staff at the time of admin marking.
                var linkedEntityId = await _context.UserLogins
                    .Where(u => u.Id == applicantId.Value && u.SchoolId == schoolId && !u.IsDeleted)
                    .Select(u => u.LinkedEntityId)
                    .FirstOrDefaultAsync();

                if (linkedEntityId.HasValue)
                    query = query.Where(lr => lr.ApplicantId == applicantId.Value || lr.ApplicantId == linkedEntityId.Value);
                else
                    query = query.Where(lr => lr.ApplicantId == applicantId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                query = query.Where(lr => lr.Status.ToLower() == normalizedStatus);
            }

            var total = await query.CountAsync();

            var requests = await query
                .OrderByDescending(lr => lr.ApplicationDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Load applicant names: ApplicantId is UserLogin.Id.
            // First try UserLogins (which store FirstName/LastName), then fall back to StaffMembers (for legacy records).
            var applicantIds = requests.Select(r => r.ApplicantId).Distinct().ToList();

            var loginData = await _context.UserLogins
                .Where(u => applicantIds.Contains(u.Id) && u.SchoolId == schoolId && !u.IsDeleted)
                .Select(u => new { u.Id, Name = (u.FirstName + " " + u.LastName).Trim(), u.Email })
                .ToDictionaryAsync(u => u.Id);

            var staffData = await _context.StaffMembers
                .Where(s => applicantIds.Contains(s.Id) && s.SchoolId == schoolId && !s.IsDeleted)
                .Select(s => new { s.Id, Name = (s.FirstName + " " + s.LastName).Trim(), s.Email, s.Designation })
                .ToDictionaryAsync(s => s.Id);

            // Also try to match UserLogin -> StaffMember by email (for name, designation lookup)
            var loginEmails = loginData.Values.Where(l => !string.IsNullOrEmpty(l.Email)).Select(l => l.Email!).ToList();
            var staffByEmail = await _context.StaffMembers
                .Where(s => loginEmails.Contains(s.Email) && s.SchoolId == schoolId && !s.IsDeleted)
                .Select(s => new { s.Email, s.Id, Name = (s.FirstName + " " + s.LastName).Trim(), s.Designation })
                .ToDictionaryAsync(s => s.Email);

            // Merge: UserLogin name takes priority; fall back to StaffMember name
            var resolvedNames = new Dictionary<Guid, string?>();
            var resolvedEmails = new Dictionary<Guid, string?>();
            var resolvedDesignations = new Dictionary<Guid, string?>();
            foreach (var id in applicantIds)
            {
                var login = loginData.GetValueOrDefault(id);
                var staff = staffData.GetValueOrDefault(id);
                var staffViaEmail = login != null && !string.IsNullOrEmpty(login.Email)
                    ? staffByEmail.GetValueOrDefault(login.Email)
                    : null;

                resolvedNames[id] = !string.IsNullOrWhiteSpace(login?.Name) ? login!.Name
                    : !string.IsNullOrWhiteSpace(staffViaEmail?.Name) ? staffViaEmail!.Name
                    : !string.IsNullOrWhiteSpace(staff?.Name) ? staff!.Name
                    : null;

                resolvedEmails[id] = login?.Email ?? staff?.Email;
                resolvedDesignations[id] = staffViaEmail?.Designation ?? staff?.Designation;
            }

            return new LeaveRequestListResponse
            {
                Items = requests.Select(r => MapToLeaveRequestResponse(r,
                    resolvedNames.GetValueOrDefault(r.ApplicantId),
                    resolvedEmails.GetValueOrDefault(r.ApplicantId),
                    resolvedDesignations.GetValueOrDefault(r.ApplicantId))).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<LeaveRequestResponse?> GetLeaveRequestByIdAsync(Guid id, Guid schoolId)
        {
            var leaveRequest = await _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .FirstOrDefaultAsync(lr => lr.Id == id && lr.SchoolId == schoolId);

            if (leaveRequest == null) return null;

            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == leaveRequest.ApplicantId);
            var applicantName = staffMember != null ? $"{staffMember.FirstName} {staffMember.LastName}".Trim() : null;

            return MapToLeaveRequestResponse(leaveRequest, applicantName);
        }

        public async Task<LeaveRequestResponse> CreateLeaveRequestAsync(CreateLeaveRequestRequest request)
        {
            if (!AllowedUserTypes.Contains(request.ApplicantType))
            {
                throw new InvalidOperationException("Invalid applicant type.");
            }

            var applicantExistsInSchool = await _context.UserLogins
                .AnyAsync(u => u.Id == request.ApplicantId && u.SchoolId == request.SchoolId && !u.IsDeleted)
                || await _context.StaffMembers
                    .AnyAsync(s => s.Id == request.ApplicantId && s.SchoolId == request.SchoolId && !s.IsDeleted);
            if (!applicantExistsInSchool)
            {
                throw new InvalidOperationException("Applicant does not exist in this school.");
            }

            // VALIDATION 1: Leave type exists and is active
            var leaveType = await _context.LeaveTypes
                .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.SchoolId == request.SchoolId && lt.IsActive);
            if (leaveType == null)
                throw new InvalidOperationException("Leave type does not exist or is inactive");

            var startDate = request.StartDate.Date;
            var endDate = request.EndDate.Date;

            // VALIDATION 2: Date range validation - start date must be before end date
            if (endDate < startDate)
                throw new InvalidOperationException("Leave end date must be after or equal to start date");

            // VALIDATION 3: Future leave validation - start date must not be too far in past or future
            var today = DateTime.UtcNow.Date;
            if (startDate < today)
                throw new InvalidOperationException("Cannot apply for leaves in the past");

            // VALIDATION 4: Minimum notice days check
            var daysUntilLeave = (startDate - today).Days;
            if (daysUntilLeave < leaveType.MinNoticeDays)
                throw new InvalidOperationException($"Minimum {leaveType.MinNoticeDays} days notice required for this leave type");

            if (leaveType.RequiresDocument && string.IsNullOrWhiteSpace(request.DocumentUrl))
                throw new InvalidOperationException("Document is required for this leave type.");

            // VALIDATION 5: Duplicate leave prevention - no overlapping leaves
            var overlappingLeave = await _context.LeaveRequests
                .AnyAsync(lr => lr.SchoolId == request.SchoolId &&
                               lr.ApplicantId == request.ApplicantId &&
                               (lr.Status.ToLower() == "approved" || lr.Status.ToLower() == "pending") &&
                               lr.StartDate.Date <= endDate &&
                               lr.EndDate.Date >= startDate);
            if (overlappingLeave)
                throw new InvalidOperationException("An overlapping leave request already exists for this period");

            // VALIDATION 6: Reason required for leave
            var trimmedReason = request.Reason?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmedReason) || trimmedReason.Length > 1000)
                throw new InvalidOperationException("Leave reason is required and cannot exceed 1000 characters");

            // Calculate total days
            var totalDays = (endDate - startDate).Days + 1;

            var currentYear = DateTime.UtcNow.Year.ToString();
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(lb => lb.UserId == request.ApplicantId &&
                                          lb.UserType.ToLower() == request.ApplicantType.ToLower() &&
                                          lb.LeaveTypeId == request.LeaveTypeId &&
                                          lb.AcademicYear == currentYear &&
                                          lb.SchoolId == request.SchoolId);

            if (balance == null)
            {
                // Self-heal for first-time leave application in a year.
                // Initialize balance from leave type policy to avoid unnecessary hard failures.
                balance = new LeaveBalance
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    UserId = request.ApplicantId,
                    UserType = request.ApplicantType,
                    LeaveTypeId = request.LeaveTypeId,
                    AcademicYear = currentYear,
                    TotalAllowed = leaveType.MaxDaysPerYear,
                    Used = 0,
                    Available = leaveType.MaxDaysPerYear,
                    CarriedForward = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.LeaveBalances.Add(balance);
            }

            if (balance.Available < totalDays)
                throw new InvalidOperationException("Insufficient leave balance for this request.");

            var leaveRequest = new StaffLeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                LeaveNumber = GenerateLeaveNumber(),
                ApplicantId = request.ApplicantId,
                ApplicantType = request.ApplicantType,
                LeaveTypeId = request.LeaveTypeId,
                StartDate = startDate,
                EndDate = endDate,
                TotalDays = totalDays,
                Reason = trimmedReason,
                DocumentUrl = request.DocumentUrl,
                EmergencyContact = request.EmergencyContact,
                Status = "pending",
                ApplicationDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(leaveRequest);
            
            // Create notification for admin/principal - new leave request pending approval
            var staffMember = await _context.StaffMembers
                .FirstOrDefaultAsync(s => s.Id == request.ApplicantId && s.SchoolId == request.SchoolId);
            
            var staffName = staffMember != null 
                ? $"{staffMember.FirstName} {staffMember.LastName}".Trim() 
                : "Staff Member";

            // Get admin/principal users to notify — use case-insensitive compare because DB seeds lowercase roles
            var admins = await _context.UserLogins
                .Where(u => u.SchoolId == request.SchoolId &&
                           (u.Role.ToLower() == "admin" || u.Role.ToLower() == "principal") &&
                           !u.IsDeleted)
                .ToListAsync();

            foreach (var admin in admins)
            {
                var adminNotification = new Notification
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    RecipientId = admin.Id,
                    RecipientType = "Staff",
                    Type = "LeaveRequest",
                    Title = "New Leave Request Pending Approval",
                    Content = $"{staffName} has submitted a {leaveType.Name} request for {leaveRequest.TotalDays} day(s) from {leaveRequest.StartDate:MM/dd/yyyy} to {leaveRequest.EndDate:MM/dd/yyyy}. Reason: {GetReasonPreview(trimmedReason)}",
                    ReferenceId = leaveRequest.Id,
                    ReferenceType = "LeaveRequest",
                    Priority = "Normal",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(adminNotification);
            }

            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(leaveRequest).Reference(lr => lr.LeaveType).LoadAsync();

            return MapToLeaveRequestResponse(leaveRequest, staffName);
        }

        public async Task<LeaveRequestResponse?> ApproveLeaveAsync(Guid id, ApproveLeaveRequest request, Guid schoolId)
        {
            var leaveRequest = await _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .FirstOrDefaultAsync(lr => lr.Id == id && lr.SchoolId == schoolId);

            if (leaveRequest == null)
            {
                throw new KeyNotFoundException($"Leave request with ID {id} not found");
            }

            if (!string.Equals(leaveRequest.Status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Leave request is already {leaveRequest.Status}");
            }

            if (leaveRequest.ApplicantId == request.ApprovedBy)
            {
                throw new InvalidOperationException("Applicant cannot approve their own leave request.");
            }

            leaveRequest.Status = "approved";
            leaveRequest.ApprovedByStaffId = request.ApprovedBy;
            leaveRequest.ApprovedDate = DateTime.UtcNow;
            leaveRequest.ApproverRemarks = request.ApproverRemarks;
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            // Update leave balance
            var currentYear = DateTime.UtcNow.Year.ToString();
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(lb => lb.UserId == leaveRequest.ApplicantId &&
                                          lb.UserType == leaveRequest.ApplicantType &&
                                          lb.LeaveTypeId == leaveRequest.LeaveTypeId &&
                                          lb.AcademicYear == currentYear &&
                                          lb.SchoolId == schoolId);

            if (balance == null)
            {
                // Self-heal: create balance record so admin approval can always proceed
                balance = new LeaveBalance
                {
                    SchoolId = schoolId,
                    UserId = leaveRequest.ApplicantId,
                    UserType = leaveRequest.ApplicantType ?? "Staff",
                    LeaveTypeId = leaveRequest.LeaveTypeId,
                    AcademicYear = currentYear,
                    TotalAllowed = leaveRequest.LeaveType?.MaxDaysPerYear ?? 30,
                    Used = 0,
                    Available = leaveRequest.LeaveType?.MaxDaysPerYear ?? 30,
                    CarriedForward = 0,
                };
                _context.LeaveBalances.Add(balance);
            }

            // Admin can approve even with insufficient balance (tracks deficit)
            balance.Used += leaveRequest.TotalDays;
            balance.Available = balance.TotalAllowed - balance.Used;
            balance.UpdatedAt = DateTime.UtcNow;

            // Create notification for staff member
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                RecipientId = leaveRequest.ApplicantId,
                RecipientType = "Staff",
                Type = "LeaveApproval",
                Title = "Leave Request Approved",
                Content = $"Your leave request for {leaveRequest.LeaveType?.Name ?? "leave"} from {leaveRequest.StartDate:MM/dd/yyyy} to {leaveRequest.EndDate:MM/dd/yyyy} has been approved.",
                ReferenceId = leaveRequest.Id,
                ReferenceType = "LeaveRequest",
                Priority = "High",
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);

            await _context.SaveChangesAsync();

            return MapToLeaveRequestResponse(leaveRequest, null);
        }

        public async Task<LeaveRequestResponse?> RejectLeaveAsync(Guid id, RejectLeaveRequest request, Guid schoolId)
        {
            var leaveRequest = await _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .FirstOrDefaultAsync(lr => lr.Id == id && lr.SchoolId == schoolId);

            if (leaveRequest == null)
            {
                throw new KeyNotFoundException($"Leave request with ID {id} not found");
            }

            if (!string.Equals(leaveRequest.Status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Leave request is already {leaveRequest.Status}");
            }

            if (string.IsNullOrWhiteSpace(request.ApproverRemarks))
            {
                throw new InvalidOperationException("Rejection reason is required.");
            }

            leaveRequest.Status = "rejected";
            leaveRequest.ApprovedByStaffId = request.RejectedBy;
            leaveRequest.ApprovedDate = DateTime.UtcNow;
            leaveRequest.ApproverRemarks = request.ApproverRemarks.Trim();
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            // Create notification for staff member
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                RecipientId = leaveRequest.ApplicantId,
                RecipientType = "Staff",
                Type = "LeaveRejection",
                Title = "Leave Request Rejected",
                Content = $"Your leave request for {leaveRequest.LeaveType?.Name ?? "leave"} from {leaveRequest.StartDate:MM/dd/yyyy} to {leaveRequest.EndDate:MM/dd/yyyy} has been rejected. Reason: {request.ApproverRemarks ?? "No reason provided"}",
                ReferenceId = leaveRequest.Id,
                ReferenceType = "LeaveRequest",
                Priority = "High",
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);

            await _context.SaveChangesAsync();

            return MapToLeaveRequestResponse(leaveRequest, null);
        }

        public async Task DeleteLeaveTypeAsync(Guid id, Guid schoolId)
        {
            var leaveType = await _context.LeaveTypes
                .FirstOrDefaultAsync(lt => lt.Id == id && lt.SchoolId == schoolId && !lt.IsDeleted);
            if (leaveType == null)
                throw new KeyNotFoundException($"Leave type with ID {id} not found");

            leaveType.IsDeleted = true;
            leaveType.IsActive = false;
            leaveType.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<List<LeaveBalanceResponse>> GetLeaveBalanceAsync(Guid userId, string userType, Guid schoolId)
        {
            if (!AllowedUserTypes.Contains(userType))
            {
                throw new InvalidOperationException("Invalid user type. Allowed values are Staff or Student.");
            }

            var currentYear = DateTime.UtcNow.Year.ToString();

            // Fetch all active leave types applicable to this user
            var allLeaveTypes = await _context.LeaveTypes
                .Where(lt => lt.SchoolId == schoolId && lt.IsActive && !lt.IsDeleted
                          && (lt.ApplicableTo == "All" || lt.ApplicableTo.ToLower() == userType.ToLower()))
                .ToListAsync();

            var existingBalances = await _context.LeaveBalances
                .Include(lb => lb.LeaveType)
                .Where(lb => lb.UserId == userId &&
                            lb.UserType.ToLower() == userType.ToLower() &&
                            lb.SchoolId == schoolId &&
                            lb.AcademicYear == currentYear)
                .ToListAsync();

            // Auto-initialize missing balance records from LeaveType quota
            var newBalances = new List<LeaveBalance>();
            foreach (var lt in allLeaveTypes)
            {
                if (!existingBalances.Any(b => b.LeaveTypeId == lt.Id))
                {
                    var bal = new LeaveBalance
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        UserId = userId,
                        UserType = userType,
                        LeaveTypeId = lt.Id,
                        LeaveType = lt,
                        AcademicYear = currentYear,
                        TotalAllowed = lt.MaxDaysPerYear,
                        Used = 0,
                        Available = lt.MaxDaysPerYear,
                        CarriedForward = 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    newBalances.Add(bal);
                }
            }

            if (newBalances.Count > 0)
            {
                _context.LeaveBalances.AddRange(newBalances);
                await _context.SaveChangesAsync();
                existingBalances.AddRange(newBalances);
            }

            return existingBalances.Select(MapToLeaveBalanceResponse).ToList();
        }

        public async Task<List<LeaveBalanceResponse>> GetMyLeaveBalanceAsync(string callerEmail, Guid schoolId)
        {
            // Resolve the staff entity ID from the caller's email, so staff without LinkedEntityId in JWT can still access their balance
            var staffId = await _context.StaffMembers
                .Where(s => s.Email == callerEmail && s.SchoolId == schoolId && !s.IsDeleted)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync();

            if (staffId == null)
                return new List<LeaveBalanceResponse>();

            return await GetLeaveBalanceAsync(staffId.Value, "Staff", schoolId);
        }

        private LeaveTypeResponse MapToLeaveTypeResponse(LeaveType leaveType)
        {
            return new LeaveTypeResponse
            {
                Id = leaveType.Id,
                SchoolId = leaveType.SchoolId,
                Name = leaveType.Name,
                Description = leaveType.Description,
                ApplicableTo = leaveType.ApplicableTo,
                MaxDaysPerYear = leaveType.MaxDaysPerYear,
                RequiresApproval = leaveType.RequiresApproval,
                RequiresDocument = leaveType.RequiresDocument,
                MinNoticeDays = leaveType.MinNoticeDays,
                IsCarryForward = leaveType.IsCarryForward,
                IsPaid = leaveType.IsPaid,
                IsActive = leaveType.IsActive,
                CreatedAt = leaveType.CreatedAt,
                UpdatedAt = leaveType.UpdatedAt
            };
        }

        // ── Student Leave Methods ─────────────────────────────────────────────────

        public async Task<StudentLeaveResponse> CreateStudentLeaveAsync(string parentEmail, CreateStudentLeaveRequest request, Guid schoolId)
        {
            // Validate the parent is a guardian or sibling-guardian of the student
            var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, request.StudentId);
            if (!canAccess)
                throw new InvalidOperationException("You are not authorised to request leave for this student.");

            // Fetch guardian record for response mapping (may be null if accessing via sibling link)
            var guardian = await _context.StudentGuardians
                .FirstOrDefaultAsync(g => g.StudentId == request.StudentId
                                       && g.SchoolId == schoolId
                                       && g.Email != null
                                       && g.Email.ToLower() == parentEmail.ToLower()
                                       && !g.IsDeleted);

            // Load student
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (student == null)
                throw new InvalidOperationException("Student not found.");

            // Validate leave type
            var leaveType = await _context.LeaveTypes
                .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.SchoolId == schoolId && lt.IsActive
                                        && (lt.ApplicableTo == "Student" || lt.ApplicableTo == "All"));
            if (leaveType == null)
                throw new InvalidOperationException("Leave type does not exist or is not applicable to students.");

            var startDate = request.StartDate.Date;
            var endDate = request.EndDate.Date;

            if (endDate < startDate)
                throw new InvalidOperationException("End date must be on or after start date.");

            var totalDays = (endDate - startDate).Days + 1;

            // Duplicate check
            var overlap = await _context.LeaveRequests.AnyAsync(lr =>
                lr.SchoolId == schoolId &&
                lr.ApplicantId == request.StudentId &&
                lr.ApplicantType == "Student" &&
                (lr.Status.ToLower() == "approved" || lr.Status.ToLower() == "pending") &&
                lr.StartDate.Date <= endDate &&
                lr.EndDate.Date >= startDate);
            if (overlap)
                throw new InvalidOperationException("An overlapping leave request already exists for this student.");

            var reason = string.IsNullOrWhiteSpace(request.Reason) ? "Leave requested by parent/guardian" : request.Reason.Trim();

            // Self-heal leave balance for student
            var currentYear = DateTime.UtcNow.Year.ToString();
            var balance = await _context.LeaveBalances.FirstOrDefaultAsync(lb =>
                lb.UserId == request.StudentId &&
                lb.UserType == "Student" &&
                lb.LeaveTypeId == request.LeaveTypeId &&
                lb.AcademicYear == currentYear &&
                lb.SchoolId == schoolId);

            if (balance == null)
            {
                balance = new LeaveBalance
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    UserId = request.StudentId,
                    UserType = "Student",
                    LeaveTypeId = request.LeaveTypeId,
                    AcademicYear = currentYear,
                    TotalAllowed = leaveType.MaxDaysPerYear,
                    Used = 0,
                    Available = leaveType.MaxDaysPerYear,
                    CarriedForward = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.LeaveBalances.Add(balance);
            }

            var leaveRequest = new StaffLeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                LeaveNumber = GenerateLeaveNumber(),
                ApplicantId = request.StudentId,
                ApplicantType = "Student",
                LeaveTypeId = request.LeaveTypeId,
                StartDate = startDate,
                EndDate = endDate,
                TotalDays = totalDays,
                Reason = reason,
                Status = "Pending",
                ApplicationDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();

            return MapToStudentLeaveResponse(leaveRequest, student, guardian);
        }

        public async Task<StudentLeaveListResponse> GetStudentLeaveRequestsAsync(Guid schoolId, int page, int pageSize, Guid? studentId, string? status, Guid? callerUserId = null, string? callerRole = null)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 200);

            var query = _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .Where(lr => lr.SchoolId == schoolId && lr.ApplicantType == "Student");

            if (studentId.HasValue)
                query = query.Where(lr => lr.ApplicantId == studentId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(lr => lr.Status.ToLower() == status.Trim().ToLower());

            // Class-teacher scoping: Teacher/Staff can only see leaves for students in their assigned classes.
            // Admin, Principal, HRManager see all.
            if (callerUserId.HasValue && !IsPrivilegedRole(callerRole))
            {
                var classIds = await GetClassTeacherClassIdsAsync(callerUserId.Value, schoolId);
                if (classIds.Count == 0)
                {
                    // Not a class teacher for any class — return empty
                    return new StudentLeaveListResponse { Items = new(), TotalCount = 0, Page = page, PageSize = pageSize, TotalPages = 0 };
                }
                // Get class names that this teacher manages, then filter by student.Class
                var classNames = await _context.Classes
                    .Where(c => classIds.Contains(c.Id) && c.SchoolId == schoolId)
                    .Select(c => c.Name)
                    .ToListAsync();
                // Student.Class stores the raw class number (e.g. "1") while Class.Name is "Class 1"
                var classNumbers = classNames
                    .Select(n => n.Replace("Class ", "").Trim())
                    .ToList();
                // Combine both forms so matching works regardless of format
                var allClassKeys = classNames.Concat(classNumbers).Distinct().ToList();
                var allowedStudentIds = await _context.Students
                    .Where(s => s.SchoolId == schoolId && !s.IsDeleted && allClassKeys.Contains(s.Class))
                    .Select(s => s.Id)
                    .ToListAsync();
                query = query.Where(lr => allowedStudentIds.Contains(lr.ApplicantId));
            }

            var total = await query.CountAsync();
            var requests = await query
                .OrderByDescending(lr => lr.ApplicationDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Load student + guardian info
            var studentIds = requests.Select(r => r.ApplicantId).Distinct().ToList();
            var students = await _context.Students
                .Where(s => studentIds.Contains(s.Id) && s.SchoolId == schoolId && !s.IsDeleted)
                .ToDictionaryAsync(s => s.Id);

            var guardians = await _context.StudentGuardians
                .Where(g => studentIds.Contains(g.StudentId) && g.SchoolId == schoolId && !g.IsDeleted)
                .ToListAsync();
            var guardianByStudent = guardians
                .GroupBy(g => g.StudentId)
                .ToDictionary(g => g.Key, g => g.OrderBy(x => x.Relation == "father" ? 0 : x.Relation == "mother" ? 1 : 2).First());

            var items = requests.Select(r =>
            {
                var s = students.GetValueOrDefault(r.ApplicantId);
                var g = guardianByStudent.GetValueOrDefault(r.ApplicantId);
                return MapToStudentLeaveResponse(r, s, g);
            }).ToList();

            return new StudentLeaveListResponse { Items = items, TotalCount = total, Page = page, PageSize = pageSize, TotalPages = (int)Math.Ceiling(total / (double)pageSize) };
        }

        public async Task<StudentLeaveResponse?> ApproveStudentLeaveAsync(Guid id, ApproveLeaveRequest request, Guid schoolId, Guid? callerUserId = null, string? callerRole = null)
        {
            var leaveRequest = await _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .FirstOrDefaultAsync(lr => lr.Id == id && lr.SchoolId == schoolId && lr.ApplicantType == "Student");
            if (leaveRequest == null) throw new KeyNotFoundException("Student leave request not found.");
            if (!string.Equals(leaveRequest.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Leave request is already {leaveRequest.Status}.");

            // Verify caller is the class teacher for this student's class (unless privileged)
            if (callerUserId.HasValue && !IsPrivilegedRole(callerRole))
                await AssertClassTeacherForStudentAsync(callerUserId.Value, leaveRequest.ApplicantId, schoolId);

            leaveRequest.Status = "Approved";
            leaveRequest.ApprovedByStaffId = request.ApprovedBy;
            leaveRequest.ApprovedDate = DateTime.UtcNow;
            leaveRequest.ApproverRemarks = request.ApproverRemarks?.Trim();
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            // Auto-mark attendance as excused for each calendar day of leave
            for (var day = leaveRequest.StartDate.Date; day <= leaveRequest.EndDate.Date; day = day.AddDays(1))
            {
                var existing = await _context.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.StudentId == leaveRequest.ApplicantId && a.Date.Date == day);
                if (existing != null)
                {
                    existing.Status = "excused";
                    existing.IsManualOverride = true;
                    existing.Remarks = $"Leave approved – {leaveRequest.LeaveType?.Name ?? "Leave"}";
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.AttendanceRecords.Add(new AttendanceRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = leaveRequest.ApplicantId,
                        Date = day,
                        Status = "excused",
                        IsManualOverride = true,
                        Remarks = $"Leave approved – {leaveRequest.LeaveType?.Name ?? "Leave"}",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == leaveRequest.ApplicantId && s.SchoolId == schoolId);
            var guardian = student == null ? null : await _context.StudentGuardians
                .Where(g => g.StudentId == student.Id && g.SchoolId == schoolId && !g.IsDeleted)
                .OrderBy(g => g.Relation == "father" ? 0 : g.Relation == "mother" ? 1 : 2)
                .FirstOrDefaultAsync();

            return MapToStudentLeaveResponse(leaveRequest, student, guardian);
        }

        public async Task<StudentLeaveResponse?> RejectStudentLeaveAsync(Guid id, RejectLeaveRequest request, Guid schoolId, Guid? callerUserId = null, string? callerRole = null)
        {
            var leaveRequest = await _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .FirstOrDefaultAsync(lr => lr.Id == id && lr.SchoolId == schoolId && lr.ApplicantType == "Student");
            if (leaveRequest == null) throw new KeyNotFoundException("Student leave request not found.");
            if (!string.Equals(leaveRequest.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Leave request is already {leaveRequest.Status}.");

            if (string.IsNullOrWhiteSpace(request.ApproverRemarks))
                throw new InvalidOperationException("A reason is required when denying a leave request.");

            // Verify caller is the class teacher for this student's class (unless privileged)
            if (callerUserId.HasValue && !IsPrivilegedRole(callerRole))
                await AssertClassTeacherForStudentAsync(callerUserId.Value, leaveRequest.ApplicantId, schoolId);

            leaveRequest.Status = "Rejected";
            leaveRequest.ApprovedByStaffId = request.RejectedBy;
            leaveRequest.ApprovedDate = DateTime.UtcNow;
            leaveRequest.ApproverRemarks = request.ApproverRemarks.Trim();
            leaveRequest.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == leaveRequest.ApplicantId && s.SchoolId == schoolId);
            var guardian = student == null ? null : await _context.StudentGuardians
                .Where(g => g.StudentId == student.Id && g.SchoolId == schoolId && !g.IsDeleted)
                .OrderBy(g => g.Relation == "father" ? 0 : g.Relation == "mother" ? 1 : 2)
                .FirstOrDefaultAsync();

            return MapToStudentLeaveResponse(leaveRequest, student, guardian);
        }

        private StudentLeaveResponse MapToStudentLeaveResponse(StaffLeaveRequest leaveRequest, Student? student, StudentGuardian? guardian)
        {
            var base_ = MapToLeaveRequestResponse(leaveRequest, student != null ? $"{student.FirstName} {student.LastName}".Trim() : null);
            return new StudentLeaveResponse
            {
                Id = base_.Id, SchoolId = base_.SchoolId, LeaveNumber = base_.LeaveNumber,
                ApplicantId = base_.ApplicantId, ApplicantType = base_.ApplicantType, ApplicantName = base_.ApplicantName,
                LeaveTypeId = base_.LeaveTypeId, LeaveTypeName = base_.LeaveTypeName,
                StartDate = base_.StartDate, EndDate = base_.EndDate, TotalDays = base_.TotalDays,
                Reason = base_.Reason, DocumentUrl = base_.DocumentUrl, EmergencyContact = base_.EmergencyContact,
                Status = base_.Status, ApplicationDate = base_.ApplicationDate,
                ApprovedByStaffId = base_.ApprovedByStaffId, ApprovedDate = base_.ApprovedDate, ApproverRemarks = base_.ApproverRemarks,
                CreatedAt = base_.CreatedAt, UpdatedAt = base_.UpdatedAt,
                StudentName = student != null ? $"{student.FirstName} {student.LastName}".Trim() : null,
                ClassName = student?.Class, Section = student?.Section,
                GuardianName = guardian?.Name ?? student?.GuardianName,
                GuardianPhone = guardian?.Phone ?? student?.GuardianPhone
            };
        }

        // ── Helpers ────────────────────────────────────────────────────────────

        /// <summary>Returns true if the role is Admin, Principal, or HRManager — these bypass class-teacher restrictions.</summary>
        private static bool IsPrivilegedRole(string? role)
            => role != null && (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                             || role.Equals("Principal", StringComparison.OrdinalIgnoreCase)
                             || role.Equals("HRManager", StringComparison.OrdinalIgnoreCase));

        /// <summary>
        /// Returns the ClassIds where the given user (identified by UserLogin.Id) is a class teacher.
        /// Resolves: UserLogin.Id → UserLogin.Email → Staff.Email → TeacherAssignment (IsClassTeacher=true).
        /// </summary>
        private async Task<List<Guid>> GetClassTeacherClassIdsAsync(Guid userLoginId, Guid schoolId)
        {
            var email = await _context.UserLogins
                .Where(u => u.Id == userLoginId && u.SchoolId == schoolId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync();
            if (string.IsNullOrWhiteSpace(email)) return new List<Guid>();

            var staffId = await _context.StaffMembers
                .Where(s => s.SchoolId == schoolId && !s.IsDeleted
                         && s.Email.ToLower() == email.ToLower())
                .Select(s => s.Id)
                .FirstOrDefaultAsync();
            if (staffId == Guid.Empty) return new List<Guid>();

            return await _context.TeacherAssignments
                .Where(ta => ta.SchoolId == schoolId
                          && ta.StaffId == staffId
                          && ta.IsClassTeacher
                          && ta.Status == "active")
                .Select(ta => ta.ClassId)
                .Distinct()
                .ToListAsync();
        }

        /// <summary>
        /// Throws UnauthorizedAccessException if the caller is not the class teacher for the given student's class.
        /// </summary>
        private async Task AssertClassTeacherForStudentAsync(Guid callerUserId, Guid studentId, Guid schoolId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted);
            if (student == null) throw new KeyNotFoundException("Student not found.");

            var classIds = await GetClassTeacherClassIdsAsync(callerUserId, schoolId);
            if (classIds.Count == 0)
                throw new UnauthorizedAccessException("Only the assigned class teacher can approve or deny this leave request.");

            // Match: student.Class (e.g. "1") against Class.Name (e.g. "Class 1") or Class.Name == student.Class directly
            var classes = await _context.Classes
                .Where(c => classIds.Contains(c.Id) && c.SchoolId == schoolId)
                .ToListAsync();

            bool isClassTeacher = classes.Any(c =>
                string.Equals(c.Name, student.Class, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(c.Name.Replace("Class ", "").Trim(), student.Class.Trim(), StringComparison.OrdinalIgnoreCase) ||
                string.Equals(c.Name, $"Class {student.Class}".Trim(), StringComparison.OrdinalIgnoreCase));

            if (!isClassTeacher)
                throw new UnauthorizedAccessException("Only the assigned class teacher can approve or deny this leave request.");
        }

        private LeaveRequestResponse MapToLeaveRequestResponse(StaffLeaveRequest leaveRequest, string? applicantName = null, string? applicantEmail = null, string? applicantDesignation = null)
        {
            return new LeaveRequestResponse
            {
                Id = leaveRequest.Id,
                SchoolId = leaveRequest.SchoolId,
                LeaveNumber = leaveRequest.LeaveNumber,
                ApplicantId = leaveRequest.ApplicantId,
                ApplicantType = leaveRequest.ApplicantType,
                ApplicantName = applicantName,
                ApplicantEmail = applicantEmail,
                ApplicantDesignation = applicantDesignation,
                LeaveTypeId = leaveRequest.LeaveTypeId,
                LeaveTypeName = leaveRequest.LeaveType?.Name,
                StartDate = leaveRequest.StartDate,
                EndDate = leaveRequest.EndDate,
                TotalDays = leaveRequest.TotalDays,
                Reason = leaveRequest.Reason,
                DocumentUrl = leaveRequest.DocumentUrl,
                EmergencyContact = leaveRequest.EmergencyContact,
                Status = string.IsNullOrEmpty(leaveRequest.Status)
                    ? "Pending"
                    : char.ToUpper(leaveRequest.Status[0]) + leaveRequest.Status.Substring(1).ToLower(),
                ApplicationDate = leaveRequest.ApplicationDate,
                ApprovedByStaffId = leaveRequest.ApprovedByStaffId,
                ApprovedDate = leaveRequest.ApprovedDate,
                ApproverRemarks = leaveRequest.ApproverRemarks,
                CreatedAt = leaveRequest.CreatedAt,
                UpdatedAt = leaveRequest.UpdatedAt
            };
        }

        private LeaveBalanceResponse MapToLeaveBalanceResponse(LeaveBalance balance)
        {
            return new LeaveBalanceResponse
            {
                Id = balance.Id,
                UserId = balance.UserId,
                UserType = balance.UserType,
                LeaveTypeId = balance.LeaveTypeId,
                LeaveTypeName = balance.LeaveType?.Name,
                AcademicYear = balance.AcademicYear,
                TotalAllowed = balance.TotalAllowed,
                Used = balance.Used,
                Available = balance.Available,
                CarriedForward = balance.CarriedForward
            };
        }

        private static void ValidateLeaveTypePayload(string? name, string? applicableTo, int maxDaysPerYear, int minNoticeDays)
        {
            if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 100)
            {
                throw new InvalidOperationException("Leave type name is required and must be 100 characters or fewer.");
            }

            if (string.IsNullOrWhiteSpace(applicableTo) || !AllowedApplicableTo.Contains(applicableTo))
            {
                throw new InvalidOperationException("ApplicableTo must be one of: All, Staff, Teacher, Student.");
            }

            if (maxDaysPerYear < 0 || maxDaysPerYear > 366)
            {
                throw new InvalidOperationException("MaxDaysPerYear must be between 0 and 366.");
            }

            if (minNoticeDays < 0 || minNoticeDays > 365)
            {
                throw new InvalidOperationException("MinNoticeDays must be between 0 and 365.");
            }
        }

        private static string NormalizeApplicableTo(string applicableTo)
        {
            var value = applicableTo.Trim();
            return char.ToUpperInvariant(value[0]) + value.Substring(1).ToLowerInvariant();
        }

        private static string GenerateLeaveNumber()
        {
            return $"LEAVE-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpperInvariant()}";
        }

        private static string GetReasonPreview(string reason)
        {
            if (reason.Length <= 50)
            {
                return reason;
            }

            return reason.Substring(0, 50) + "...";
        }
    }
}


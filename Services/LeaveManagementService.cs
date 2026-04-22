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
        Task<LeaveRequestListResponse> GetLeaveRequestsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? applicantId = null, string? status = null);
        Task<LeaveRequestResponse?> GetLeaveRequestByIdAsync(Guid id, Guid schoolId);
        Task<LeaveRequestResponse> CreateLeaveRequestAsync(CreateLeaveRequestRequest request);
        Task<LeaveRequestResponse?> ApproveLeaveAsync(Guid id, ApproveLeaveRequest request, Guid schoolId);
        Task<LeaveRequestResponse?> RejectLeaveAsync(Guid id, RejectLeaveRequest request, Guid schoolId);
        Task<List<LeaveBalanceResponse>> GetLeaveBalanceAsync(Guid userId, string userType, Guid schoolId);
    }

    public class LeaveManagementService : ILeaveManagementService
    {
        private readonly AppDbContext _context;
        private static readonly HashSet<string> AllowedApplicableTo = new(StringComparer.OrdinalIgnoreCase)
        {
            "All", "Staff", "Teacher", "Student"
        };
        private static readonly HashSet<string> AllowedUserTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Staff", "Student"
        };

        public LeaveManagementService(AppDbContext context)
        {
            _context = context;
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

            await _context.SaveChangesAsync();

            return MapToLeaveTypeResponse(leaveType);
        }

        public async Task<LeaveRequestListResponse> GetLeaveRequestsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? applicantId = null, string? status = null)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 200);

            var query = _context.LeaveRequests
                .Include(lr => lr.LeaveType)
                .Where(lr => lr.SchoolId == schoolId);

            if (applicantId.HasValue)
            {
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

            // Load staff names for all applicants
            var applicantIds = requests.Select(r => r.ApplicantId).Distinct().ToList();
            var staffNames = await _context.StaffMembers
                .Where(s => applicantIds.Contains(s.Id) && s.SchoolId == schoolId && !s.IsDeleted)
                .ToDictionaryAsync(s => s.Id, s => $"{s.FirstName} {s.LastName}".Trim());

            return new LeaveRequestListResponse
            {
                Items = requests.Select(r => MapToLeaveRequestResponse(r, staffNames.GetValueOrDefault(r.ApplicantId))).ToList(),
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

            // Get admin users to notify
            var admins = await _context.UserLogins
                .Where(u => u.SchoolId == request.SchoolId && 
                           (u.Role == StatusConstants.Roles.Admin || u.Role == "Principal") && 
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
                throw new InvalidOperationException("Leave balance is not configured for this leave type.");
            }

            if (balance.Available < leaveRequest.TotalDays)
            {
                throw new InvalidOperationException("Insufficient leave balance to approve this request.");
            }

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

        public async Task<List<LeaveBalanceResponse>> GetLeaveBalanceAsync(Guid userId, string userType, Guid schoolId)
        {
            if (!AllowedUserTypes.Contains(userType))
            {
                throw new InvalidOperationException("Invalid user type. Allowed values are Staff or Student.");
            }

            var currentYear = DateTime.UtcNow.Year.ToString();

            var balances = await _context.LeaveBalances
                .Include(lb => lb.LeaveType)
                .Where(lb => lb.UserId == userId &&
                            lb.UserType.ToLower() == userType.ToLower() &&
                            lb.SchoolId == schoolId &&
                            lb.AcademicYear == currentYear)
                .ToListAsync();

            return balances.Select(MapToLeaveBalanceResponse).ToList();
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

        private LeaveRequestResponse MapToLeaveRequestResponse(StaffLeaveRequest leaveRequest, string? applicantName = null)
        {
            return new LeaveRequestResponse
            {
                Id = leaveRequest.Id,
                SchoolId = leaveRequest.SchoolId,
                LeaveNumber = leaveRequest.LeaveNumber,
                ApplicantId = leaveRequest.ApplicantId,
                ApplicantType = leaveRequest.ApplicantType,
                ApplicantName = applicantName,
                LeaveTypeId = leaveRequest.LeaveTypeId,
                LeaveTypeName = leaveRequest.LeaveType?.Name,
                StartDate = leaveRequest.StartDate,
                EndDate = leaveRequest.EndDate,
                TotalDays = leaveRequest.TotalDays,
                Reason = leaveRequest.Reason,
                DocumentUrl = leaveRequest.DocumentUrl,
                EmergencyContact = leaveRequest.EmergencyContact,
                Status = leaveRequest.Status,
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


using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IVisitorService
    {
        // Visitor Management
        Task<PaginatedResponse<VisitorBasicDto>> GetVisitorsAsync(
            Guid schoolId, VisitorFiltersDto filters, int page, int pageSize);
        Task<VisitorFullDto?> GetVisitorByIdAsync(Guid schoolId, Guid id);
        Task<VisitorFullDto> CheckInVisitorAsync(Guid schoolId, CreateVisitorDto dto, Guid userId);
        Task<bool> CheckOutVisitorAsync(Guid schoolId, Guid id, Guid userId);
        Task<VisitorFullDto> UpdateVisitorAsync(Guid schoolId, Guid id, UpdateVisitorDto dto);
        Task<bool> CancelVisitAsync(Guid schoolId, Guid id, string reason);

        // Pre-Registration
        Task<List<VisitorPreRegistrationDto>> GetPreRegistrationsAsync(Guid schoolId, string? status);
        Task<VisitorPreRegistrationDto> CreatePreRegistrationAsync(
            Guid schoolId, CreateVisitorPreRegistrationDto dto, Guid userId);
        Task<bool> ApprovePreRegistrationAsync(Guid schoolId, Guid id, Guid userId);

        // Quick Access
        Task<List<VisitorBasicDto>> GetCurrentlyInsideAsync(Guid schoolId);
        Task<List<VisitorBasicDto>> GetTodayVisitsAsync(Guid schoolId);
        Task<List<VisitorBasicDto>> GetTodayVisitorsAsync(Guid schoolId);

        // Analytics
        Task<VisitorStatsDto> GetVisitorStatsAsync(Guid schoolId, DateTime? date);
        Task<List<VisitorBasicDto>> SearchVisitorHistoryAsync(Guid schoolId, string phone, int days);
        Task<List<VisitorBasicDto>> GetVisitorHistoryAsync(Guid schoolId, string phone);
    }

    public class VisitorService : IVisitorService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<VisitorService> _logger;

        public VisitorService(AppDbContext context, ILogger<VisitorService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== VISITOR MANAGEMENT ==========

        public async Task<PaginatedResponse<VisitorBasicDto>> GetVisitorsAsync(
            Guid schoolId, VisitorFiltersDto filters, int page, int pageSize)
        {
            try
            {
                var query = _context.VisitorLogs
                    .Include(v => v.Visitor)
                    .Where(v => v.SchoolId == schoolId);

                // Apply filters
                if (!string.IsNullOrEmpty(filters.Purpose))
                    query = query.Where(v => v.Purpose == filters.Purpose);
                
                if (!string.IsNullOrEmpty(filters.Status))
                    query = query.Where(v => v.Status == filters.Status);
                
                if (filters.DateFrom.HasValue)
                    query = query.Where(v => v.CheckInTime.Date >= filters.DateFrom.Value.Date);
                
                if (filters.DateTo.HasValue)
                    query = query.Where(v => v.CheckInTime.Date <= filters.DateTo.Value.Date);
                
                if (!string.IsNullOrEmpty(filters.PersonToMeet))
                    query = query.Where(v => v.PersonToMeet != null && v.PersonToMeet.Contains(filters.PersonToMeet));
                
                if (!string.IsNullOrEmpty(filters.SearchQuery))
                {
                    query = query.Where(v => 
                        v.Visitor != null && 
                        (v.Visitor.Name.Contains(filters.SearchQuery) || 
                         (v.Visitor.Phone != null && v.Visitor.Phone.Contains(filters.SearchQuery)) ||
                         (v.Visitor.Organization != null && v.Visitor.Organization.Contains(filters.SearchQuery))));
                }

                var totalCount = await query.CountAsync();
                var items = await query
                    .AsNoTracking()
                    .OrderByDescending(v => v.CheckInTime)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(v => new VisitorBasicDto
                    {
                        Id = v.Id,
                        VisitorId = v.VisitorId,
                        VisitNumber = v.VisitNumber,
                        VisitorName = v.Visitor != null ? v.Visitor.Name : "",
                        Phone = v.Visitor != null ? v.Visitor.Phone : null,
                        Organization = v.Visitor != null ? v.Visitor.Organization : null,
                        Purpose = v.Purpose,
                        PersonToMeet = v.PersonToMeet,
                        CheckInTime = v.CheckInTime,
                        CheckOutTime = v.CheckOutTime,
                        Status = v.Status,
                        VisitDuration = v.CheckOutTime.HasValue 
                            ? (int)(v.CheckOutTime.Value - v.CheckInTime).TotalMinutes 
                            : null
                    })
                    .ToListAsync();

                return new PaginatedResponse<VisitorBasicDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitors for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<VisitorFullDto?> GetVisitorByIdAsync(Guid schoolId, Guid id)
        {
            try
            {
                var visitorLog = await _context.VisitorLogs
                    .AsNoTracking()
                    .Include(v => v.Visitor)
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && v.Id == id);

                if (visitorLog == null) return null;

                int? visitDuration = null;
                if (visitorLog.CheckOutTime.HasValue)
                {
                    visitDuration = (int)(visitorLog.CheckOutTime.Value - visitorLog.CheckInTime).TotalMinutes;
                }

                return new VisitorFullDto
                {
                    Id = visitorLog.Id,
                    SchoolId = visitorLog.SchoolId,
                    VisitorId = visitorLog.VisitorId,
                    VisitNumber = visitorLog.VisitNumber,
                    VisitorName = visitorLog.Visitor?.Name ?? "",
                    Phone = visitorLog.Visitor?.Phone,
                    Email = visitorLog.Visitor?.Email,
                    IdType = visitorLog.Visitor?.IdType,
                    IdNumber = visitorLog.Visitor?.IdNumber,
                    Address = visitorLog.Visitor?.Address,
                    PhotoUrl = visitorLog.Visitor?.PhotoUrl,
                    Organization = visitorLog.Visitor?.Organization,
                    Purpose = visitorLog.Purpose,
                    PersonToMeet = visitorLog.PersonToMeet,
                    Department = visitorLog.Department,
                    StaffMeetingId = visitorLog.StaffMeetingId,
                    ItemsCarried = visitorLog.ItemsCarried,
                    PassNumber = visitorLog.PassNumber,
                    CheckInTime = visitorLog.CheckInTime,
                    CheckOutTime = visitorLog.CheckOutTime,
                    Status = visitorLog.Status,
                    Remarks = visitorLog.Remarks,
                    CheckedInByStaffId = visitorLog.CheckedInByStaffId,
                    CheckedOutByStaffId = visitorLog.CheckedOutByStaffId,
                    VisitDuration = visitDuration,
                    CreatedAt = visitorLog.CreatedAt,
                    UpdatedAt = visitorLog.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitor by ID {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<VisitorFullDto> CheckInVisitorAsync(Guid schoolId, CreateVisitorDto dto, Guid userId)
        {
            try
            {
                // VALIDATION 1: Visitor name and purpose required
                if (string.IsNullOrWhiteSpace(dto.VisitorName) || string.IsNullOrWhiteSpace(dto.Purpose))
                    throw new InvalidOperationException("Visitor name and visit purpose are required");

                // VALIDATION 2: Purpose must be from predefined list
                var validPurposes = new[] { "meeting", "delivery", "maintenance", "support", "interview", "official", "other" };
                if (!validPurposes.Contains(dto.Purpose?.ToLower()))
                    throw new InvalidOperationException("Invalid visit purpose specified");

                // VALIDATION 3: Person to meet must be recorded
                if (string.IsNullOrWhiteSpace(dto.PersonToMeet))
                    throw new InvalidOperationException("Person to meet cannot be empty");

                // VALIDATION 4: Check for existing active check-in (prevent duplicate check-in)
                var activeVisit = await _context.VisitorLogs
                    .AnyAsync(vl => vl.SchoolId == schoolId &&
                                   vl.VisitorId != null && // Will be set below
                                   vl.Status == "checked_in" &&
                                   vl.CheckInTime.Date == DateTime.UtcNow.Date);

                // Find or create visitor
                var visitor = await _context.Visitors
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && 
                                            v.Phone == dto.Phone && 
                                            !string.IsNullOrEmpty(dto.Phone));

                if (visitor == null)
                {
                    visitor = new Visitor
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        Name = dto.VisitorName,
                        Phone = dto.Phone,
                        Email = dto.Email,
                        IdType = dto.IdType,
                        IdNumber = dto.IdNumber,
                        Address = dto.Address,
                        PhotoUrl = dto.PhotoUrl,
                        Organization = dto.Organization,
                        IsBlacklisted = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Visitors.Add(visitor);
                }

                // VALIDATION 5: Check for blacklist
                if (visitor.IsBlacklisted)
                {
                    _logger.LogWarning("Blacklisted visitor attempted check-in: {VisitorName}", visitor.Name);
                    throw new InvalidOperationException($"Visitor is blacklisted: {visitor.BlacklistReason}");
                }

                // VALIDATION 6: Prevent duplicate active check-in for same visitor on same day
                var todayActiveCheckIn = await _context.VisitorLogs
                    .AnyAsync(vl => vl.SchoolId == schoolId &&
                                   vl.VisitorId == visitor.Id &&
                                   vl.Status == "checked_in" &&
                                   vl.CheckInTime.Date == DateTime.UtcNow.Date);
                if (todayActiveCheckIn)
                    throw new InvalidOperationException("This visitor is already checked in today");

                // Generate visit number
                var todayCount = await _context.VisitorLogs
                    .Where(v => v.SchoolId == schoolId && v.CheckInTime.Date == DateTime.UtcNow.Date)
                    .CountAsync();
                var visitNumber = $"VIS-{DateTime.UtcNow:yyyyMMdd}-{(todayCount + 1):D4}";

                // Create visitor log
                var visitorLog = new VisitorLog
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    VisitorId = visitor.Id,
                    VisitNumber = visitNumber,
                    CheckInTime = DateTime.UtcNow,
                    Purpose = dto.Purpose,
                    PersonToMeet = dto.PersonToMeet,
                    Department = dto.Department,
                    StaffMeetingId = dto.StaffMeetingId,
                    StudentId = dto.StudentId,
                    ItemsCarried = dto.ItemsCarried,
                    PassNumber = dto.PassNumber,
                    Status = "checked_in",
                    Remarks = dto.Remarks,
                    CheckedInByStaffId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.VisitorLogs.Add(visitorLog);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Visitor checked in: {VisitNumber} at school {SchoolId}", visitNumber, schoolId);

                return await GetVisitorByIdAsync(schoolId, visitorLog.Id) 
                    ?? throw new Exception("Failed to retrieve created visitor log");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking in visitor for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<bool> CheckOutVisitorAsync(Guid schoolId, Guid id, Guid userId)
        {
            try
            {
                var visitorLog = await _context.VisitorLogs
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && v.Id == id);

                if (visitorLog == null)
                {
                    _logger.LogWarning("Visitor log not found: {Id}", id);
                    return false;
                }

                if (visitorLog.Status == "checked_out")
                    throw new InvalidOperationException("Visitor already checked out");

                if (visitorLog.Status == "cancelled")
                    throw new InvalidOperationException("Cannot check out a cancelled visit");

                visitorLog.CheckOutTime = DateTime.UtcNow;
                visitorLog.Status = "checked_out";
                visitorLog.CheckedOutByStaffId = userId;
                visitorLog.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Visitor checked out: {VisitNumber} at school {SchoolId}", 
                    visitorLog.VisitNumber, schoolId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking out visitor {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<VisitorFullDto> UpdateVisitorAsync(Guid schoolId, Guid id, UpdateVisitorDto dto)
        {
            try
            {
                var visitorLog = await _context.VisitorLogs
                    .Include(v => v.Visitor)
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && v.Id == id);

                if (visitorLog == null)
                    throw new KeyNotFoundException("Visitor log not found");

                // Update visitor log
                if (!string.IsNullOrEmpty(dto.Purpose))
                    visitorLog.Purpose = dto.Purpose;
                
                if (dto.PersonToMeet != null)
                    visitorLog.PersonToMeet = dto.PersonToMeet;
                
                if (dto.Department != null)
                    visitorLog.Department = dto.Department;
                
                if (dto.ItemsCarried != null)
                    visitorLog.ItemsCarried = dto.ItemsCarried;
                
                if (dto.Remarks != null)
                    visitorLog.Remarks = dto.Remarks;

                if (dto.StaffMeetingId.HasValue)
                    visitorLog.StaffMeetingId = dto.StaffMeetingId.Value;

                visitorLog.UpdatedAt = DateTime.UtcNow;

                // Update visitor master data if provided
                if (visitorLog.Visitor != null)
                {
                    if (!string.IsNullOrEmpty(dto.Email))
                        visitorLog.Visitor.Email = dto.Email;
                    
                    if (!string.IsNullOrEmpty(dto.Organization))
                        visitorLog.Visitor.Organization = dto.Organization;
                    
                    visitorLog.Visitor.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Visitor log updated: {Id} at school {SchoolId}", id, schoolId);

                return await GetVisitorByIdAsync(schoolId, id) 
                    ?? throw new Exception("Failed to retrieve updated visitor log");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating visitor {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<bool> CancelVisitAsync(Guid schoolId, Guid id, string reason)
        {
            try
            {
                var visitorLog = await _context.VisitorLogs
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && v.Id == id);

                if (visitorLog == null)
                {
                    _logger.LogWarning("Visitor log not found: {Id}", id);
                    return false;
                }

                if (visitorLog.Status == "checked_out")
                    throw new InvalidOperationException("Cannot cancel a completed visit");

                visitorLog.Status = "cancelled";
                visitorLog.Remarks = string.IsNullOrEmpty(visitorLog.Remarks) 
                    ? $"Cancelled: {reason}" 
                    : $"{visitorLog.Remarks}\nCancelled: {reason}";
                visitorLog.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Visit cancelled: {VisitNumber} at school {SchoolId}", 
                    visitorLog.VisitNumber, schoolId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling visit {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        // ========== PRE-REGISTRATION ==========

        public async Task<List<VisitorPreRegistrationDto>> GetPreRegistrationsAsync(Guid schoolId, string? status)
        {
            try
            {
                var query = _context.VisitorPreRegistrations
                    .AsNoTracking()
                    .Where(vp => vp.SchoolId == schoolId);

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(vp => vp.Status == status);

                var preRegistrations = await query
                    .OrderByDescending(vp => vp.CreatedAt)
                    .ToListAsync();

                return preRegistrations.Select(vp => new VisitorPreRegistrationDto
                {
                    Id = vp.Id,
                    SchoolId = vp.SchoolId,
                    VisitorName = vp.VisitorName,
                    Phone = vp.VisitorPhone,
                    Email = vp.VisitorEmail,
                    Organization = vp.VisitorCompany,
                    Purpose = vp.Purpose,
                    PersonToMeet = vp.PersonToMeet,
                    Department = vp.Department,
                    ScheduledDate = vp.ExpectedDate,
                    ScheduledTime = vp.ExpectedTime.HasValue ? vp.ExpectedTime.Value.ToString(@"hh\:mm") : null,
                    Status = vp.Status,
                    CreatedAt = vp.CreatedAt
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pre-registrations for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<VisitorPreRegistrationDto> CreatePreRegistrationAsync(
            Guid schoolId, CreateVisitorPreRegistrationDto dto, Guid userId)
        {
            try
            {
                var preRegistration = new VisitorPreRegistration
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    VisitorName = dto.VisitorName,
                    VisitorPhone = dto.Phone ?? "",
                    VisitorEmail = dto.Email,
                    VisitorCompany = dto.Organization,
                    Purpose = dto.Purpose,
                    PersonToMeet = dto.PersonToMeet,
                    Department = dto.Department,
                    ExpectedDate = dto.ScheduledDate ?? DateTime.UtcNow.AddDays(1),
                    ExpectedTime = string.IsNullOrEmpty(dto.ScheduledTime) ? null : TimeSpan.Parse(dto.ScheduledTime),
                    Status = "pending",
                    RegisteredBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.VisitorPreRegistrations.Add(preRegistration);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Visitor pre-registration created for {VisitorName} at school {SchoolId}", 
                    dto.VisitorName, schoolId);

                return new VisitorPreRegistrationDto
                {
                    Id = preRegistration.Id,
                    SchoolId = preRegistration.SchoolId,
                    VisitorName = preRegistration.VisitorName,
                    Phone = preRegistration.VisitorPhone,
                    Email = preRegistration.VisitorEmail,
                    Organization = preRegistration.VisitorCompany,
                    Purpose = preRegistration.Purpose,
                    PersonToMeet = preRegistration.PersonToMeet,
                    Department = preRegistration.Department,
                    ScheduledDate = preRegistration.ExpectedDate,
                    ScheduledTime = preRegistration.ExpectedTime?.ToString(@"hh\:mm"),
                    Status = preRegistration.Status,
                    CreatedAt = preRegistration.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating pre-registration for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<bool> ApprovePreRegistrationAsync(Guid schoolId, Guid id, Guid userId)
        {
            try
            {
                var preRegistration = await _context.Set<VisitorPreRegistration>()
                    .FirstOrDefaultAsync(vp => vp.SchoolId == schoolId && vp.Id == id);

                if (preRegistration == null)
                {
                    _logger.LogWarning("Pre-registration not found: {Id}", id);
                    return false;
                }

                if (preRegistration.Status != "pre_registered")
                    throw new InvalidOperationException("Pre-registration has already been processed");

                preRegistration.Status = "approved";
                preRegistration.ApprovedBy = userId;
                preRegistration.ApprovedAt = DateTime.UtcNow;
                preRegistration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Pre-registration approved: {Id} at school {SchoolId}", id, schoolId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving pre-registration {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        // ========== QUICK ACCESS ==========

        public async Task<List<VisitorBasicDto>> GetCurrentlyInsideAsync(Guid schoolId)
        {
            try
            {
                var visitors = await _context.VisitorLogs
                    .AsNoTracking()
                    .Include(v => v.Visitor)
                    .Where(v => v.SchoolId == schoolId && 
                               v.Status == "checked_in" && 
                               v.CheckOutTime == null)
                    .OrderBy(v => v.CheckInTime)
                    .Select(v => new VisitorBasicDto
                    {
                        Id = v.Id,
                        VisitorId = v.VisitorId,
                        VisitNumber = v.VisitNumber,
                        VisitorName = v.Visitor != null ? v.Visitor.Name : "",
                        Phone = v.Visitor != null ? v.Visitor.Phone : null,
                        Organization = v.Visitor != null ? v.Visitor.Organization : null,
                        Purpose = v.Purpose,
                        PersonToMeet = v.PersonToMeet,
                        CheckInTime = v.CheckInTime,
                        CheckOutTime = null,
                        Status = v.Status,
                        VisitDuration = (int)(DateTime.UtcNow - v.CheckInTime).TotalMinutes
                    })
                    .ToListAsync();

                return visitors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currently inside visitors for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<List<VisitorBasicDto>> GetTodayVisitsAsync(Guid schoolId)
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var visitors = await _context.VisitorLogs
                    .AsNoTracking()
                    .Include(v => v.Visitor)
                    .Where(v => v.SchoolId == schoolId && v.CheckInTime.Date == today)
                    .OrderByDescending(v => v.CheckInTime)
                    .Select(v => new VisitorBasicDto
                    {
                        Id = v.Id,
                        VisitorId = v.VisitorId,
                        VisitNumber = v.VisitNumber,
                        VisitorName = v.Visitor != null ? v.Visitor.Name : "",
                        Phone = v.Visitor != null ? v.Visitor.Phone : null,
                        Organization = v.Visitor != null ? v.Visitor.Organization : null,
                        Purpose = v.Purpose,
                        PersonToMeet = v.PersonToMeet,
                        CheckInTime = v.CheckInTime,
                        CheckOutTime = v.CheckOutTime,
                        Status = v.Status,
                        VisitDuration = v.CheckOutTime.HasValue 
                            ? (int)(v.CheckOutTime.Value - v.CheckInTime).TotalMinutes 
                            : null
                    })
                    .ToListAsync();

                return visitors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting today's visits for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<List<VisitorBasicDto>> GetTodayVisitorsAsync(Guid schoolId)
        {
            return await GetTodayVisitsAsync(schoolId);
        }

        // ========== ANALYTICS ==========

        public async Task<VisitorStatsDto> GetVisitorStatsAsync(Guid schoolId, DateTime? date)
        {
            try
            {
                var targetDate = date?.Date ?? DateTime.UtcNow.Date;

                var todayVisits = await _context.VisitorLogs
                    .AsNoTracking()
                    .Where(v => v.SchoolId == schoolId && v.CheckInTime.Date == targetDate)
                    .ToListAsync();

                var currentlyInside = todayVisits.Count(v => v.Status == "checked_in" && v.CheckOutTime == null);
                var completedToday = todayVisits.Count(v => v.Status == "checked_out" && v.CheckOutTime.HasValue);
                
                var completedVisits = todayVisits.Where(v => v.CheckOutTime.HasValue).ToList();
                var avgDuration = completedVisits.Any() 
                    ? (int)completedVisits.Average(v => (v.CheckOutTime!.Value - v.CheckInTime).TotalMinutes)
                    : 0;

                // Purpose breakdown
                var purposeBreakdown = todayVisits
                    .GroupBy(v => v.Purpose)
                    .ToDictionary(g => g.Key, g => g.Count());

                return new VisitorStatsDto
                {
                    TodayTotal = todayVisits.Count,
                    CurrentlyInside = currentlyInside,
                    CompletedToday = completedToday,
                    CancelledToday = todayVisits.Count(v => v.Status == "cancelled"),
                    AverageVisitDuration = avgDuration,
                    PurposeBreakdown = purposeBreakdown
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting visitor stats for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<List<VisitorBasicDto>> SearchVisitorHistoryAsync(Guid schoolId, string phone, int days)
        {
            try
            {
                var startDate = DateTime.UtcNow.AddDays(-days).Date;

                var visitors = await _context.VisitorLogs
                    .AsNoTracking()
                    .Include(v => v.Visitor)
                    .Where(v => v.SchoolId == schoolId && 
                               v.Visitor != null && 
                               v.Visitor.Phone == phone &&
                               v.CheckInTime >= startDate)
                    .OrderByDescending(v => v.CheckInTime)
                    .Select(v => new VisitorBasicDto
                    {
                        Id = v.Id,
                        VisitorId = v.VisitorId,
                        VisitNumber = v.VisitNumber,
                        VisitorName = v.Visitor != null ? v.Visitor.Name : "",
                        Phone = v.Visitor != null ? v.Visitor.Phone : null,
                        Organization = v.Visitor != null ? v.Visitor.Organization : null,
                        Purpose = v.Purpose,
                        PersonToMeet = v.PersonToMeet,
                        CheckInTime = v.CheckInTime,
                        CheckOutTime = v.CheckOutTime,
                        Status = v.Status,
                        VisitDuration = v.CheckOutTime.HasValue 
                            ? (int)(v.CheckOutTime.Value - v.CheckInTime).TotalMinutes 
                            : null
                    })
                    .ToListAsync();

                return visitors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching visitor history for phone {Phone} at school {SchoolId}", 
                    phone, schoolId);
                throw;
            }
        }

        public async Task<List<VisitorBasicDto>> GetVisitorHistoryAsync(Guid schoolId, string phone)
        {
            return await SearchVisitorHistoryAsync(schoolId, phone, 90);
        }
    }
}


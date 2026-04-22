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
    public interface IVisitorManagementService
    {
        Task<VisitorListResponse> GetVisitorsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? searchTerm = null);
        Task<VisitorResponse?> GetVisitorByIdAsync(Guid id, Guid schoolId);
        Task<VisitorResponse> CreateVisitorAsync(CreateVisitorRequest request);
        Task<VisitorResponse?> UpdateVisitorAsync(Guid id, UpdateVisitorRequest request, Guid schoolId);
        Task<VisitorLogListResponse> GetVisitorLogsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? visitorId = null, string? status = null);
        Task<VisitorLogResponse> CheckInVisitorAsync(CheckInVisitorRequest request);
        Task<VisitorLogResponse?> CheckOutVisitorAsync(Guid logId, CheckOutVisitorRequest request, Guid schoolId);
        Task<VisitorLogListResponse> GetActiveVisitsAsync(Guid schoolId, int page = 1, int pageSize = 10);
    }

    public class VisitorManagementService : IVisitorManagementService
    {
        private readonly AppDbContext _context;

        public VisitorManagementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<VisitorListResponse> GetVisitorsAsync(Guid schoolId, int page = 1, int pageSize = 10, string? searchTerm = null)
        {
            // Pagination safety: normalize bounds to prevent OutOfMemory
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.Visitors.Where(v => v.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(v => v.Name.Contains(searchTerm) ||
                                        (v.Phone != null && v.Phone.Contains(searchTerm)) ||
                                        (v.Email != null && v.Email.Contains(searchTerm)));
            }

            var total = await query.CountAsync();

            var visitors = await query
                .OrderBy(v => v.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new VisitorListResponse
            {
                Items = visitors.Select(v => new VisitorBasicDto
                {
                    Id = v.Id,
                    Name = v.Name,
                    Phone = v.Phone,
                    Email = v.Email,
                    Organization = v.Organization,
                    IsBlacklisted = v.IsBlacklisted,
                    CreatedAt = v.CreatedAt
                }).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<VisitorResponse?> GetVisitorByIdAsync(Guid id, Guid schoolId)
        {
            var visitor = await _context.Visitors
                .FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);

            return visitor == null ? null : MapToVisitorResponse(visitor);
        }

        public async Task<VisitorResponse> CreateVisitorAsync(CreateVisitorRequest request)
        {
            // Validation: Required fields
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Visitor name is required and cannot be empty", nameof(request.Name));
            
            if (request.Name.Length > 100)
                throw new ArgumentException("Visitor name cannot exceed 100 characters", nameof(request.Name));

            if (string.IsNullOrWhiteSpace(request.Phone))
                throw new ArgumentException("Phone number is required and cannot be empty", nameof(request.Phone));

            if (request.Phone.Length > 15)
                throw new ArgumentException("Phone number cannot exceed 15 characters", nameof(request.Phone));

            // Validation: Email if provided
            if (!string.IsNullOrWhiteSpace(request.Email) && request.Email.Length > 100)
                throw new ArgumentException("Email cannot exceed 100 characters", nameof(request.Email));

            // Validation: Organization if provided
            if (!string.IsNullOrWhiteSpace(request.Organization) && request.Organization.Length > 50)
                throw new ArgumentException("Organization cannot exceed 50 characters", nameof(request.Organization));

            // Validation: Address if provided
            if (!string.IsNullOrWhiteSpace(request.Address) && request.Address.Length > 500)
                throw new ArgumentException("Address cannot exceed 500 characters", nameof(request.Address));

            // Validation: PhotoUrl if provided
            if (!string.IsNullOrWhiteSpace(request.PhotoUrl) && request.PhotoUrl.Length > 500)
                throw new ArgumentException("PhotoUrl cannot exceed 500 characters", nameof(request.PhotoUrl));

            // Validation: IdNumber if provided
            if (!string.IsNullOrWhiteSpace(request.IdNumber) && request.IdNumber.Length > 50)
                throw new ArgumentException("IdNumber cannot exceed 50 characters", nameof(request.IdNumber));

            // Validation: Duplicate phone prevention
            var existingVisitor = await _context.Visitors
                .FirstOrDefaultAsync(v => v.SchoolId == request.SchoolId && v.Phone == request.Phone);
            
            if (existingVisitor != null)
                throw new InvalidOperationException($"A visitor with phone number '{request.Phone}' already exists in this school");

            var visitor = new Visitor
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                Name = request.Name,
                Phone = request.Phone,
                Email = request.Email,
                IdType = request.IdType,
                IdNumber = request.IdNumber,
                Address = request.Address,
                PhotoUrl = request.PhotoUrl,
                Organization = request.Organization,
                IsBlacklisted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Visitors.Add(visitor);
            await _context.SaveChangesAsync();

            return MapToVisitorResponse(visitor);
        }

        public async Task<VisitorResponse?> UpdateVisitorAsync(Guid id, UpdateVisitorRequest request, Guid schoolId)
        {
            var visitor = await _context.Visitors
                .FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);

            if (visitor == null)
            {
                throw new KeyNotFoundException($"Visitor with ID {id} not found");
            }

            // Validation: Name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                if (request.Name.Length > 100)
                    throw new ArgumentException("Visitor name cannot exceed 100 characters", nameof(request.Name));
                
                visitor.Name = request.Name;
            }

            // Validation: Phone if provided
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                if (request.Phone.Length > 15)
                    throw new ArgumentException("Phone number cannot exceed 15 characters", nameof(request.Phone));

                // Validation: Check duplicate phone (excluding current visitor)
                var duplicatePhone = await _context.Visitors
                    .FirstOrDefaultAsync(v => v.SchoolId == schoolId && v.Phone == request.Phone && v.Id != id);
                
                if (duplicatePhone != null)
                    throw new InvalidOperationException($"A visitor with phone number '{request.Phone}' already exists in this school");

                visitor.Phone = request.Phone;
            }

            // Validation: Email if provided
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                if (request.Email.Length > 100)
                    throw new ArgumentException("Email cannot exceed 100 characters", nameof(request.Email));
                
                visitor.Email = request.Email;
            }

            // Validation: Address if provided
            if (!string.IsNullOrWhiteSpace(request.Address))
            {
                if (request.Address.Length > 500)
                    throw new ArgumentException("Address cannot exceed 500 characters", nameof(request.Address));
                
                visitor.Address = request.Address;
            }

            // Validation: Organization if provided
            if (!string.IsNullOrWhiteSpace(request.Organization))
            {
                if (request.Organization.Length > 50)
                    throw new ArgumentException("Organization cannot exceed 50 characters", nameof(request.Organization));
                
                visitor.Organization = request.Organization;
            }

            visitor.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToVisitorResponse(visitor);
        }

        public async Task<VisitorLogListResponse> GetVisitorLogsAsync(Guid schoolId, int page = 1, int pageSize = 10, Guid? visitorId = null, string? status = null)
        {
            // Pagination safety: normalize bounds to prevent OutOfMemory
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.VisitorLogs
                .Include(vl => vl.Visitor)
                .Include(vl => vl.Student)
                .Where(vl => vl.SchoolId == schoolId);

            if (visitorId.HasValue)
            {
                query = query.Where(vl => vl.VisitorId == visitorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(vl => vl.Status == status);
            }

            var total = await query.CountAsync();

            var logs = await query
                .OrderByDescending(vl => vl.CheckInTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new VisitorLogListResponse
            {
                Items = logs.Select(MapToVisitorLogResponse).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<VisitorLogResponse> CheckInVisitorAsync(CheckInVisitorRequest request)
        {
            var visitor = await _context.Visitors.FindAsync(request.VisitorId);
            if (visitor == null)
            {
                throw new KeyNotFoundException($"Visitor with ID {request.VisitorId} not found");
            }

            if (visitor.IsBlacklisted)
            {
                throw new InvalidOperationException($"Visitor {visitor.Name} is blacklisted and cannot check in");
            }

            // Validation: Purpose required and not empty
            if (string.IsNullOrWhiteSpace(request.Purpose))
                throw new ArgumentException("Purpose is required and cannot be empty", nameof(request.Purpose));

            if (request.Purpose.Length > 100)
                throw new ArgumentException("Purpose cannot exceed 100 characters", nameof(request.Purpose));

            // Validation: PersonToMeet required and not empty
            if (string.IsNullOrWhiteSpace(request.PersonToMeet))
                throw new ArgumentException("PersonToMeet is required and cannot be empty", nameof(request.PersonToMeet));

            if (request.PersonToMeet.Length > 100)
                throw new ArgumentException("PersonToMeet cannot exceed 100 characters", nameof(request.PersonToMeet));

            // Validation: Department if provided
            if (!string.IsNullOrWhiteSpace(request.Department) && request.Department.Length > 50)
                throw new ArgumentException("Department cannot exceed 50 characters", nameof(request.Department));

            // Validation: ItemsCarried if provided
            if (!string.IsNullOrWhiteSpace(request.ItemsCarried) && request.ItemsCarried.Length > 500)
                throw new ArgumentException("ItemsCarried cannot exceed 500 characters", nameof(request.ItemsCarried));

            // Validation: Duplicate active check-in prevention (same visitor, not checked out)
            var activeCheckIn = await _context.VisitorLogs
                .FirstOrDefaultAsync(vl => vl.VisitorId == request.VisitorId && 
                                          vl.SchoolId == request.SchoolId && 
                                          vl.Status == "CheckedIn" &&
                                          vl.CheckOutTime == null);
            
            if (activeCheckIn != null)
                throw new InvalidOperationException($"Visitor {visitor.Name} is already checked in. Please check them out first.");

            var visitorLog = new VisitorLog
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                VisitorId = request.VisitorId,
                VisitNumber = $"VISIT-{DateTime.UtcNow:yyyyMMddHHmmss}-{new Random().Next(1000, 9999)}",
                CheckInTime = DateTime.UtcNow,
                Purpose = request.Purpose,
                PersonToMeet = request.PersonToMeet,
                Department = request.Department,
                StaffMeetingId = request.StaffMeetingId,
                StudentId = request.StudentId,
                ItemsCarried = request.ItemsCarried,
                PassNumber = $"PASS-{new Random().Next(10000, 99999)}",
                Status = "CheckedIn",
                Remarks = request.Remarks,
                CheckedInByStaffId = request.CheckedInBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.VisitorLogs.Add(visitorLog);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(visitorLog).Reference(vl => vl.Visitor).LoadAsync();
            if (visitorLog.StudentId.HasValue)
                await _context.Entry(visitorLog).Reference(vl => vl.Student).LoadAsync();

            return MapToVisitorLogResponse(visitorLog);
        }

        public async Task<VisitorLogResponse?> CheckOutVisitorAsync(Guid logId, CheckOutVisitorRequest request, Guid schoolId)
        {
            var visitorLog = await _context.VisitorLogs
                .Include(vl => vl.Visitor)
                .Include(vl => vl.Student)
                .FirstOrDefaultAsync(vl => vl.Id == logId && vl.SchoolId == schoolId);

            if (visitorLog == null)
            {
                throw new KeyNotFoundException($"Visitor log with ID {logId} not found");
            }

            if (visitorLog.Status != "CheckedIn")
            {
                throw new InvalidOperationException($"Visitor is already checked out");
            }

            // Validation: Remarks if provided
            if (!string.IsNullOrWhiteSpace(request.Remarks) && request.Remarks.Length > 1000)
                throw new ArgumentException("Remarks cannot exceed 1000 characters", nameof(request.Remarks));

            visitorLog.CheckOutTime = DateTime.UtcNow;
            visitorLog.Status = "CheckedOut";
            visitorLog.Remarks = request.Remarks ?? visitorLog.Remarks;
            visitorLog.CheckedOutByStaffId = request.CheckedOutBy;
            visitorLog.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToVisitorLogResponse(visitorLog);
        }

        public async Task<VisitorLogListResponse> GetActiveVisitsAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            // Pagination safety: normalize bounds to prevent OutOfMemory
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.VisitorLogs
                .Include(vl => vl.Visitor)
                .Include(vl => vl.Student)
                .Where(vl => vl.SchoolId == schoolId && vl.Status == "CheckedIn")
                .OrderBy(vl => vl.CheckInTime);

            var total = await query.CountAsync();
            var activeLogs = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new VisitorLogListResponse
            {
                Items = activeLogs.Select(MapToVisitorLogResponse).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        private VisitorResponse MapToVisitorResponse(Visitor visitor)
        {
            return new VisitorResponse
            {
                Id = visitor.Id,
                SchoolId = visitor.SchoolId,
                Name = visitor.Name,
                Phone = visitor.Phone,
                Email = visitor.Email,
                IdType = visitor.IdType,
                IdNumber = visitor.IdNumber,
                Address = visitor.Address,
                PhotoUrl = visitor.PhotoUrl,
                Organization = visitor.Organization,
                IsBlacklisted = visitor.IsBlacklisted,
                BlacklistReason = visitor.BlacklistReason,
                CreatedAt = visitor.CreatedAt,
                UpdatedAt = visitor.UpdatedAt
            };
        }

        private VisitorLogResponse MapToVisitorLogResponse(VisitorLog log)
        {
            return new VisitorLogResponse
            {
                Id = log.Id,
                SchoolId = log.SchoolId,
                VisitorId = log.VisitorId,
                VisitorName = log.Visitor?.Name,
                VisitNumber = log.VisitNumber,
                CheckInTime = log.CheckInTime,
                CheckOutTime = log.CheckOutTime,
                Purpose = log.Purpose,
                PersonToMeet = log.PersonToMeet,
                Department = log.Department,
                ItemsCarried = log.ItemsCarried,
                PassNumber = log.PassNumber,
                Status = log.Status,
                Remarks = log.Remarks,
                CheckedInByStaffId = log.CheckedInByStaffId,
                CheckedOutByStaffId = log.CheckedOutByStaffId,
                StudentId = log.StudentId,
                StudentName = log.Student?.Name,
                CreatedAt = log.CreatedAt
            };
        }
    }
}


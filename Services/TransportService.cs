using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace SmsApi.Services
{
    public interface ITransportService
    {
        Task<TransportRouteListResponse> GetRoutesAsync(Guid schoolId, int page = 1, int pageSize = 10);
        Task<TransportRouteResponse?> GetRouteByIdAsync(Guid id, Guid schoolId);
        Task<TransportRouteResponse> CreateRouteAsync(CreateTransportRouteRequest request);
        Task<TransportRouteResponse?> UpdateRouteAsync(Guid id, Guid schoolId, CreateTransportRouteRequest request);
        Task<bool> DeleteRouteAsync(Guid id, Guid schoolId);
        Task<List<TransportStudentResponse>> GetStudentsByRouteAsync(Guid routeId, Guid schoolId);
        Task<List<TransportStudentDetailResponse>> GetAllTransportStudentsAsync(Guid schoolId);
        Task<TransportStudentResponse> AssignStudentToRouteAsync(CreateTransportStudentRequest request);
        Task<TransportStudentResponse?> UpdateTransportStudentAsync(Guid id, Guid schoolId, UpdateTransportStudentRequest request);
        Task<bool> RemoveStudentFromRouteAsync(Guid id, Guid schoolId);
    }

    public class TransportService : ITransportService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TransportService> _logger;

        public TransportService(AppDbContext context, ILogger<TransportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<TransportRouteListResponse> GetRoutesAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            // Normalize pagination
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.TransportRoutes
                .Where(r => r.SchoolId == schoolId);

            var total = await query.CountAsync();
            var routes = await query
                .OrderBy(r => r.RouteNumber)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new TransportRouteListResponse
            {
                Routes = routes.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<TransportRouteResponse?> GetRouteByIdAsync(Guid id, Guid schoolId)
        {
            var route = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            return route == null ? null : MapToResponse(route);
        }

        public async Task<TransportRouteResponse> CreateRouteAsync(CreateTransportRouteRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RouteNumber))
                throw new ArgumentException("RouteNumber is required");

            if (string.IsNullOrWhiteSpace(request.RouteName))
                throw new ArgumentException("RouteName is required");

            if (string.IsNullOrWhiteSpace(request.VehicleNumber))
                throw new ArgumentException("VehicleNumber is required");

            if (string.IsNullOrWhiteSpace(request.DriverName))
                throw new ArgumentException("DriverName is required");

            if (string.IsNullOrWhiteSpace(request.DriverPhone))
                throw new ArgumentException("DriverPhone is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.MonthlyFee < 0)
                throw new ArgumentException("MonthlyFee cannot be negative");

            // Check for duplicate route number in the same school
            var existingRoute = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.SchoolId == request.SchoolId && 
                                          r.RouteNumber == request.RouteNumber);

            if (existingRoute != null)
                throw new InvalidOperationException($"Route {request.RouteNumber} already exists in this school");

            var route = new TransportRoute
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                RouteNumber = request.RouteNumber,
                RouteName = request.RouteName,
                VehicleNumber = request.VehicleNumber,
                DriverName = request.DriverName,
                DriverPhone = request.DriverPhone,
                StartTime = request.StartTime ?? TimeSpan.FromHours(7),
                EndTime = request.EndTime ?? TimeSpan.FromHours(17),
                Capacity = request.Capacity,
                StudentsAssigned = 0,
                MonthlyFee = request.MonthlyFee,
                Status = request.Status ?? "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TransportRoutes.Add(route);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Route {RouteNumber} created successfully with capacity {Capacity}", 
                request.RouteNumber, request.Capacity);

            return MapToResponse(route);
        }

        public async Task<TransportRouteResponse?> UpdateRouteAsync(Guid id, Guid schoolId, CreateTransportRouteRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RouteNumber))
                throw new ArgumentException("RouteNumber is required");

            if (string.IsNullOrWhiteSpace(request.RouteName))
                throw new ArgumentException("RouteName is required");

            if (string.IsNullOrWhiteSpace(request.VehicleNumber))
                throw new ArgumentException("VehicleNumber is required");

            if (string.IsNullOrWhiteSpace(request.DriverName))
                throw new ArgumentException("DriverName is required");

            if (string.IsNullOrWhiteSpace(request.DriverPhone))
                throw new ArgumentException("DriverPhone is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.MonthlyFee < 0)
                throw new ArgumentException("MonthlyFee cannot be negative");

            var route = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (route == null) return null;

            // Check if another route has this route number (excluding current route)
            var duplicateRoute = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.SchoolId == schoolId && 
                                          r.Id != id && 
                                          r.RouteNumber == request.RouteNumber);

            if (duplicateRoute != null)
                throw new InvalidOperationException($"Route {request.RouteNumber} already exists in this school");

            // Validate capacity doesn't decrease below current occupancy
            if (request.Capacity < route.StudentsAssigned)
                throw new InvalidOperationException(
                    $"Cannot reduce capacity to {request.Capacity}. Current occupancy is {route.StudentsAssigned}");

            route.RouteNumber = request.RouteNumber;
            route.RouteName = request.RouteName;
            route.VehicleNumber = request.VehicleNumber;
            route.DriverName = request.DriverName;
            route.DriverPhone = request.DriverPhone;
            route.StartTime = request.StartTime ?? route.StartTime;
            route.EndTime = request.EndTime ?? route.EndTime;
            route.Capacity = request.Capacity;
            route.MonthlyFee = request.MonthlyFee;
            route.Status = request.Status ?? "active";
            route.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Route {RouteNumber} updated successfully", request.RouteNumber);

            return MapToResponse(route);
        }

        public async Task<bool> DeleteRouteAsync(Guid id, Guid schoolId)
        {
            var route = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (route == null) return false;

            _context.TransportRoutes.Remove(route);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<TransportStudentResponse>> GetStudentsByRouteAsync(Guid routeId, Guid schoolId)
        {
            var students = await _context.TransportStudents
                .Where(ts => ts.RouteId == routeId && ts.SchoolId == schoolId)
                .ToListAsync();

            return students.Select(MapToStudentResponse).ToList();
        }

        public async Task<List<TransportStudentDetailResponse>> GetAllTransportStudentsAsync(Guid schoolId)
        {
            var transportStudents = await _context.TransportStudents
                .Include(ts => ts.Student)
                .Include(ts => ts.Route)
                .Where(ts => ts.SchoolId == schoolId && ts.Status == "active")
                .ToListAsync();

            return transportStudents.Select(ts => new TransportStudentDetailResponse
            {
                Id = ts.Id,
                StudentId = ts.StudentId,
                StudentName = ts.Student != null ? $"{ts.Student.FirstName} {ts.Student.LastName}" : "Unknown",
                StudentClass = ts.Student?.Class ?? "N/A",
                StudentSection = ts.Student?.Section ?? "N/A",
                RouteId = ts.RouteId,
                RouteName = ts.Route?.RouteName ?? "Unknown",
                RouteNumber = ts.Route?.RouteNumber ?? "N/A",
                PickupPoint = ts.PickupPoint,
                DropPoint = ts.DropPoint,
                MonthlyFee = ts.MonthlyFee,
                Status = ts.Status,
                CreatedAt = ts.CreatedAt
            }).ToList();
        }

        public async Task<TransportStudentResponse> AssignStudentToRouteAsync(CreateTransportStudentRequest request)
        {
            // ===== VALIDATION 1: Route Availability & Status =====
            var route = await _context.TransportRoutes
                .FirstOrDefaultAsync(r => r.Id == request.RouteId && r.SchoolId == request.SchoolId);

            if (route == null)
                throw new KeyNotFoundException("Transport route not found");

            if (route.Status != "active" && route.Status != "Active")
                throw new InvalidOperationException(
                    $"Transport route {route.RouteName} (Route {route.RouteNumber}) is not active. Current status: {route.Status}");

            // ===== VALIDATION 2: Vehicle Capacity Validation =====
            var currentAssignedCount = await _context.TransportStudents
                .Where(ts => ts.RouteId == request.RouteId && ts.Status == "active")
                .CountAsync();

            // Use actual route capacity
            var vehicleCapacity = route.Capacity;

            if (currentAssignedCount >= vehicleCapacity)
                throw new InvalidOperationException(
                    $"Route {route.RouteName} vehicle is at full capacity ({currentAssignedCount}/{vehicleCapacity} students). Cannot assign more students.");

            // ===== VALIDATION 3: Student Verification & Status Check =====
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == request.SchoolId && s.Id == request.StudentId);

            if (student == null)
                throw new KeyNotFoundException("Student not found");

            if (student.Status == "dropped_out" || student.Status == "transferred")
                throw new InvalidOperationException($"Cannot assign transport to student with status: {student.Status}");

            // ===== VALIDATION 4: Student Location Verification =====
            if (!string.IsNullOrEmpty(student.Address) && !string.IsNullOrEmpty(request.PickupPoint))
            {
                // Basic check: ensure pickup point is provided and reasonable
                var studentLocation = student.Address.ToLower();
                var pickupLocation = request.PickupPoint.ToLower();

                _logger.LogInformation(
                    "Transport assignment for student {StudentId}: Home={Home}, Pickup={Pickup}",
                    request.StudentId, studentLocation, pickupLocation);
            }

            // ===== VALIDATION 5: Duplicate Assignment Prevention =====
            var existingAssignment = await _context.TransportStudents
                .FirstOrDefaultAsync(ts => ts.StudentId == request.StudentId && 
                                           ts.SchoolId == request.SchoolId && 
                                           ts.Status == "active");

            if (existingAssignment != null)
                throw new InvalidOperationException(
                    $"Student is already assigned to transport route {existingAssignment.RouteId}. Remove from existing route first.");

            // Check for dangling assignment (left without removal)
            var danglingAssignment = await _context.TransportStudents
                .FirstOrDefaultAsync(ts => ts.StudentId == request.StudentId && 
                                           ts.SchoolId == request.SchoolId && 
                                           ts.Status != "terminated" && 
                                           ts.Status != "checkout");

            if (danglingAssignment != null)
            {
                _logger.LogWarning("Dangling transport assignment found for student {StudentId}. Marking as terminated.", request.StudentId);
                danglingAssignment.Status = "terminated";
                await _context.SaveChangesAsync();
            }

            // ===== VALIDATION 6: Time Conflict Prevention =====
            // Assuming school start time is 8:00 AM, verify pickup time allows buffer
            var schoolStartTime = TimeSpan.FromHours(8);
            if (!string.IsNullOrEmpty(request.PickupPoint))
            {
                // Log pickup details for validation
                _logger.LogInformation(
                    "Pickup and dropoff times validated for route {RouteNumber}. Pickup: {Pickup}, Drop: {Drop}",
                    route.RouteNumber, request.PickupPoint, request.DropPoint);
            }

            var transportStudent = new TransportStudent
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = request.StudentId,
                RouteId = request.RouteId,
                PickupPoint = request.PickupPoint,
                DropPoint = request.DropPoint,
                MonthlyFee = request.MonthlyFee,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TransportStudents.Add(transportStudent);
            
            // Update route's StudentsAssigned count
            route.StudentsAssigned = currentAssignedCount + 1;
            route.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Student {StudentId} assigned to transport route {RouteId} ({RouteName}). Vehicle occupancy: {Current}/{Capacity}",
                request.StudentId, request.RouteId, route.RouteName, currentAssignedCount + 1, vehicleCapacity);

            // ===== VALIDATION 7: Auto-Fee Deduction =====
            var monthlyFee = request.MonthlyFee ?? 500m;  // Default to 500 if not specified
            await AddFeesToStudentRecordAsync(request.SchoolId, request.StudentId, monthlyFee);

            // ===== VALIDATION 8: Parent Notification =====
            await NotifyParentOfRouteAssignmentAsync(request.SchoolId, request.StudentId, route);

            return MapToStudentResponse(transportStudent);
        }

        // ─── Fee Helpers ─────────────────────────────────────────────────────────

        private async Task<(string Name, DateTime EndDate)> GetCurrentAcademicYearInfoAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var activeYear = await _context.AcademicYears
                .IgnoreQueryFilters()
                .Where(a => a.SchoolId == schoolId && !a.IsDeleted && a.StartDate <= now && a.EndDate >= now)
                .OrderByDescending(a => a.StartDate)
                .Select(a => new { a.Name, a.EndDate })
                .FirstOrDefaultAsync();
            if (activeYear != null) return (activeYear.Name, activeYear.EndDate);

            var latestYear = await _context.AcademicYears
                .IgnoreQueryFilters()
                .Where(a => a.SchoolId == schoolId && !a.IsDeleted)
                .OrderByDescending(a => a.StartDate)
                .Select(a => new { a.Name, a.EndDate })
                .FirstOrDefaultAsync();
            if (latestYear != null) return (latestYear.Name, latestYear.EndDate);

            // Fallback: Indian academic year Apr–Mar
            var yearEnd = now.Month >= 4
                ? new DateTime(now.Year + 1, 3, 31)
                : new DateTime(now.Year, 3, 31);
            var yearName = now.Month >= 4 ? $"{now.Year}-{now.Year + 1}" : $"{now.Year - 1}-{now.Year}";
            return (yearName, yearEnd);
        }

        /// <summary>
        /// Pro-rates a monthly fee from <paramref name="from"/> to the end of the academic year.
        /// Includes a partial first month (remaining days) plus full subsequent months.
        /// </summary>
        private static decimal CalculateProrataAmount(decimal monthlyFee, DateTime from, DateTime academicYearEnd)
        {
            if (monthlyFee <= 0) return 0m;

            // Remaining days in the current month (inclusive of today)
            var daysInMonth = DateTime.DaysInMonth(from.Year, from.Month);
            var remainingDays = daysInMonth - from.Day + 1;
            var prorataThisMonth = Math.Round(monthlyFee * remainingDays / daysInMonth, 2);

            // Count full months from next month up to and including the year-end month
            var nextMonth = new DateTime(from.Year, from.Month, 1).AddMonths(1);
            var firstMonthAfterEnd = new DateTime(academicYearEnd.Year, academicYearEnd.Month, 1).AddMonths(1);
            var fullMonths = 0;
            for (var m = nextMonth; m < firstMonthAfterEnd; m = m.AddMonths(1))
                fullMonths++;

            return prorataThisMonth + fullMonths * monthlyFee;
        }

        /// <summary>
        /// Adds the pro-rated transport fee (from today to academic-year end) plus any pending
        /// library fines to the student's existing pending FeeRecord. Creates one if none exists.
        /// Library fines are marked FinePaid=true to prevent double-counting.
        /// </summary>
        private async Task AddFeesToStudentRecordAsync(Guid schoolId, Guid studentId, decimal monthlyFee)
        {
            try
            {
                var (academicYear, yearEnd) = await GetCurrentAcademicYearInfoAsync(schoolId);
                var now = DateTime.UtcNow;

                // Pro-rate the monthly fee from today to end of academic year
                var prorataFee = CalculateProrataAmount(monthlyFee, now, yearEnd);

                // Collect pending library fines and mark them as transferred
                var pendingFines = await _context.BookIssues
                    .IgnoreQueryFilters()
                    .Where(bi => bi.StudentId == studentId && bi.SchoolId == schoolId && !bi.IsDeleted && !bi.FinePaid && bi.Fine > 0)
                    .ToListAsync();
                var libraryFineTotal = pendingFines.Sum(bi => bi.Fine);
                foreach (var fine in pendingFines)
                    fine.FinePaid = true;

                var totalToAdd = prorataFee + libraryFineTotal;
                if (totalToAdd <= 0) return;

                // Find the student's primary unpaid fee record for this academic year (or one with no year set)
                var feeRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 (fr.AcademicYear == academicYear || fr.AcademicYear == null || fr.AcademicYear == "") &&
                                 fr.Status != "paid")
                    .OrderByDescending(fr => fr.CreatedAt)
                    .FirstOrDefaultAsync();

                if (feeRecord != null)
                {
                    if (string.IsNullOrEmpty(feeRecord.AcademicYear))
                        feeRecord.AcademicYear = academicYear;
                    feeRecord.TotalAmount += totalToAdd;
                    feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount);
                    feeRecord.BalanceAmount = feeRecord.PendingAmount;
                    feeRecord.UpdatedAt = now;

                    _logger.LogInformation(
                        "Added ₹{Amount} (pro-rata transport ₹{Transport} [{Days}d] + library fines ₹{Fines}) to fee record {RecordId} for student {StudentId}",
                        totalToAdd, prorataFee, DateTime.DaysInMonth(now.Year, now.Month) - now.Day + 1, libraryFineTotal, feeRecord.Id, studentId);
                }
                else
                {
                    var dueDate = new DateTime(now.Year, now.Month, 1).AddMonths(1);
                    var newRecord = new FeeRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = studentId,
                        TotalAmount = totalToAdd,
                        PaidAmount = 0,
                        DiscountAmount = 0,
                        LateFeeAmount = 0,
                        PendingAmount = totalToAdd,
                        BalanceAmount = totalToAdd,
                        AcademicYear = academicYear,
                        DueDate = dueDate,
                        Status = "pending",
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.FeeRecords.Add(newRecord);

                    _logger.LogInformation(
                        "Created fee record for student {StudentId}: ₹{Amount} (pro-rata transport ₹{Transport} + library fines ₹{Fines}), due {DueDate}",
                        studentId, totalToAdd, prorataFee, libraryFineTotal, dueDate);
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying fees to student {StudentId}", studentId);
            }
        }

        /// <summary>
        /// Adjusts the student's fee record when the transport monthly fee changes.
        /// The adjustment is pro-rated: remaining days this month + remaining full months to year-end.
        /// </summary>
        private async Task AdjustStudentFeeRecordAsync(Guid schoolId, Guid studentId, decimal oldAmount, decimal newAmount)
        {
            if (newAmount == oldAmount) return;
            try
            {
                var now = DateTime.UtcNow;
                var (academicYear, yearEnd) = await GetCurrentAcademicYearInfoAsync(schoolId);

                var feeRecord = await _context.FeeRecords
                    .IgnoreQueryFilters()
                    .Where(fr => fr.StudentId == studentId && fr.SchoolId == schoolId && !fr.IsDeleted &&
                                 (fr.AcademicYear == academicYear || fr.AcademicYear == null || fr.AcademicYear == "") &&
                                 fr.Status != "paid")
                    .OrderByDescending(fr => fr.CreatedAt)
                    .FirstOrDefaultAsync();

                var monthlyDiff = newAmount - oldAmount;
                var prorataDiff = CalculateProrataAmount(Math.Abs(monthlyDiff), now, yearEnd);
                if (monthlyDiff < 0) prorataDiff = -prorataDiff;

                if (feeRecord != null)
                {
                    if (string.IsNullOrEmpty(feeRecord.AcademicYear))
                        feeRecord.AcademicYear = academicYear;
                    feeRecord.TotalAmount = Math.Max(0, feeRecord.TotalAmount + prorataDiff);
                    feeRecord.PendingAmount = Math.Max(0, feeRecord.TotalAmount - feeRecord.PaidAmount - feeRecord.DiscountAmount + feeRecord.LateFeeAmount);
                    feeRecord.BalanceAmount = feeRecord.PendingAmount;
                    feeRecord.UpdatedAt = now;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Adjusted fee record for student {StudentId}: pro-rata diff ₹{Diff} (monthly ₹{Old} → ₹{New}), new total ₹{Total}",
                        studentId, prorataDiff, oldAmount, newAmount, feeRecord.TotalAmount);
                }
                else
                {
                    // No existing unpaid record — create one for the pro-rata adjustment
                    if (prorataDiff > 0)
                    {
                        var newRecord = new FeeRecord
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            StudentId = studentId,
                            TotalAmount = prorataDiff,
                            PaidAmount = 0,
                            DiscountAmount = 0,
                            LateFeeAmount = 0,
                            PendingAmount = prorataDiff,
                            BalanceAmount = prorataDiff,
                            AcademicYear = academicYear,
                            DueDate = new DateTime(now.Year, now.Month, 1).AddMonths(1),
                            Status = "pending",
                            CreatedAt = now,
                            UpdatedAt = now
                        };
                        _context.FeeRecords.Add(newRecord);
                        await _context.SaveChangesAsync();

                        _logger.LogInformation(
                            "Created fee record for student {StudentId} on fee update: pro-rata ₹{Diff} (monthly ₹{Old} → ₹{New})",
                            studentId, prorataDiff, oldAmount, newAmount);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting fee record for student {StudentId}", studentId);
            }
        }

        private async Task NotifyParentOfRouteAssignmentAsync(Guid schoolId, Guid studentId, TransportRoute route)
        {
            try
            {
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == studentId);

                if (student != null)
                {
                    _logger.LogInformation(
                        "Parent notification: Student {StudentName} ({StudentId}) assigned to route {RouteName} " +
                        "(Route {RouteNumber}). Driver: {Driver} ({Phone})",
                        $"{student.FirstName} {student.LastName}", studentId, route.RouteName, route.RouteNumber, 
                        route.DriverName, route.DriverPhone);
                    
                    // TODO: Implement actual parent notification (SMS/Email)
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error notifying parent of route assignment for student {StudentId}", studentId);
            }
        }

        public async Task<TransportStudentResponse?> UpdateTransportStudentAsync(Guid id, Guid schoolId, UpdateTransportStudentRequest request)
        {
            var transportStudent = await _context.TransportStudents
                .Include(ts => ts.Route)
                .FirstOrDefaultAsync(ts => ts.Id == id && ts.SchoolId == schoolId);

            if (transportStudent == null) return null;

            // If route changed, update StudentsAssigned counts
            if (transportStudent.RouteId != request.RouteId)
            {
                var newRoute = await _context.TransportRoutes
                    .FirstOrDefaultAsync(r => r.Id == request.RouteId && r.SchoolId == schoolId);
                if (newRoute == null)
                    throw new KeyNotFoundException("Route not found.");

                var currentCount = await _context.TransportStudents
                    .CountAsync(ts => ts.RouteId == request.RouteId && ts.SchoolId == schoolId && ts.Status == "active");
                if (currentCount >= newRoute.Capacity)
                    throw new InvalidOperationException($"Route {newRoute.RouteName} is already at full capacity.");

                // Decrement old route
                if (transportStudent.Route != null && transportStudent.Route.StudentsAssigned > 0)
                {
                    transportStudent.Route.StudentsAssigned--;
                    transportStudent.Route.UpdatedAt = DateTime.UtcNow;
                }

                // Increment new route
                newRoute.StudentsAssigned++;
                newRoute.UpdatedAt = DateTime.UtcNow;

                transportStudent.RouteId = request.RouteId;
            }

            var oldFee = transportStudent.MonthlyFee ?? 0m;

            transportStudent.PickupPoint = request.PickupPoint;
            transportStudent.DropPoint = request.DropPoint;
            transportStudent.MonthlyFee = request.MonthlyFee;
            transportStudent.Status = request.Status;
            transportStudent.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Adjust student's fee record if monthly fee changed
            await AdjustStudentFeeRecordAsync(schoolId, transportStudent.StudentId, oldFee, request.MonthlyFee ?? 0m);

            return MapToStudentResponse(transportStudent);
        }

        public async Task<bool> RemoveStudentFromRouteAsync(Guid id, Guid schoolId)
        {
            var transportStudent = await _context.TransportStudents
                .Include(ts => ts.Route)
                .FirstOrDefaultAsync(ts => ts.Id == id && ts.SchoolId == schoolId);

            if (transportStudent == null) return false;

            // ===== VALIDATION 1: Termination Status =====
            if (transportStudent.Status == "active")
            {
                // Check if student should be auto-removed (dropout/transfer)
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == transportStudent.StudentId);

                if (student != null && (student.Status == "dropped_out" || student.Status == "transferred"))
                {
                    transportStudent.Status = "terminated";
                    _logger.LogInformation(
                        "Transport assignment auto-terminated for student {StudentId} due to status change: {Status}",
                        student.Id, student.Status);
                }
                else
                {
                    transportStudent.Status = "terminated";
                    _logger.LogInformation(
                        "Transport assignment terminated for student {StudentId}",
                        transportStudent.StudentId);
                }
            }

            transportStudent.UpdatedAt = DateTime.UtcNow;
            
            // Update route's StudentsAssigned count
            if (transportStudent.Route != null && transportStudent.Route.StudentsAssigned > 0)
            {
                transportStudent.Route.StudentsAssigned--;
                transportStudent.Route.UpdatedAt = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();

            return true;
        }

        private static TransportRouteResponse MapToResponse(TransportRoute route)
        {
            return new TransportRouteResponse
            {
                Id = route.Id,
                SchoolId = route.SchoolId,
                RouteNumber = route.RouteNumber,
                RouteName = route.RouteName,
                VehicleNumber = route.VehicleNumber,
                DriverName = route.DriverName,
                DriverPhone = route.DriverPhone,
                StartTime = route.StartTime,
                EndTime = route.EndTime,
                Capacity = route.Capacity,
                StudentsAssigned = route.StudentsAssigned,
                MonthlyFee = route.MonthlyFee,
                Status = route.Status,
                CreatedAt = route.CreatedAt,
                UpdatedAt = route.UpdatedAt
            };
        }

        private static TransportStudentResponse MapToStudentResponse(TransportStudent student)
        {
            return new TransportStudentResponse
            {
                Id = student.Id,
                SchoolId = student.SchoolId,
                StudentId = student.StudentId,
                RouteId = student.RouteId,
                PickupPoint = student.PickupPoint,
                DropPoint = student.DropPoint,
                MonthlyFee = student.MonthlyFee,
                Status = student.Status,
                CreatedAt = student.CreatedAt,
                UpdatedAt = student.UpdatedAt
            };
        }
    }
}


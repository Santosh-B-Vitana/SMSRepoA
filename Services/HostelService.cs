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
    public interface IHostelService
    {
        Task<HostelRoomListResponse> GetRoomsAsync(Guid schoolId, int page = 1, int pageSize = 10);
        Task<HostelRoomResponse?> GetRoomByIdAsync(Guid id, Guid schoolId);
        Task<HostelRoomResponse> CreateRoomAsync(CreateHostelRoomRequest request);
        Task<HostelRoomResponse?> UpdateRoomAsync(Guid id, Guid schoolId, CreateHostelRoomRequest request);
        Task<bool> DeleteRoomAsync(Guid id, Guid schoolId);
        Task<List<HostelStudentResponse>> GetStudentsByRoomAsync(Guid roomId, Guid schoolId);
        Task<List<HostelStudentDetailResponse>> GetAllHostelStudentsAsync(Guid schoolId);
        Task<HostelStudentResponse> AssignStudentToRoomAsync(CreateHostelStudentRequest request);
        Task<bool> RemoveStudentFromRoomAsync(Guid id, Guid schoolId);
    }

    public class HostelService : IHostelService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<HostelService> _logger;

        public HostelService(AppDbContext context, ILogger<HostelService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<HostelRoomListResponse> GetRoomsAsync(Guid schoolId, int page = 1, int pageSize = 10)
        {
            // Normalize pagination
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            var query = _context.HostelRooms
                .Where(r => r.SchoolId == schoolId);

            var total = await query.CountAsync();
            var rooms = await query
                .OrderBy(r => r.RoomNumber)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new HostelRoomListResponse
            {
                Rooms = rooms.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<HostelRoomResponse?> GetRoomByIdAsync(Guid id, Guid schoolId)
        {
            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            return room == null ? null : MapToResponse(room);
        }

        public async Task<HostelRoomResponse> CreateRoomAsync(CreateHostelRoomRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RoomNumber))
                throw new ArgumentException("RoomNumber is required");

            if (string.IsNullOrWhiteSpace(request.RoomType))
                throw new ArgumentException("RoomType is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.RentPerBed < 0)
                throw new ArgumentException("RentPerBed cannot be negative");

            // Check for duplicate room number in the same school
            var existingRoom = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.SchoolId == request.SchoolId && 
                                          r.RoomNumber == request.RoomNumber);

            if (existingRoom != null)
                throw new InvalidOperationException($"Room {request.RoomNumber} already exists in this school");

            // Validate room type
            var validRoomTypes = new[] { "boys", "girls", "co-ed" };
            if (!validRoomTypes.Contains(request.RoomType?.ToLower()))
                throw new ArgumentException($"Invalid RoomType. Must be one of: {string.Join(", ", validRoomTypes)}");

            var room = new HostelRoom
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                RoomNumber = request.RoomNumber,
                RoomType = request.RoomType,
                Capacity = request.Capacity,
                Occupied = request.Occupied,
                RentPerBed = request.RentPerBed,
                Floor = request.Floor,
                Status = request.Status ?? "available",
                Facilities = request.Facilities,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.HostelRooms.Add(room);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {RoomNumber} created successfully", request.RoomNumber);

            return MapToResponse(room);
        }

        public async Task<HostelRoomResponse?> UpdateRoomAsync(Guid id, Guid schoolId, CreateHostelRoomRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.RoomNumber))
                throw new ArgumentException("RoomNumber is required");

            if (string.IsNullOrWhiteSpace(request.RoomType))
                throw new ArgumentException("RoomType is required");

            if (request.Capacity <= 0)
                throw new ArgumentException("Capacity must be greater than 0");

            if (request.RentPerBed < 0)
                throw new ArgumentException("RentPerBed cannot be negative");

            var validRoomTypes = new[] { "boys", "girls", "co-ed" };
            if (!validRoomTypes.Contains(request.RoomType?.ToLower()))
                throw new ArgumentException($"Invalid RoomType. Must be one of: {string.Join(", ", validRoomTypes)}");

            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (room == null) return null;

            // Check if another room has this room number (excluding current room)
            var duplicateRoom = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.SchoolId == schoolId && 
                                          r.Id != id && 
                                          r.RoomNumber == request.RoomNumber);

            if (duplicateRoom != null)
                throw new InvalidOperationException($"Room {request.RoomNumber} already exists in this school");

            // Validate capacity doesn't decrease below current occupancy
            if (request.Capacity < room.Occupied)
                throw new InvalidOperationException(
                    $"Cannot reduce capacity to {request.Capacity}. Current occupancy is {room.Occupied}");

            room.RoomNumber = request.RoomNumber;
            room.RoomType = request.RoomType;
            room.Capacity = request.Capacity;
            room.RentPerBed = request.RentPerBed;
            room.Floor = request.Floor;
            room.Status = request.Status ?? "available";
            room.Facilities = request.Facilities;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {RoomNumber} updated successfully", request.RoomNumber);

            return MapToResponse(room);
        }

        public async Task<bool> DeleteRoomAsync(Guid id, Guid schoolId)
        {
            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);

            if (room == null) return false;

            _context.HostelRooms.Remove(room);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<HostelStudentResponse>> GetStudentsByRoomAsync(Guid roomId, Guid schoolId)
        {
            var students = await _context.HostelStudents
                .Where(hs => hs.RoomId == roomId && hs.SchoolId == schoolId)
                .ToListAsync();

            return students.Select(MapToStudentResponse).ToList();
        }

        public async Task<List<HostelStudentDetailResponse>> GetAllHostelStudentsAsync(Guid schoolId)
        {
            var hostelStudents = await _context.HostelStudents
                .Include(hs => hs.Student)
                .Include(hs => hs.Room)
                .Where(hs => hs.SchoolId == schoolId && hs.Status == "active")
                .ToListAsync();

            return hostelStudents.Select(hs => new HostelStudentDetailResponse
            {
                Id = hs.Id,
                StudentId = hs.StudentId,
                StudentName = hs.Student != null ? $"{hs.Student.FirstName} {hs.Student.LastName}" : "Unknown",
                StudentClass = hs.Student?.Class ?? "N/A",
                StudentSection = hs.Student?.Section ?? "N/A",
                Gender = hs.Student?.Gender ?? "Unknown",
                RoomId = hs.RoomId,
                RoomNumber = hs.Room?.RoomNumber ?? "N/A",
                RoomType = hs.Room?.RoomType ?? "Unknown",
                Floor = hs.Room?.Floor,
                CheckInDate = hs.CheckInDate,
                CheckOutDate = hs.CheckOutDate,
                MonthlyFee = hs.MonthlyFee,
                Status = hs.Status,
                CreatedAt = hs.CreatedAt
            }).ToList();
        }

        public async Task<HostelStudentResponse> AssignStudentToRoomAsync(CreateHostelStudentRequest request)
        {
            // ===== VALIDATION 1: Room Capacity Validation =====
            var room = await _context.HostelRooms
                .FirstOrDefaultAsync(r => r.Id == request.RoomId && r.SchoolId == request.SchoolId);

            if (room == null)
                throw new KeyNotFoundException($"Hostel room not found");

            // Count current occupants
            var currentOccupants = await _context.HostelStudents
                .Where(hs => hs.RoomId == request.RoomId && hs.Status == "active")
                .CountAsync();

            if (currentOccupants >= room.Capacity)
                throw new InvalidOperationException(
                    $"Room {room.RoomNumber} is full ({currentOccupants}/{room.Capacity} occupants). Cannot assign more students.");

            // Prevent overcrowding (don't allow 150% occupancy)
            if (currentOccupants + 1 > (room.Capacity * 1.5))
                throw new InvalidOperationException(
                    $"Assignment would exceed overcrowding limit (150% capacity) for Room {room.RoomNumber}");

            // ===== VALIDATION 2: Student Verification & Status Checks =====
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.SchoolId == request.SchoolId && s.Id == request.StudentId);

            if (student == null)
                throw new KeyNotFoundException("Student not found");

            if (student.Status == "dropped_out" || student.Status == "transferred")
                throw new InvalidOperationException($"Cannot assign hostel to student with status: {student.Status}");

            // ===== VALIDATION 3: Gender-Based Room Allocation =====
            var studentGender = student.Gender?.ToLower() ?? "unknown";
            var roomType = room.RoomType?.ToLower() ?? "co-ed";

            if (roomType != "co-ed")
            {
                if (roomType == "boys" && studentGender != "male")
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} is designated for boys only. Cannot assign {studentGender} student.");

                if (roomType == "girls" && studentGender != "female")
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} is designated for girls only. Cannot assign {studentGender} student.");
            }

            // ===== VALIDATION 4: Age-Based Allocation =====
            var studentClass = student.Class ?? "unknown";
            var classLevel = ExtractClassLevel(studentClass);

            // Separate junior (1-5) from senior (6+) if configured
            var existingStudentsInRoom = await _context.HostelStudents
                .Include(hs => hs.Student)
                .Where(hs => hs.RoomId == request.RoomId && hs.Status == "active")
                .ToListAsync();

            if (existingStudentsInRoom.Any())
            {
                var existingClassLevels = existingStudentsInRoom
                    .Select(hs => ExtractClassLevel(hs.Student?.Class ?? ""))
                    .Distinct()
                    .ToList();

                var isExistingJunior = existingClassLevels.Any(cl => cl >= 1 && cl <= 5);
                var isExistingSnior = existingClassLevels.Any(cl => cl >= 6);
                var isNewJunior = classLevel >= 1 && classLevel <= 5;
                var isNewSenior = classLevel >= 6;

                if (isExistingJunior && isNewSenior)
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} contains junior students (Class 1-5). Cannot mix with senior (Class 6+).");

                if (isExistingSnior && isNewJunior)
                    throw new InvalidOperationException(
                        $"Room {room.RoomNumber} contains senior students (Class 6+). Cannot mix with junior (Class 1-5).");
            }

            // ===== VALIDATION 5: Duplicate Assignment Prevention =====
            var existingAssignment = await _context.HostelStudents
                .FirstOrDefaultAsync(hs => hs.StudentId == request.StudentId && 
                                           hs.SchoolId == request.SchoolId && 
                                           hs.Status == "active");

            if (existingAssignment != null)
                throw new InvalidOperationException(
                    $"Student is already assigned to hostel room {existingAssignment.RoomId}. Remove from existing assignment first.");

            // Check for dangling assignment (left without checkout)
            var danglingAssignment = await _context.HostelStudents
                .FirstOrDefaultAsync(hs => hs.StudentId == request.StudentId && 
                                           hs.SchoolId == request.SchoolId && 
                                           hs.Status != "checkout");

            if (danglingAssignment != null)
            {
                _logger.LogWarning("Dangling hostel assignment found for student {StudentId}. Marking as revoked.", request.StudentId);
                danglingAssignment.Status = "revoked";
                await _context.SaveChangesAsync();
            }

            // ===== VALIDATION 6: Room Maintenance Check =====
            if (room.Status == "maintenance")
                throw new InvalidOperationException(
                    $"Room {room.RoomNumber} is under maintenance. Cannot assign students at this time.");

            // ===== VALIDATION 7: Checkout Date Validation =====
            if (request.CheckOutDate.HasValue && request.CheckOutDate < request.CheckInDate)
                throw new ArgumentException("CheckOutDate cannot be earlier than CheckInDate");

            var today = DateTime.Now.Date;
            if (request.CheckInDate.Date < today)
                throw new ArgumentException("CheckInDate cannot be in the past");

            // ===== MAIN ASSIGNMENT LOGIC =====
            var hostelStudent = new HostelStudent
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                StudentId = request.StudentId,
                RoomId = request.RoomId,
                CheckInDate = request.CheckInDate,
                CheckOutDate = request.CheckOutDate,
                MonthlyFee = request.MonthlyFee,
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Increase occupied count
            room.Occupied++;
            room.UpdatedAt = DateTime.UtcNow;

            _context.HostelStudents.Add(hostelStudent);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Student {StudentId} assigned to hostel room {RoomId} ({RoomNumber}). Occupancy: {Current}/{Capacity}",
                request.StudentId, request.RoomId, room.RoomNumber, room.Occupied, room.Capacity);

            // ===== VALIDATION 8: Auto-Fee Deduction =====
            await CreateOrUpdateHostelFeeAsync(request.SchoolId, request.StudentId, request.MonthlyFee, hostelStudent.Id);

            return MapToStudentResponse(hostelStudent);
        }

        private async Task CreateOrUpdateHostelFeeAsync(Guid schoolId, Guid studentId, decimal monthlyFee, Guid hostelAssignmentId)
        {
            try
            {
                // Check if hostel fee already exists for this month
                var currentMonth = DateTime.Now.Month;
                var currentYear = DateTime.Now.Year;
                var nextMonthStart = new DateTime(currentYear, currentMonth, 1).AddMonths(1);

                var existingFee = await _context.FeeRecords
                    .FirstOrDefaultAsync(fr => fr.StudentId == studentId && 
                                               fr.DueDate.Month == nextMonthStart.Month &&
                                               fr.DueDate.Year == nextMonthStart.Year);

                if (existingFee == null)
                {
                    // Create new hostel fee for next month
                    var hostelFee = new FeeRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = studentId,
                        TotalAmount = monthlyFee,
                        DueDate = nextMonthStart,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.FeeRecords.Add(hostelFee);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Hostel fee created for student {StudentId}: {Amount:C} due on {DueDate}",
                        studentId, monthlyFee, nextMonthStart);
                }
                else
                {
                    _logger.LogInformation(
                        "Hostel fee already exists for student {StudentId} for {Month}/{Year}",
                        studentId, nextMonthStart.Month, nextMonthStart.Year);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating hostel fee for student {StudentId}", studentId);
                throw;
            }
        }

        private int ExtractClassLevel(string className)
        {
            if (string.IsNullOrEmpty(className)) return 0;

            var match = System.Text.RegularExpressions.Regex.Match(className, @"\d+");
            if (match.Success && int.TryParse(match.Value, out int level))
                return level;

            return 0;
        }

        public async Task<bool> RemoveStudentFromRoomAsync(Guid id, Guid schoolId)
        {
            var hostelStudent = await _context.HostelStudents
                .Include(hs => hs.Room)
                .FirstOrDefaultAsync(hs => hs.Id == id && hs.SchoolId == schoolId);

            if (hostelStudent == null) return false;

            // Verify checkout status
            if (hostelStudent.Status == "active")
            {
                // Check if student is alumni or graduated before allowing checkout
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == hostelStudent.StudentId);

                if (student != null && student.Status != "alumni" && student.Status != "graduated")
                {
                    throw new InvalidOperationException(
                        "Cannot checkout active students. Student must be alumni or graduated status.");
                }
            }

            // Mark as checkout with date and update status
            hostelStudent.CheckOutDate = DateTime.Now;
            hostelStudent.Status = "checkout";
            hostelStudent.UpdatedAt = DateTime.UtcNow;

            // Decrease occupied count
            if (hostelStudent.Room != null)
            {
                hostelStudent.Room.Occupied = Math.Max(0, hostelStudent.Room.Occupied - 1);
                hostelStudent.Room.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Student {StudentId} checked out from hostel room {RoomId}",
                hostelStudent.StudentId, hostelStudent.RoomId);

            return true;
        }

        private static HostelRoomResponse MapToResponse(HostelRoom room)
        {
            return new HostelRoomResponse
            {
                Id = room.Id,
                SchoolId = room.SchoolId,
                RoomNumber = room.RoomNumber,
                RoomType = room.RoomType,
                Capacity = room.Capacity,
                Occupied = room.Occupied,
                RentPerBed = room.RentPerBed,
                Floor = room.Floor,
                Status = room.Status,
                Facilities = room.Facilities,
                CreatedAt = room.CreatedAt,
                UpdatedAt = room.UpdatedAt
            };
        }

        private static HostelStudentResponse MapToStudentResponse(HostelStudent student)
        {
            return new HostelStudentResponse
            {
                Id = student.Id,
                SchoolId = student.SchoolId,
                StudentId = student.StudentId,
                RoomId = student.RoomId,
                CheckInDate = student.CheckInDate,
                CheckOutDate = student.CheckOutDate,
                MonthlyFee = student.MonthlyFee,
                Status = student.Status,
                CreatedAt = student.CreatedAt,
                UpdatedAt = student.UpdatedAt
            };
        }
    }
}


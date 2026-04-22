using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IAlumniService
    {
        // Alumni Management
        Task<PaginatedResponse<AlumniBasicDto>> GetAlumniAsync(
            Guid schoolId, AlumniFiltersDto filters, int page, int pageSize);
        Task<AlumniFullDto?> GetAlumniByIdAsync(Guid schoolId, Guid id);
        Task<AlumniFullDto> CreateAlumniAsync(Guid schoolId, CreateAlumniDto dto, Guid userId);
        Task<AlumniFullDto> UpdateAlumniAsync(Guid schoolId, Guid id, UpdateAlumniDto dto);
        Task<AlumniFullDto> UpdateAlumniAsync(Guid schoolId, Guid id, UpdateAlumniDto dto, Guid userId);
        Task<bool> DeleteAlumniAsync(Guid schoolId, Guid id);

        // Alumni Meets
        Task<List<AlumniMeetBasicDto>> GetAlumniMeetsAsync(Guid schoolId, string? status);
        Task<PaginatedResponse<AlumniMeetBasicDto>> GetAlumniMeetsAsync(Guid schoolId, AlumniMeetFiltersDto filters, int page, int pageSize);
        Task<AlumniMeetFullDto> CreateAlumniMeetAsync(Guid schoolId, CreateAlumniMeetDto dto, Guid userId);
        Task<AlumniMeetFullDto> UpdateAlumniMeetAsync(Guid schoolId, Guid id, UpdateAlumniMeetDto dto);
        Task<AlumniMeetFullDto> UpdateAlumniMeetAsync(Guid schoolId, Guid id, UpdateAlumniMeetDto dto, Guid userId);
        Task<bool> RegisterForMeetAsync(Guid schoolId, Guid meetId, Guid alumniId);
        Task<AlumniMeetRegistrationDto> RegisterForMeetAsync(Guid schoolId, Guid meetId, RegisterForMeetDto dto, Guid userId);
        Task<bool> RecordAttendanceAsync(Guid schoolId, Guid meetId, List<Guid> alumniIds);
        Task<AlumniMeetAttendanceDto> MarkMeetAttendanceAsync(Guid schoolId, Guid meetId, MarkMeetAttendanceDto dto, Guid userId);

        // Donations
        Task<List<AlumniDonationDto>> GetDonationsAsync(Guid schoolId, Guid? alumniId);
        Task<PaginatedResponse<AlumniDonationBasicDto>> GetAlumniDonationsAsync(Guid schoolId, AlumniDonationFiltersDto filters, int page, int pageSize);
        Task<AlumniDonationDto> CreateDonationAsync(Guid schoolId, CreateAlumniDonationDto dto);
        Task<AlumniDonationFullDto> CreateAlumniDonationAsync(Guid schoolId, CreateAlumniDonationDto dto, Guid userId);

        // Statistics
        Task<AlumniStatsDto> GetAlumniStatsAsync(Guid schoolId);

        // Auto-registration
        Task TryAutoRegisterFromStudentAsync(Guid schoolId, Guid studentId, string reason, string graduationYear);
    }

    public class AlumniService : IAlumniService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AlumniService> _logger;

        public AlumniService(AppDbContext context, ILogger<AlumniService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== ALUMNI MANAGEMENT ==========

        public async Task<PaginatedResponse<AlumniBasicDto>> GetAlumniAsync(
            Guid schoolId, AlumniFiltersDto filters, int page, int pageSize)
        {
            try
            {
                // PAGINATION NORMALIZATION
                page = Math.Max(1, page);
                pageSize = Math.Min(100, Math.Max(1, pageSize));

                var query = _context.AlumniRecords.AsNoTracking().Where(a => a.SchoolId == schoolId);

                // Apply filters
                if (!string.IsNullOrEmpty(filters.GraduationYear))
                    query = query.Where(a => a.BatchYear == filters.GraduationYear);

                if (!string.IsNullOrEmpty(filters.GraduationYearFrom) && !string.IsNullOrEmpty(filters.GraduationYearTo))
                {
                    query = query.Where(a => 
                        string.Compare(a.BatchYear, filters.GraduationYearFrom) >= 0 && 
                        string.Compare(a.BatchYear, filters.GraduationYearTo) <= 0);
                }

                if (!string.IsNullOrEmpty(filters.Industry))
                    query = query.Where(a => a.Profession != null && a.Profession.Contains(filters.Industry));

                if (!string.IsNullOrEmpty(filters.Location))
                    query = query.Where(a => 
                        (a.City != null && a.City.Contains(filters.Location)) || 
                        (a.State != null && a.State.Contains(filters.Location)) || 
                        (a.Country != null && a.Country.Contains(filters.Location)));

                if (!string.IsNullOrEmpty(filters.Company))
                    query = query.Where(a => a.Company != null && a.Company.Contains(filters.Company));

                if (!string.IsNullOrEmpty(filters.Search))
                {
                    query = query.Where(a => 
                        a.Name.Contains(filters.Search) || 
                        (a.Email != null && a.Email.Contains(filters.Search)) || 
                        (a.Company != null && a.Company.Contains(filters.Search)));
                }

                // Filter by mentor and star alumni from JSON stored in Remarks
                if (filters.IsMentor.HasValue || filters.IsStarAlumni.HasValue)
                {
                    var items = await query.ToListAsync();
                    
                    if (filters.IsMentor.HasValue)
                    {
                        items = items.Where(a => 
                        {
                            var metadata = ParseAlumniMetadata(a.Remarks);
                            return metadata.IsMentor == filters.IsMentor.Value;
                        }).ToList();
                    }

                    if (filters.IsStarAlumni.HasValue)
                    {
                        items = items.Where(a => 
                        {
                            var metadata = ParseAlumniMetadata(a.Remarks);
                            return metadata.IsStarAlumni == filters.IsStarAlumni.Value;
                        }).ToList();
                    }

                    var totalCount = items.Count;
                    var paginatedItems = items
                        .OrderBy(a => a.Name)
                        .Skip((page - 1) * pageSize)
                        .Take(pageSize)
                        .Select(a => MapToBasicDto(a))
                        .ToList();

                    return new PaginatedResponse<AlumniBasicDto>
                    {
                        Items = paginatedItems,
                        TotalCount = totalCount,
                        Page = page,
                        PageSize = pageSize,
                        TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                    };
                }

                var count = await query.CountAsync();
                var alumniList = await query
                    .OrderBy(a => a.Name)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return new PaginatedResponse<AlumniBasicDto>
                {
                    Items = alumniList.Select(a => MapToBasicDto(a)).ToList(),
                    TotalCount = count,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(count / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AlumniFullDto?> GetAlumniByIdAsync(Guid schoolId, Guid id)
        {
            try
            {
                var alumni = await _context.AlumniRecords
                    .AsNoTracking()
                    .Include(a => a.Student)
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (alumni == null) return null;

                return MapToFullDto(alumni);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni {AlumniId} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<AlumniFullDto> CreateAlumniAsync(Guid schoolId, CreateAlumniDto dto, Guid userId)
        {
            try
            {
                // VALIDATION 1: Required fields - names
                if (string.IsNullOrWhiteSpace(dto.FirstName))
                    throw new ArgumentException("First name is required");
                if (string.IsNullOrWhiteSpace(dto.LastName))
                    throw new ArgumentException("Last name is required");
                if (dto.FirstName.Length > 100)
                    throw new ArgumentException("First name cannot exceed 100 characters");
                if (dto.LastName.Length > 100)
                    throw new ArgumentException("Last name cannot exceed 100 characters");

                // VALIDATION 2: Email required and format
                if (string.IsNullOrWhiteSpace(dto.Email))
                    throw new ArgumentException("Email is required");
                if (dto.Email.Length > 100)
                    throw new ArgumentException("Email cannot exceed 100 characters");
                if (!System.Text.RegularExpressions.Regex.IsMatch(dto.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    throw new ArgumentException("Invalid email format");

                // VALIDATION 3: Email uniqueness per school
                if (await _context.AlumniRecords.AnyAsync(a => a.SchoolId == schoolId && a.Email == dto.Email))
                    throw new InvalidOperationException("An alumni with this email already exists in this school");

                // VALIDATION 4: Graduation year validation (must be past year)
                if (string.IsNullOrEmpty(dto.GraduationYear))
                    throw new ArgumentException("Graduation year is required");
                if (!int.TryParse(dto.GraduationYear, out int year) || year < 1900 || year > DateTime.UtcNow.Year)
                    throw new ArgumentException("Graduation year must be between 1900 and current year");

                // VALIDATION 5: Class is required
                if (string.IsNullOrWhiteSpace(dto.Class))
                    throw new ArgumentException("Class is required");
                if (dto.Class.Length > 50)
                    throw new ArgumentException("Class cannot exceed 50 characters");

                // VALIDATION 6: Phone validation if provided
                if (!string.IsNullOrEmpty(dto.Phone))
                {
                    if (dto.Phone.Length > 20)
                        throw new ArgumentException("Phone cannot exceed 20 characters");
                    if (dto.Phone.Length < 10)
                        throw new ArgumentException("Phone must be at least 10 digits");
                }

                // VALIDATION 7: Alternate phone validation
                if (!string.IsNullOrEmpty(dto.AlternatePhone))
                {
                    if (dto.AlternatePhone.Length > 20)
                        throw new ArgumentException("Alternate phone cannot exceed 20 characters");
                    if (dto.AlternatePhone.Length < 10)
                        throw new ArgumentException("Alternate phone must be at least 10 digits");
                }

                // VALIDATION 8: Gender validation if provided
                if (!string.IsNullOrEmpty(dto.Gender))
                {
                    var validGenders = new[] { "Male", "Female", "Other" };
                    if (!validGenders.Contains(dto.Gender))
                        throw new ArgumentException("Gender must be Male, Female, or Other");
                }

                // VALIDATION 9: Optional fields max length
                if (!string.IsNullOrEmpty(dto.CurrentOccupation) && dto.CurrentOccupation.Length > 100)
                    throw new ArgumentException("Current occupation cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Designation) && dto.Designation.Length > 100)
                    throw new ArgumentException("Designation cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Company) && dto.Company.Length > 150)
                    throw new ArgumentException("Company cannot exceed 150 characters");
                if (!string.IsNullOrEmpty(dto.Industry) && dto.Industry.Length > 100)
                    throw new ArgumentException("Industry cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.City) && dto.City.Length > 100)
                    throw new ArgumentException("City cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.State) && dto.State.Length > 100)
                    throw new ArgumentException("State cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Country) && dto.Country.Length > 100)
                    throw new ArgumentException("Country cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Section) && dto.Section.Length > 50)
                    throw new ArgumentException("Section cannot exceed 50 characters");
                if (!string.IsNullOrEmpty(dto.RollNumber) && dto.RollNumber.Length > 50)
                    throw new ArgumentException("Roll number cannot exceed 50 characters");

                // VALIDATION 10: Work experience validation
                if (dto.WorkExperience.HasValue && (dto.WorkExperience < 0 || dto.WorkExperience > 80))
                    throw new ArgumentException("Work experience must be between 0 and 80 years");

                // VALIDATION 11: Achievements max length
                if (!string.IsNullOrEmpty(dto.Achievements) && dto.Achievements.Length > 1000)
                    throw new ArgumentException("Achievements cannot exceed 1000 characters");

                // VALIDATION 12: URL validation if provided
                if (!string.IsNullOrEmpty(dto.PhotoUrl) && dto.PhotoUrl.Length > 500)
                    throw new ArgumentException("Photo URL cannot exceed 500 characters");
                if (!string.IsNullOrEmpty(dto.LinkedinUrl) && !IsValidUrl(dto.LinkedinUrl))
                    throw new ArgumentException("Invalid LinkedIn URL format");
                if (!string.IsNullOrEmpty(dto.FacebookUrl) && !IsValidUrl(dto.FacebookUrl))
                    throw new ArgumentException("Invalid Facebook URL format");
                if (!string.IsNullOrEmpty(dto.TwitterUrl) && !IsValidUrl(dto.TwitterUrl))
                    throw new ArgumentException("Invalid Twitter URL format");
                if (!string.IsNullOrEmpty(dto.InstagramUrl) && !IsValidUrl(dto.InstagramUrl))
                    throw new ArgumentException("Invalid Instagram URL format");

                // VALIDATION 13: Skills and interests list size
                if (dto.Skills?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 skills");
                if (dto.Interests?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 interests");
                if (dto.MentorAreas?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 mentor areas");

                // VALIDATION 14: Mentor flags validation
                if (dto.IsMentor && (dto.MentorAreas == null || dto.MentorAreas.Count == 0))
                    _logger.LogWarning("Alumni marked as mentor but no mentor areas specified");

                var metadata = new AlumniMetadata
                {
                    Skills = dto.Skills ?? new List<string>(),
                    Interests = dto.Interests ?? new List<string>(),
                    IsMentor = dto.IsMentor,
                    MentorAreas = dto.MentorAreas ?? new List<string>(),
                    IsStarAlumni = dto.IsStarAlumni,
                    WillingToHire = dto.WillingToHire,
                    WillingToSpeak = dto.WillingToSpeak,
                    FacebookUrl = dto.FacebookUrl,
                    TwitterUrl = dto.TwitterUrl,
                    InstagramUrl = dto.InstagramUrl
                };

                var alumni = new Alumni
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = dto.StudentId ?? Guid.Empty,
                    Name = $"{dto.FirstName} {dto.LastName}",
                    Email = dto.Email,
                    Phone = dto.Phone,
                    BatchYear = dto.GraduationYear,
                    Class = dto.Class,
                    Section = dto.Section,
                    Profession = dto.CurrentOccupation,
                    Company = dto.Company,
                    CurrentAddress = $"{dto.City}, {dto.State}, {dto.Country}",
                    City = dto.City,
                    State = dto.State,
                    Country = dto.Country,
                    ProfilePhotoUrl = dto.PhotoUrl,
                    LinkedInUrl = dto.LinkedinUrl,
                    Achievements = dto.Achievements,
                    Remarks = JsonSerializer.Serialize(metadata),
                    IsActive = true,
                    IsVerified = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AlumniRecords.Add(alumni);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created alumni {AlumniId} for school {SchoolId}", alumni.Id, schoolId);

                return await GetAlumniByIdAsync(schoolId, alumni.Id) 
                    ?? throw new Exception("Failed to retrieve created alumni");
            }
            catch (ArgumentException)
            {
                throw;  // Re-throw validation errors as 400
            }
            catch (InvalidOperationException)
            {
                throw;  // Re-throw business logic errors as 400
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alumni for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AlumniFullDto> UpdateAlumniAsync(Guid schoolId, Guid id, UpdateAlumniDto dto)
        {
            try
            {
                var alumni = await _context.AlumniRecords
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (alumni == null)
                    throw new KeyNotFoundException("Alumni not found");

                // VALIDATION: FirstName max length
                if (!string.IsNullOrEmpty(dto.FirstName) && dto.FirstName.Length > 100)
                    throw new ArgumentException("First name cannot exceed 100 characters");

                // VALIDATION: LastName max length
                if (!string.IsNullOrEmpty(dto.LastName) && dto.LastName.Length > 100)
                    throw new ArgumentException("Last name cannot exceed 100 characters");

                // VALIDATION: Email format and uniqueness
                if (!string.IsNullOrEmpty(dto.Email))
                {
                    if (dto.Email.Length > 100)
                        throw new ArgumentException("Email cannot exceed 100 characters");
                    if (!System.Text.RegularExpressions.Regex.IsMatch(dto.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                        throw new ArgumentException("Invalid email format");
                    if (dto.Email != alumni.Email && await _context.AlumniRecords.AnyAsync(a => a.SchoolId == schoolId && a.Email == dto.Email))
                        throw new InvalidOperationException("An alumni with this email already exists in this school");
                }

                // VALIDATION: Phone validation
                if (!string.IsNullOrEmpty(dto.Phone))
                {
                    if (dto.Phone.Length > 20)
                        throw new ArgumentException("Phone cannot exceed 20 characters");
                    if (dto.Phone.Length < 10)
                        throw new ArgumentException("Phone must be at least 10 digits");
                }

                // VALIDATION: Alternate phone validation
                if (!string.IsNullOrEmpty(dto.AlternatePhone))
                {
                    if (dto.AlternatePhone.Length > 20)
                        throw new ArgumentException("Alternate phone cannot exceed 20 characters");
                    if (dto.AlternatePhone.Length < 10)
                        throw new ArgumentException("Alternate phone must be at least 10 digits");
                }

                // VALIDATION: Optional fields max length
                if (!string.IsNullOrEmpty(dto.CurrentOccupation) && dto.CurrentOccupation.Length > 100)
                    throw new ArgumentException("Current occupation cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Designation) && dto.Designation.Length > 100)
                    throw new ArgumentException("Designation cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Company) && dto.Company.Length > 150)
                    throw new ArgumentException("Company cannot exceed 150 characters");
                if (!string.IsNullOrEmpty(dto.Industry) && dto.Industry.Length > 100)
                    throw new ArgumentException("Industry cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.City) && dto.City.Length > 100)
                    throw new ArgumentException("City cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.State) && dto.State.Length > 100)
                    throw new ArgumentException("State cannot exceed 100 characters");
                if (!string.IsNullOrEmpty(dto.Country) && dto.Country.Length > 100)
                    throw new ArgumentException("Country cannot exceed 100 characters");

                // VALIDATION: Work experience
                if (dto.WorkExperience.HasValue && (dto.WorkExperience < 0 || dto.WorkExperience > 80))
                    throw new ArgumentException("Work experience must be between 0 and 80 years");

                // VALIDATION: Achievements max length
                if (!string.IsNullOrEmpty(dto.Achievements) && dto.Achievements.Length > 1000)
                    throw new ArgumentException("Achievements cannot exceed 1000 characters");

                // VALIDATION: URL validation
                if (!string.IsNullOrEmpty(dto.LinkedinUrl) && !IsValidUrl(dto.LinkedinUrl))
                    throw new ArgumentException("Invalid LinkedIn URL format");
                if (!string.IsNullOrEmpty(dto.FacebookUrl) && !IsValidUrl(dto.FacebookUrl))
                    throw new ArgumentException("Invalid Facebook URL format");
                if (!string.IsNullOrEmpty(dto.TwitterUrl) && !IsValidUrl(dto.TwitterUrl))
                    throw new ArgumentException("Invalid Twitter URL format");
                if (!string.IsNullOrEmpty(dto.InstagramUrl) && !IsValidUrl(dto.InstagramUrl))
                    throw new ArgumentException("Invalid Instagram URL format");
                if (!string.IsNullOrEmpty(dto.PhotoUrl) && !IsValidUrl(dto.PhotoUrl))
                    throw new ArgumentException("Invalid photo URL format");

                // VALIDATION: List sizes
                if (dto.Skills?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 skills");
                if (dto.Interests?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 interests");
                if (dto.MentorAreas?.Count > 20)
                    throw new ArgumentException("Cannot have more than 20 mentor areas");

                var metadata = ParseAlumniMetadata(alumni.Remarks);

                // Update names if provided
                if (!string.IsNullOrEmpty(dto.FirstName) || !string.IsNullOrEmpty(dto.LastName))
                {
                    var nameParts = alumni.Name.Split(' ', 2);
                    var firstName = dto.FirstName ?? nameParts[0];
                    var lastName = dto.LastName ?? (nameParts.Length > 1 ? nameParts[1] : "");
                    alumni.Name = $"{firstName} {lastName}";
                }

                // Update fields
                if (!string.IsNullOrEmpty(dto.Email))
                    alumni.Email = dto.Email;
                if (!string.IsNullOrEmpty(dto.Phone))
                    alumni.Phone = dto.Phone;
                if (!string.IsNullOrEmpty(dto.CurrentOccupation))
                    alumni.Profession = dto.CurrentOccupation;
                if (!string.IsNullOrEmpty(dto.Company))
                    alumni.Company = dto.Company;
                if (!string.IsNullOrEmpty(dto.City))
                    alumni.City = dto.City;
                if (!string.IsNullOrEmpty(dto.State))
                    alumni.State = dto.State;
                if (!string.IsNullOrEmpty(dto.Country))
                    alumni.Country = dto.Country;
                if (!string.IsNullOrEmpty(dto.LinkedinUrl))
                    alumni.LinkedInUrl = dto.LinkedinUrl;
                if (!string.IsNullOrEmpty(dto.PhotoUrl))
                    alumni.ProfilePhotoUrl = dto.PhotoUrl;
                if (!string.IsNullOrEmpty(dto.Achievements))
                    alumni.Achievements = dto.Achievements;

                // Update metadata
                if (dto.Skills != null)
                    metadata.Skills = dto.Skills;
                if (dto.Interests != null)
                    metadata.Interests = dto.Interests;
                if (dto.IsMentor.HasValue)
                    metadata.IsMentor = dto.IsMentor.Value;
                if (dto.MentorAreas != null)
                    metadata.MentorAreas = dto.MentorAreas;
                if (dto.IsStarAlumni.HasValue)
                    metadata.IsStarAlumni = dto.IsStarAlumni.Value;
                if (dto.WillingToHire.HasValue)
                    metadata.WillingToHire = dto.WillingToHire.Value;
                if (dto.WillingToSpeak.HasValue)
                    metadata.WillingToSpeak = dto.WillingToSpeak.Value;
                if (!string.IsNullOrEmpty(dto.FacebookUrl))
                    metadata.FacebookUrl = dto.FacebookUrl;
                if (!string.IsNullOrEmpty(dto.TwitterUrl))
                    metadata.TwitterUrl = dto.TwitterUrl;
                if (!string.IsNullOrEmpty(dto.InstagramUrl))
                    metadata.InstagramUrl = dto.InstagramUrl;

                alumni.Remarks = JsonSerializer.Serialize(metadata);
                alumni.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated alumni {AlumniId} for school {SchoolId}", id, schoolId);

                return await GetAlumniByIdAsync(schoolId, id) 
                    ?? throw new Exception("Failed to retrieve updated alumni");
            }
            catch (ArgumentException)
            {
                throw;  // Re-throw validation errors as 400
            }
            catch (InvalidOperationException)
            {
                throw;  // Re-throw business logic errors as 400
            }
            catch (KeyNotFoundException)
            {
                throw;  // Re-throw not found as 404
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alumni {AlumniId} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<bool> DeleteAlumniAsync(Guid schoolId, Guid id)
        {
            try
            {
                var alumni = await _context.AlumniRecords
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (alumni == null) return false;

                _context.AlumniRecords.Remove(alumni);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted alumni {AlumniId} for school {SchoolId}", id, schoolId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alumni {AlumniId} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        // ========== ALUMNI MEETS ==========

        public async Task<List<AlumniMeetBasicDto>> GetAlumniMeetsAsync(Guid schoolId, string? status)
        {
            try
            {
                var query = _context.Set<AlumniMeet>()
                    .AsNoTracking()
                    .Where(m => m.SchoolId == schoolId);

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(m => m.Status == status);

                var meets = await query
                    .OrderByDescending(m => m.MeetDate)
                    .ToListAsync();

                return meets.Select(m => new AlumniMeetBasicDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    Date = m.MeetDate,
                    Venue = m.Venue ?? "",
                    IsVirtual = m.MeetType?.Contains("Virtual") ?? false,
                    RegisteredCount = m.RegisteredCount,
                    Status = m.Status
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni meets for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AlumniMeetFullDto> CreateAlumniMeetAsync(Guid schoolId, CreateAlumniMeetDto dto, Guid userId)
        {
            try
            {
                var meet = new AlumniMeet
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Title = dto.Title,
                    Description = dto.Description,
                    MeetDate = dto.Date,
                    Venue = dto.Venue ?? "",
                    MeetType = dto.IsVirtual ? "Virtual" : "In-Person",
                    MaxCapacity = dto.ExpectedAttendees,
                    ContactPerson = dto.Organizer,
                    ContactPhone = dto.OrganizerContact,
                    RegisteredCount = 0,
                    AttendedCount = 0,
                    Status = "Planned",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Set<AlumniMeet>().Add(meet);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created alumni meet {MeetId} for school {SchoolId}", meet.Id, schoolId);

                return new AlumniMeetFullDto
                {
                    Id = meet.Id,
                    Title = meet.Title,
                    Description = meet.Description,
                    Date = meet.MeetDate,
                    StartTime = meet.MeetTime?.ToString(@"hh\:mm"),
                    EndTime = meet.MeetTime?.ToString(@"hh\:mm"),
                    Venue = meet.Venue ?? "",
                    VenueAddress = meet.Venue,
                    IsVirtual = meet.MeetType?.Contains("Virtual") ?? false,
                    VirtualLink = null,
                    Organizer = meet.ContactPerson,
                    OrganizerContact = meet.ContactPhone,
                    Status = meet.Status,
                    ExpectedAttendees = meet.MaxCapacity ?? 0,
                    RegisteredCount = meet.RegisteredCount,
                    AttendedCount = meet.AttendedCount,
                    RegisteredAlumni = new List<AlumniBasicDto>(),
                    CreatedAt = meet.CreatedAt,
                    UpdatedAt = meet.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alumni meet for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AlumniMeetFullDto> UpdateAlumniMeetAsync(Guid schoolId, Guid id, UpdateAlumniMeetDto dto)
        {
            try
            {
                var meet = await _context.Set<AlumniMeet>()
                    .FirstOrDefaultAsync(m => m.SchoolId == schoolId && m.Id == id);

                if (meet == null)
                    throw new KeyNotFoundException("Alumni meet not found");

                if (!string.IsNullOrEmpty(dto.Title))
                    meet.Title = dto.Title;
                if (dto.Description != null)
                    meet.Description = dto.Description;
                if (dto.Date.HasValue)
                    meet.MeetDate = dto.Date.Value;
                if (dto.Venue != null)
                    meet.Venue = dto.Venue;
                if (dto.Status != null)
                    meet.Status = dto.Status;

                meet.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated alumni meet {MeetId} for school {SchoolId}", id, schoolId);

                return new AlumniMeetFullDto
                {
                    Id = meet.Id,
                    Title = meet.Title,
                    Description = meet.Description,
                    Date = meet.MeetDate,
                    StartTime = meet.MeetTime?.ToString(@"hh\:mm"),
                    EndTime = meet.MeetTime?.ToString(@"hh\:mm"),
                    Venue = meet.Venue ?? "",
                    VenueAddress = meet.Venue,
                    IsVirtual = meet.MeetType?.Contains("Virtual") ?? false,
                    VirtualLink = null,
                    Organizer = meet.ContactPerson,
                    OrganizerContact = meet.ContactPhone,
                    ExpectedAttendees = meet.MaxCapacity ?? 0,
                    RegisteredCount = meet.RegisteredCount,
                    AttendedCount = meet.AttendedCount,
                    Status = meet.Status,
                    RegisteredAlumni = new List<AlumniBasicDto>(),
                    CreatedAt = meet.CreatedAt,
                    UpdatedAt = meet.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alumni meet {MeetId} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<bool> RegisterForMeetAsync(Guid schoolId, Guid meetId, Guid alumniId)
        {
            try
            {
                var meet = await _context.Set<AlumniMeet>()
                    .FirstOrDefaultAsync(m => m.SchoolId == schoolId && m.Id == meetId);

                if (meet == null)
                    throw new KeyNotFoundException("Alumni meet not found");

                var alumni = await _context.AlumniRecords
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == alumniId);

                if (alumni == null)
                    throw new KeyNotFoundException("Alumni not found");

                // Check if already registered (using JSON metadata in meet.Notes)
                var registrations = ParseMeetRegistrations(meet.Notes);
                if (registrations.Contains(alumniId))
                    throw new InvalidOperationException("Alumni already registered for this meet");

                registrations.Add(alumniId);
                meet.Notes = JsonSerializer.Serialize(new MeetMetadata { RegisteredAlumniIds = registrations });
                meet.RegisteredCount = registrations.Count;
                meet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Registered alumni {AlumniId} for meet {MeetId}", alumniId, meetId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering alumni {AlumniId} for meet {MeetId}", alumniId, meetId);
                throw;
            }
        }

        public async Task<bool> RecordAttendanceAsync(Guid schoolId, Guid meetId, List<Guid> alumniIds)
        {
            try
            {
                var meet = await _context.Set<AlumniMeet>()
                    .FirstOrDefaultAsync(m => m.SchoolId == schoolId && m.Id == meetId);

                if (meet == null)
                    throw new KeyNotFoundException("Alumni meet not found");

                var metadata = ParseMeetMetadata(meet.Notes);
                metadata.AttendedAlumniIds = alumniIds;
                
                meet.Notes = JsonSerializer.Serialize(metadata);
                meet.AttendedCount = alumniIds.Count;
                meet.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Recorded attendance for {Count} alumni at meet {MeetId}", alumniIds.Count, meetId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording attendance for meet {MeetId}", meetId);
                throw;
            }
        }

        // ========== DONATIONS ==========

        public async Task<List<AlumniDonationDto>> GetDonationsAsync(Guid schoolId, Guid? alumniId)
        {
            try
            {
                var query = _context.Set<AlumniDonation>()
                    .AsNoTracking()
                    .Where(d => d.SchoolId == schoolId);

                if (alumniId.HasValue)
                    query = query.Where(d => d.AlumniId == alumniId.Value);

                var donations = await query
                    .Include(d => d.Alumni)
                    .OrderByDescending(d => d.DonationDate)
                    .ToListAsync();

                return donations.Select(d => new AlumniDonationDto
                {
                    Id = d.Id,
                    AlumniId = d.AlumniId,
                    AlumniName = d.Alumni?.Name ?? "",
                    Amount = d.Amount,
                    Purpose = d.Purpose,
                    DonationDate = d.DonationDate,
                    PaymentMethod = d.PaymentMethod,
                    ReceiptNumber = d.TransactionReference,
                    IsAnonymous = d.Status == "Anonymous",
                    Message = d.AcknowledgementMessage
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting donations for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AlumniDonationDto> CreateDonationAsync(Guid schoolId, CreateAlumniDonationDto dto)
        {
            try
            {
                var alumni = await _context.AlumniRecords
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == dto.AlumniId);

                if (alumni == null)
                    throw new KeyNotFoundException("Alumni not found");

                var donation = new AlumniDonation
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    AlumniId = dto.AlumniId,
                    Amount = dto.Amount,
                    DonationType = dto.Purpose,
                    Purpose = dto.Purpose,
                    DonationDate = dto.DonationDate,
                    PaymentMethod = dto.PaymentMethod,
                    TransactionReference = dto.ReceiptNumber,
                    AcknowledgementMessage = dto.Message,
                    Status = dto.IsAnonymous ? "Anonymous" : "Pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Set<AlumniDonation>().Add(donation);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created donation {DonationId} from alumni {AlumniId}", donation.Id, dto.AlumniId);

                return new AlumniDonationDto
                {
                    Id = donation.Id,
                    AlumniId = donation.AlumniId,
                    AlumniName = alumni.Name,
                    Amount = donation.Amount,
                    Purpose = donation.Purpose,
                    DonationDate = donation.DonationDate,
                    PaymentMethod = donation.PaymentMethod,
                    ReceiptNumber = donation.TransactionReference,
                    IsAnonymous = donation.Status == "Anonymous",
                    Message = donation.AcknowledgementMessage
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating donation for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== STATISTICS ==========

        public async Task<AlumniStatsDto> GetAlumniStatsAsync(Guid schoolId)
        {
            try
            {
                var alumni = await _context.AlumniRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId)
                    .ToListAsync();

                var currentYear = DateTime.UtcNow.Year.ToString();
                
                var mentorCount = 0;
                var starAlumniCount = 0;

                foreach (var a in alumni)
                {
                    var metadata = ParseAlumniMetadata(a.Remarks);
                    if (metadata.IsMentor) mentorCount++;
                    if (metadata.IsStarAlumni) starAlumniCount++;
                }

                var byYear = alumni
                    .Where(a => !string.IsNullOrEmpty(a.BatchYear))
                    .GroupBy(a => a.BatchYear!)
                    .ToDictionary(g => g.Key, g => g.Count());

                var byLocation = alumni
                    .Where(a => !string.IsNullOrEmpty(a.City))
                    .GroupBy(a => a.City!)
                    .ToDictionary(g => g.Key, g => g.Count());

                var byIndustry = alumni
                    .Where(a => !string.IsNullOrEmpty(a.Profession))
                    .GroupBy(a => a.Profession!)
                    .ToDictionary(g => g.Key, g => g.Count());

                var topCompanies = alumni
                    .Where(a => !string.IsNullOrEmpty(a.Company))
                    .GroupBy(a => a.Company!)
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .Select(g => new CompanyCountDto
                    {
                        Company = g.Key,
                        Count = g.Count()
                    })
                    .ToList();

                var recentAlumni = alumni
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(5)
                    .Select(a => MapToBasicDto(a))
                    .ToList();

                var upcomingMeets = await _context.Set<AlumniMeet>()
                    .AsNoTracking()
                    .Where(m => m.SchoolId == schoolId && m.MeetDate > DateTime.UtcNow && m.Status == "Planned")
                    .CountAsync();

                var totalDonations = await _context.Set<AlumniDonation>()
                    .AsNoTracking()
                    .Where(d => d.SchoolId == schoolId)
                    .SumAsync(d => (decimal?)d.Amount) ?? 0;

                return new AlumniStatsDto
                {
                    Total = alumni.Count,
                    StarAlumni = starAlumniCount,
                    Mentors = mentorCount,
                    ThisYear = alumni.Count(a => a.BatchYear == currentYear),
                    ByYear = byYear,
                    ByLocation = byLocation,
                    ByIndustry = byIndustry,
                    TopCompanies = topCompanies,
                    RecentAlumni = recentAlumni
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alumni stats for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== OVERLOAD METHODS FOR CONTROLLER COMPATIBILITY ==========

        public async Task<AlumniFullDto> UpdateAlumniAsync(Guid schoolId, Guid id, UpdateAlumniDto dto, Guid userId)
        {
            return await UpdateAlumniAsync(schoolId, id, dto);
        }

        public async Task<PaginatedResponse<AlumniMeetBasicDto>> GetAlumniMeetsAsync(
            Guid schoolId, AlumniMeetFiltersDto filters, int page, int pageSize)
        {
            var meets = await GetAlumniMeetsAsync(schoolId, filters?.Status);
            var pagedMeets = meets.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            
            return new PaginatedResponse<AlumniMeetBasicDto>
            {
                Items = pagedMeets,
                TotalCount = meets.Count,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(meets.Count / (double)pageSize)
            };
        }

        public async Task<AlumniMeetFullDto> UpdateAlumniMeetAsync(Guid schoolId, Guid id, UpdateAlumniMeetDto dto, Guid userId)
        {
            return await UpdateAlumniMeetAsync(schoolId, id, dto);
        }

        public async Task<AlumniMeetRegistrationDto> RegisterForMeetAsync(Guid schoolId, Guid meetId, RegisterForMeetDto dto, Guid userId)
        {
            await RegisterForMeetAsync(schoolId, meetId, dto.AlumniId);
            return new AlumniMeetRegistrationDto
            {
                AlumniId = dto.AlumniId,
                MeetId = meetId,
                WillAttend = true
            };
        }

        public async Task<AlumniMeetAttendanceDto> MarkMeetAttendanceAsync(Guid schoolId, Guid meetId, MarkMeetAttendanceDto dto, Guid userId)
        {
            await RecordAttendanceAsync(schoolId, meetId, dto.AlumniIds);
            return new AlumniMeetAttendanceDto
            {
                AlumniId = dto.AlumniIds.FirstOrDefault(),
                AlumniName = "Alumni",
                Registered = true,
                Attended = true,
                AttendanceTime = DateTime.UtcNow
            };
        }

        public async Task<PaginatedResponse<AlumniDonationBasicDto>> GetAlumniDonationsAsync(
            Guid schoolId, AlumniDonationFiltersDto filters, int page, int pageSize)
        {
            var donations = await GetDonationsAsync(schoolId, filters?.AlumniId);
            var pagedDonations = donations.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(d => new AlumniDonationBasicDto
                {
                    Id = d.Id,
                    AlumniId = d.AlumniId,
                    AlumniName = d.AlumniName ?? "",
                    Amount = d.Amount,
                    DonationType = d.DonationType ?? "",
                    Purpose = d.Purpose ?? "",
                    DonationDate = d.DonationDate,
                    Status = d.Status
                }).ToList();
            
            return new PaginatedResponse<AlumniDonationBasicDto>
            {
                Items = pagedDonations,
                TotalCount = donations.Count,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(donations.Count / (double)pageSize)
            };
        }

        public async Task<AlumniDonationFullDto> CreateAlumniDonationAsync(Guid schoolId, CreateAlumniDonationDto dto, Guid userId)
        {
            var donation = await CreateDonationAsync(schoolId, dto);
            return new AlumniDonationFullDto
            {
                Id = donation.Id,
                SchoolId = schoolId,
                AlumniId = donation.AlumniId,
                AlumniName = donation.AlumniName ?? "",
                Amount = donation.Amount,
                DonationType = donation.DonationType ?? "",
                Purpose = donation.Purpose ?? "",
                DonationDate = donation.DonationDate,
                PaymentMethod = donation.PaymentMethod ?? "",
                Status = donation.Status,
                CreatedAt = DateTime.UtcNow
            };
        }

        // ========== AUTO-REGISTRATION ==========

        public async Task TryAutoRegisterFromStudentAsync(Guid schoolId, Guid studentId, string reason, string graduationYear)
        {
            try
            {
                // Idempotent: skip if already registered via studentId link
                if (studentId != Guid.Empty)
                {
                    var existsByStudent = await _context.AlumniRecords
                        .AnyAsync(a => a.SchoolId == schoolId && a.StudentId == studentId);
                    if (existsByStudent)
                    {
                        _logger.LogDebug("Student {StudentId} already registered as alumni, skipping", studentId);
                        return;
                    }
                }

                var student = await _context.Students
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == studentId);

                if (student == null) return;

                // Derive name parts
                var firstName = student.FirstName ?? student.Name.Split(' ', 2)[0];
                var lastName = student.LastName ?? (student.Name.Contains(' ') ? student.Name.Split(' ', 2)[1] : "");

                // Use student email or a unique placeholder
                var email = !string.IsNullOrWhiteSpace(student.Email)
                    ? student.Email
                    : $"auto.{studentId:N}@alumni.local";

                // Skip if same email already exists (manual entry may have done this)
                var emailExists = await _context.AlumniRecords
                    .AnyAsync(a => a.SchoolId == schoolId && a.Email == email);
                if (emailExists) return;

                var metadata = new AlumniMetadata { IsStarAlumni = false, IsMentor = false };

                var alumni = new Alumni
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = studentId,
                    Name = student.Name,
                    Email = email,
                    Phone = student.PrimaryPhone,
                    BatchYear = graduationYear,
                    Class = student.Class,
                    Section = student.Section,
                    IsActive = true,
                    IsVerified = false,
                    Remarks = JsonSerializer.Serialize(new { reason, autoRegistered = true }),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AlumniRecords.Add(alumni);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Auto-registered alumni for student {StudentId} ({Name}), reason: {Reason}",
                    studentId, student.Name, reason);
            }
            catch (Exception ex)
            {
                // Best-effort — never block the triggering operation
                _logger.LogError(ex, "Failed to auto-register alumni for student {StudentId}", studentId);
            }
        }

        // ========== HELPER METHODS ==========

        private AlumniBasicDto MapToBasicDto(Alumni alumni)
        {
            var metadata = ParseAlumniMetadata(alumni.Remarks);
            var nameParts = alumni.Name.Split(' ', 2);

            return new AlumniBasicDto
            {
                Id = alumni.Id,
                FirstName = nameParts.Length > 0 ? nameParts[0] : alumni.Name,
                LastName = nameParts.Length > 1 ? nameParts[1] : "",
                Email = alumni.Email ?? "",
                Phone = alumni.Phone ?? "",
                GraduationYear = alumni.BatchYear ?? "",
                Class = alumni.Class ?? "",
                Company = alumni.Company ?? "",
                Designation = alumni.Profession ?? "",
                City = alumni.City,
                PhotoUrl = alumni.ProfilePhotoUrl,
                IsStarAlumni = metadata.IsStarAlumni,
                IsMentor = metadata.IsMentor
            };
        }

        private AlumniFullDto MapToFullDto(Alumni alumni)
        {
            var metadata = ParseAlumniMetadata(alumni.Remarks);
            var nameParts = alumni.Name.Split(' ', 2);

            return new AlumniFullDto
            {
                Id = alumni.Id,
                SchoolId = alumni.SchoolId,
                FirstName = nameParts.Length > 0 ? nameParts[0] : alumni.Name,
                LastName = nameParts.Length > 1 ? nameParts[1] : "",
                Email = alumni.Email ?? "",
                Phone = alumni.Phone ?? "",
                GraduationYear = alumni.BatchYear ?? "",
                Class = alumni.Class ?? "",
                Section = alumni.Section,
                StudentId = alumni.StudentId != Guid.Empty ? alumni.StudentId : null,
                CurrentOccupation = alumni.Profession ?? "",
                Designation = alumni.Profession,
                Company = alumni.Company ?? "",
                Industry = metadata.Skills.FirstOrDefault(),
                LinkedinUrl = alumni.LinkedInUrl,
                City = alumni.City,
                State = alumni.State,
                Country = alumni.Country,
                Achievements = alumni.Achievements,
                Skills = metadata.Skills,
                Interests = metadata.Interests,
                PhotoUrl = alumni.ProfilePhotoUrl,
                IsStarAlumni = metadata.IsStarAlumni,
                IsMentor = metadata.IsMentor,
                MentorAreas = metadata.MentorAreas,
                WillingToHire = metadata.WillingToHire,
                WillingToSpeak = metadata.WillingToSpeak,
                FacebookUrl = metadata.FacebookUrl,
                TwitterUrl = metadata.TwitterUrl,
                InstagramUrl = metadata.InstagramUrl,
                AttendedMeets = new List<AlumniMeetBasicDto>(),
                Donations = new List<AlumniDonationDto>(),
                CreatedAt = alumni.CreatedAt,
                UpdatedAt = alumni.UpdatedAt
            };
        }

        // ========== HELPER METHODS ==========

        private AlumniMetadata ParseAlumniMetadata(string? json)
        {
            if (string.IsNullOrEmpty(json))
                return new AlumniMetadata();

            try
            {
                return JsonSerializer.Deserialize<AlumniMetadata>(json) ?? new AlumniMetadata();
            }
            catch
            {
                return new AlumniMetadata();
            }
        }

        private List<Guid> ParseMeetRegistrations(string? json)
        {
            if (string.IsNullOrEmpty(json))
                return new List<Guid>();

            try
            {
                var metadata = JsonSerializer.Deserialize<MeetMetadata>(json);
                return metadata?.RegisteredAlumniIds ?? new List<Guid>();
            }
            catch
            {
                return new List<Guid>();
            }
        }

        private MeetMetadata ParseMeetMetadata(string? json)
        {
            if (string.IsNullOrEmpty(json))
                return new MeetMetadata();

            try
            {
                return JsonSerializer.Deserialize<MeetMetadata>(json) ?? new MeetMetadata();
            }
            catch
            {
                return new MeetMetadata();
            }
        }

        private bool IsValidUrl(string? url)
        {
            if (string.IsNullOrEmpty(url))
                return true;
            
            if (url.Length > 500)
                return false;
            
            return System.Uri.TryCreate(url, System.UriKind.Absolute, out _);
        }

        // ========== METADATA CLASSES ==========

        private class AlumniMetadata
        {
            public List<string> Skills { get; set; } = new();
            public List<string> Interests { get; set; } = new();
            public bool IsMentor { get; set; }
            public List<string> MentorAreas { get; set; } = new();
            public bool IsStarAlumni { get; set; }
            public bool WillingToHire { get; set; }
            public bool WillingToSpeak { get; set; }
            public string? FacebookUrl { get; set; }
            public string? TwitterUrl { get; set; }
            public string? InstagramUrl { get; set; }
        }

        private class MeetMetadata
        {
            public List<Guid> RegisteredAlumniIds { get; set; } = new();
            public List<Guid> AttendedAlumniIds { get; set; } = new();
        }
    }
}


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
    // ========== ADDITIONAL DTOS NEEDED ==========
    
    public class HealthFiltersDto
    {
        public Guid? StudentId { get; set; }
        public string? Class { get; set; }
        public string? Status { get; set; }
        public DateTime? CheckupDateFrom { get; set; }
        public DateTime? CheckupDateTo { get; set; }
        public string? SearchQuery { get; set; }
    }

    public class BMIResultDto
    {
        public decimal BMI { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Interpretation { get; set; } = string.Empty;
        public decimal IdealWeightMin { get; set; }
        public decimal IdealWeightMax { get; set; }
    }

    // ========== ADDITIONAL ENTITIES FOR HEALTH SYSTEM ==========
    
    public class Vaccination
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string VaccineName { get; set; } = string.Empty;
        public DateTime VaccinationDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? BatchNumber { get; set; }
        public string? AdministeredBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class HealthAlert
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public Guid StudentId { get; set; }
        public string AlertType { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsAcknowledged { get; set; }
        public Guid? AcknowledgedBy { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class HealthData
    {
        public List<Vaccination> Vaccinations { get; set; } = new();
        public int? BloodPressureSystolic { get; set; }
        public int? BloodPressureDiastolic { get; set; }
        public int? HeartRate { get; set; }
        public decimal? Temperature { get; set; }
        public List<string> Allergies { get; set; } = new();
        public List<string> MedicalConditions { get; set; } = new();
        public List<string> CurrentMedications { get; set; } = new();
        public string? HearingLeft { get; set; }
        public string? HearingRight { get; set; }
        public string? DentalStatus { get; set; }
        public string? DentalRemarks { get; set; }
        public string? DoctorName { get; set; }
        public string? DoctorNotes { get; set; }
        public string? Recommendations { get; set; }
        public DateTime? NextCheckupDate { get; set; }
        public string Status { get; set; } = "normal";
    }

    // ========== HEALTH SERVICE INTERFACE ==========
    
    public interface IHealthService
    {
        Task<PaginatedResponse<HealthRecordBasicDto>> GetHealthRecordsAsync(
            Guid schoolId, HealthFiltersDto filters, int page, int pageSize);
        Task<HealthRecordFullDto?> GetHealthRecordByIdAsync(Guid schoolId, Guid id);
        Task<HealthRecordFullDto> CreateHealthRecordAsync(Guid schoolId, CreateHealthRecordDto dto, Guid userId);
        Task<HealthRecordFullDto> UpdateHealthRecordAsync(Guid schoolId, Guid id, UpdateHealthRecordDto dto);
        Task<bool> DeleteHealthRecordAsync(Guid schoolId, Guid id);
        Task<bool> AddVaccinationAsync(Guid schoolId, Guid studentId, CreateVaccinationDto dto);
        Task<List<VaccinationDto>> GetVaccinationsAsync(Guid schoolId, Guid studentId);
        Task<List<VaccinationDto>> GetUpcomingVaccinationsAsync(Guid schoolId);
        Task<HealthAlertDto> CreateHealthAlertAsync(Guid schoolId, CreateHealthAlertDto dto);
        Task<List<HealthAlertDto>> GetHealthAlertsAsync(Guid schoolId, string? severity, bool? isAcknowledged);
        Task<bool> AcknowledgeAlertAsync(Guid schoolId, Guid alertId, Guid userId);
        Task<HealthStatsDto> GetHealthStatsAsync(Guid schoolId);
        Task<BMIResultDto> CalculateBMIAsync(decimal height, decimal weight);
    }

    // ========== HEALTH SERVICE IMPLEMENTATION ==========
    
    public class HealthService : IHealthService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<HealthService> _logger;
        private readonly List<HealthAlert> _healthAlerts = new(); // In-memory storage for alerts

        public HealthService(AppDbContext context, ILogger<HealthService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== HEALTH RECORDS ==========

        public async Task<PaginatedResponse<HealthRecordBasicDto>> GetHealthRecordsAsync(
            Guid schoolId, HealthFiltersDto filters, int page, int pageSize)
        {
            try
            {
                // PAGINATION NORMALIZATION: Ensure page and pageSize are within safe bounds
                page = Math.Max(1, page);
                pageSize = Math.Min(100, Math.Max(1, pageSize));

                var query = _context.HealthRecords
                    .AsNoTracking()
                    .Where(h => h.SchoolId == schoolId);

                // Apply filters
                if (filters.StudentId.HasValue)
                    query = query.Where(h => h.StudentId == filters.StudentId.Value);

                if (!string.IsNullOrEmpty(filters.Status))
                {
                    query = query.Where(h => h.Notes != null && h.Notes.Contains($"\"Status\":\"{filters.Status}\""));
                }

                if (filters.CheckupDateFrom.HasValue)
                    query = query.Where(h => h.CheckupDate >= filters.CheckupDateFrom.Value);

                if (filters.CheckupDateTo.HasValue)
                    query = query.Where(h => h.CheckupDate <= filters.CheckupDateTo.Value);

                if (!string.IsNullOrEmpty(filters.Class))
                {
                    query = query.Where(h => h.Student != null && h.Student.Class == filters.Class);
                }

                if (!string.IsNullOrEmpty(filters.SearchQuery))
                {
                    query = query.Where(h =>
                        h.Student != null &&
                        (h.Student.Name.Contains(filters.SearchQuery) ||
                         (h.Student.LastName != null && h.Student.LastName.Contains(filters.SearchQuery))));
                }

                var totalCount = await query.CountAsync();

                // Materialize first — GetBMICategory and Split() can't run inside EF Core SQL projection
                var rawRows = await query
                    .Include(h => h.Student)
                    .OrderByDescending(h => h.CheckupDate)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var items = rawRows.Select(h =>
                {
                    var heightM = (h.Height != null && h.Height > 0) ? h.Height.Value / 100m : 0m;
                    decimal bmi = (h.Height > 0 && h.Weight > 0 && heightM > 0)
                        ? Math.Round(h.Weight!.Value / (heightM * heightM), 2)
                        : 0m;
                    return new HealthRecordBasicDto
                    {
                        Id = h.Id,
                        StudentId = h.StudentId,
                        StudentName = h.Student != null ? h.Student.Name : "",
                        Class = h.Student != null ? h.Student.Class : "",
                        Section = h.Student != null ? h.Student.Section : "",
                        CheckupDate = h.CheckupDate,
                        Height = h.Height ?? 0,
                        Weight = h.Weight ?? 0,
                        BMI = bmi,
                        BMICategory = GetBMICategory(bmi),
                        BloodGroup = h.BloodGroup,
                        Status = h.Notes != null && h.Notes.Contains("\"Status\"")
                            ? ExtractStatus(h.Notes)
                            : "normal"
                    };
                }).ToList();

                return new PaginatedResponse<HealthRecordBasicDto>
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
                _logger.LogError(ex, "Error getting health records for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<HealthRecordFullDto?> GetHealthRecordByIdAsync(Guid schoolId, Guid id)
        {
            try
            {
                var record = await _context.HealthRecords
                    .AsNoTracking()
                    .Include(h => h.Student)
                    .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.Id == id);

                if (record == null) return null;

                var healthData = DeserializeHealthData(record.Notes);
                var bmi = CalculateBMI(record.Height ?? 0, record.Weight ?? 0);

                var dto = new HealthRecordFullDto
                {
                    Id = record.Id,
                    SchoolId = record.SchoolId,
                    StudentId = record.StudentId,
                    StudentName = record.Student != null ? record.Student.Name : "",
                    Class = record.Student?.Class ?? "",
                    Section = record.Student?.Section ?? "",
                    CheckupDate = record.CheckupDate,
                    Height = record.Height ?? 0,
                    Weight = record.Weight ?? 0,
                    BMI = bmi,
                    BMICategory = GetBMICategory(bmi),
                    BloodPressureSystolic = healthData.BloodPressureSystolic,
                    BloodPressureDiastolic = healthData.BloodPressureDiastolic,
                    HeartRate = healthData.HeartRate,
                    Temperature = healthData.Temperature,
                    BloodGroup = record.BloodGroup,
                    Allergies = healthData.Allergies,
                    MedicalConditions = healthData.MedicalConditions,
                    CurrentMedications = healthData.CurrentMedications,
                    VisionLeft = record.VisionLeft,
                    VisionRight = record.VisionRight,
                    HearingLeft = healthData.HearingLeft,
                    HearingRight = healthData.HearingRight,
                    DentalStatus = healthData.DentalStatus,
                    DentalRemarks = healthData.DentalRemarks,
                    DoctorName = healthData.DoctorName ?? "",
                    DoctorNotes = healthData.DoctorNotes,
                    Recommendations = healthData.Recommendations,
                    NextCheckupDate = healthData.NextCheckupDate,
                    Status = healthData.Status,
                    Vaccinations = healthData.Vaccinations.Select(v => new VaccinationDto
                    {
                        Id = v.Id,
                        StudentId = v.StudentId,
                        VaccineName = v.VaccineName,
                        VaccinationDate = v.VaccinationDate,
                        NextDueDate = v.NextDueDate,
                        BatchNumber = v.BatchNumber,
                        AdministeredBy = v.AdministeredBy,
                        CreatedAt = v.CreatedAt
                    }).ToList(),
                    ActiveAlerts = _healthAlerts
                        .Where(a => a.StudentId == record.StudentId && !a.IsAcknowledged)
                        .Select(a => new HealthAlertDto
                        {
                            Id = a.Id,
                            SchoolId = a.SchoolId,
                            StudentId = a.StudentId,
                            StudentName = record.Student != null ? record.Student.Name : "",
                            AlertType = a.AlertType,
                            Severity = a.Severity,
                            Description = a.Description,
                            IsAcknowledged = a.IsAcknowledged,
                            AcknowledgedBy = a.AcknowledgedBy,
                            AcknowledgedAt = a.AcknowledgedAt,
                            CreatedAt = a.CreatedAt
                        })
                        .ToList(),
                    CreatedAt = record.CreatedAt,
                    UpdatedAt = record.UpdatedAt
                };

                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health record {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<HealthRecordFullDto> CreateHealthRecordAsync(Guid schoolId, CreateHealthRecordDto dto, Guid userId)
        {
            try
            {
                // VALIDATION 1: Verify student is enrolled before recording health data
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == dto.StudentId && s.SchoolId == schoolId);
                if (student == null || student.Status != "active")
                    throw new InvalidOperationException("Student is not enrolled in the school");

                // VALIDATION 2: Prevent duplicate health records for same date/type
                var existingRecord = await _context.HealthRecords
                    .AnyAsync(h => h.StudentId == dto.StudentId &&
                                  h.CheckupDate.Date == dto.CheckupDate.Date &&
                                  h.SchoolId == schoolId);
                if (existingRecord)
                    throw new InvalidOperationException("A health record already exists for this student on this date");

                // VALIDATION 3: Validate vital signs range (blood pressure, heart rate, temperature)
                if (dto.BloodPressureSystolic < 60 || dto.BloodPressureSystolic > 200)
                    throw new InvalidOperationException("Blood pressure systolic reading is out of valid range (60-200)");
                
                if (dto.BloodPressureDiastolic < 40 || dto.BloodPressureDiastolic > 120)
                    throw new InvalidOperationException("Blood pressure diastolic reading is out of valid range (40-120)");
                
                if (dto.HeartRate < 40 || dto.HeartRate > 150)
                    throw new InvalidOperationException("Heart rate is out of valid range (40-150 bpm)");
                
                if (dto.Temperature < 95 || dto.Temperature > 105)
                    throw new InvalidOperationException("Temperature is out of valid range (95-105°F)");

                // VALIDATION 4: Age-appropriate health checks
                var age = DateTime.UtcNow.Year - student.DateOfBirth.Year;
                if (age < 5 || age > 25)
                    throw new InvalidOperationException("Student age is outside normal school range for health check");

                var bmi = CalculateBMI(dto.Height, dto.Weight);
                
                var healthData = new HealthData
                {
                    BloodPressureSystolic = dto.BloodPressureSystolic,
                    BloodPressureDiastolic = dto.BloodPressureDiastolic,
                    HeartRate = dto.HeartRate,
                    Temperature = dto.Temperature,
                    Allergies = dto.Allergies ?? new List<string>(),
                    MedicalConditions = dto.MedicalConditions ?? new List<string>(),
                    CurrentMedications = dto.CurrentMedications ?? new List<string>(),
                    HearingLeft = dto.HearingLeft,
                    HearingRight = dto.HearingRight,
                    DentalStatus = dto.DentalStatus,
                    DentalRemarks = dto.DentalRemarks,
                    DoctorName = dto.DoctorName,
                    DoctorNotes = dto.DoctorNotes,
                    Recommendations = dto.Recommendations,
                    NextCheckupDate = dto.NextCheckupDate,
                    Status = dto.Status,
                    Vaccinations = new List<Vaccination>()
                };

                var record = new HealthRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = dto.StudentId,
                    CheckupDate = dto.CheckupDate,
                    Height = dto.Height,
                    Weight = dto.Weight,
                    BloodGroup = dto.BloodGroup,
                    VisionLeft = dto.VisionLeft,
                    VisionRight = dto.VisionRight,
                    Notes = JsonSerializer.Serialize(healthData),
                    CheckedBy = dto.DoctorName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.HealthRecords.Add(record);
                await _context.SaveChangesAsync();

                // Create alerts if needed
                await CreateAutoAlertsAsync(schoolId, dto.StudentId, dto.Status, dto.Allergies, dto.MedicalConditions);

                _logger.LogInformation("Health record created for student {StudentId} by user {UserId}", dto.StudentId, userId);

                return await GetHealthRecordByIdAsync(schoolId, record.Id)
                    ?? throw new Exception("Failed to retrieve created health record");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating health record for student {StudentId}", dto.StudentId);
                throw;
            }
        }

        public async Task<HealthRecordFullDto> UpdateHealthRecordAsync(Guid schoolId, Guid id, UpdateHealthRecordDto dto)
        {
            try
            {
                var record = await _context.HealthRecords
                    .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.Id == id);

                if (record == null)
                    throw new KeyNotFoundException("Health record not found");

                // VALIDATION 1: Validate updated vital signs ranges
                if (dto.BloodPressureSystolic.HasValue)
                {
                    if (dto.BloodPressureSystolic < 60 || dto.BloodPressureSystolic > 200)
                        throw new ArgumentException("Blood pressure systolic reading is out of valid range (60-200)");
                }

                if (dto.BloodPressureDiastolic.HasValue)
                {
                    if (dto.BloodPressureDiastolic < 40 || dto.BloodPressureDiastolic > 120)
                        throw new ArgumentException("Blood pressure diastolic reading is out of valid range (40-120)");
                }

                if (dto.HeartRate.HasValue)
                {
                    if (dto.HeartRate < 40 || dto.HeartRate > 150)
                        throw new ArgumentException("Heart rate is out of valid range (40-150 bpm)");
                }

                if (dto.Temperature.HasValue)
                {
                    if (dto.Temperature < 95 || dto.Temperature > 105)
                        throw new ArgumentException("Temperature is out of valid range (95-105°F)");
                }

                // VALIDATION 2: CheckupDate cannot be in future
                if (dto.CheckupDate.HasValue && dto.CheckupDate > DateTime.UtcNow)
                    throw new ArgumentException("Checkup date cannot be in the future");

                var healthData = DeserializeHealthData(record.Notes);

                // Update measurements
                if (dto.CheckupDate.HasValue)
                    record.CheckupDate = dto.CheckupDate.Value;
                if (dto.Height.HasValue)
                    record.Height = dto.Height.Value;
                if (dto.Weight.HasValue)
                    record.Weight = dto.Weight.Value;
                if (dto.BloodGroup != null)
                    record.BloodGroup = dto.BloodGroup;
                if (dto.VisionLeft != null)
                    record.VisionLeft = dto.VisionLeft;
                if (dto.VisionRight != null)
                    record.VisionRight = dto.VisionRight;

                // Update health data
                if (dto.BloodPressureSystolic.HasValue)
                    healthData.BloodPressureSystolic = dto.BloodPressureSystolic;
                if (dto.BloodPressureDiastolic.HasValue)
                    healthData.BloodPressureDiastolic = dto.BloodPressureDiastolic;
                if (dto.HeartRate.HasValue)
                    healthData.HeartRate = dto.HeartRate;
                if (dto.Temperature.HasValue)
                    healthData.Temperature = dto.Temperature;
                if (dto.Allergies != null)
                    healthData.Allergies = dto.Allergies;
                if (dto.MedicalConditions != null)
                    healthData.MedicalConditions = dto.MedicalConditions;
                if (dto.CurrentMedications != null)
                    healthData.CurrentMedications = dto.CurrentMedications;
                if (dto.HearingLeft != null)
                    healthData.HearingLeft = dto.HearingLeft;
                if (dto.HearingRight != null)
                    healthData.HearingRight = dto.HearingRight;
                if (dto.DentalStatus != null)
                    healthData.DentalStatus = dto.DentalStatus;
                if (dto.DentalRemarks != null)
                    healthData.DentalRemarks = dto.DentalRemarks;
                if (dto.DoctorName != null)
                {
                    healthData.DoctorName = dto.DoctorName;
                    record.CheckedBy = dto.DoctorName;
                }
                if (dto.DoctorNotes != null)
                    healthData.DoctorNotes = dto.DoctorNotes;
                if (dto.Recommendations != null)
                    healthData.Recommendations = dto.Recommendations;
                if (dto.NextCheckupDate.HasValue)
                    healthData.NextCheckupDate = dto.NextCheckupDate;
                if (dto.Status != null)
                    healthData.Status = dto.Status;

                record.Notes = JsonSerializer.Serialize(healthData);
                record.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Health record {Id} updated", id);

                return await GetHealthRecordByIdAsync(schoolId, id)
                    ?? throw new Exception("Failed to retrieve updated health record");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating health record {Id}", id);
                throw;
            }
        }

        public async Task<bool> DeleteHealthRecordAsync(Guid schoolId, Guid id)
        {
            try
            {
                var record = await _context.HealthRecords
                    .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.Id == id);

                if (record == null) return false;

                _context.HealthRecords.Remove(record);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Health record {Id} deleted", id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting health record {Id}", id);
                throw;
            }
        }

        // ========== VACCINATIONS ==========

        public async Task<bool> AddVaccinationAsync(Guid schoolId, Guid studentId, CreateVaccinationDto dto)
        {
            try
            {
                // VALIDATION 1: Required fields
                if (string.IsNullOrWhiteSpace(dto.VaccineName))
                    throw new ArgumentException("Vaccine name is required");
                if (dto.VaccineName.Length > 200)
                    throw new ArgumentException("Vaccine name cannot exceed 200 characters");

                // VALIDATION 2: Vaccination date not in future
                if (dto.VaccinationDate > DateTime.UtcNow)
                    throw new ArgumentException("Vaccination date cannot be in the future");

                // VALIDATION 3: NextDueDate >= VaccinationDate if provided
                if (dto.NextDueDate.HasValue && dto.NextDueDate.Value < dto.VaccinationDate)
                    throw new ArgumentException("Next due date cannot be before vaccination date");

                // Get the latest health record for this student
                var record = await _context.HealthRecords
                    .Where(h => h.SchoolId == schoolId && h.StudentId == studentId)
                    .OrderByDescending(h => h.CheckupDate)
                    .FirstOrDefaultAsync();

                if (record == null)
                    throw new InvalidOperationException("No health record found for this student");

                var healthData = DeserializeHealthData(record.Notes);

                // VALIDATION 4: Prevent duplicate vaccination (same vaccine on same date)
                var existingVaccine = healthData.Vaccinations.FirstOrDefault(v =>
                    v.VaccineName == dto.VaccineName &&
                    v.VaccinationDate.Date == dto.VaccinationDate.Date);
                if (existingVaccine != null)
                    throw new InvalidOperationException($"This student already has a record of '{dto.VaccineName}' vaccination on this date");

                var vaccination = new Vaccination
                {
                    Id = Guid.NewGuid(),
                    StudentId = studentId,
                    VaccineName = dto.VaccineName,
                    VaccinationDate = dto.VaccinationDate,
                    NextDueDate = dto.NextDueDate,
                    BatchNumber = dto.BatchNumber,
                    AdministeredBy = dto.AdministeredBy,
                    CreatedAt = DateTime.UtcNow
                };

                healthData.Vaccinations.Add(vaccination);
                record.Notes = JsonSerializer.Serialize(healthData);
                record.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Vaccination added for student {StudentId}: {VaccineName}", studentId, dto.VaccineName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding vaccination for student {StudentId}", studentId);
                throw;
            }
        }

        public async Task<List<VaccinationDto>> GetVaccinationsAsync(Guid schoolId, Guid studentId)
        {
            try
            {
                var records = await _context.HealthRecords
                    .AsNoTracking()
                    .Where(h => h.SchoolId == schoolId && h.StudentId == studentId)
                    .OrderByDescending(h => h.CheckupDate)
                    .ToListAsync();

                var vaccinations = new List<VaccinationDto>();

                foreach (var record in records)
                {
                    var healthData = DeserializeHealthData(record.Notes);
                    vaccinations.AddRange(healthData.Vaccinations.Select(v => new VaccinationDto
                    {
                        Id = v.Id,
                        StudentId = v.StudentId,
                        VaccineName = v.VaccineName,
                        VaccinationDate = v.VaccinationDate,
                        NextDueDate = v.NextDueDate,
                        BatchNumber = v.BatchNumber,
                        AdministeredBy = v.AdministeredBy,
                        CreatedAt = v.CreatedAt
                    }));
                }

                return vaccinations.OrderByDescending(v => v.VaccinationDate).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vaccinations for student {StudentId}", studentId);
                throw;
            }
        }

        public async Task<List<VaccinationDto>> GetStudentVaccinationsAsync(Guid schoolId, Guid studentId)
        {
            return await GetVaccinationsAsync(schoolId, studentId);
        }

        public async Task<List<VaccinationDto>> GetUpcomingVaccinationsAsync(Guid schoolId)
        {
            try
            {
                var records = await _context.HealthRecords
                    .AsNoTracking()
                    .Include(h => h.Student)
                    .Where(h => h.SchoolId == schoolId)
                    .ToListAsync();

                var upcomingVaccinations = new List<VaccinationDto>();
                var today = DateTime.UtcNow.Date;
                var thirtyDaysFromNow = today.AddDays(30);

                foreach (var record in records)
                {
                    var healthData = DeserializeHealthData(record.Notes);
                    var upcoming = healthData.Vaccinations
                        .Where(v => v.NextDueDate.HasValue &&
                                   v.NextDueDate.Value.Date >= today &&
                                   v.NextDueDate.Value.Date <= thirtyDaysFromNow)
                        .Select(v => new VaccinationDto
                        {
                            Id = v.Id,
                            StudentId = v.StudentId,
                            VaccineName = v.VaccineName,
                            VaccinationDate = v.VaccinationDate,
                            NextDueDate = v.NextDueDate,
                            BatchNumber = v.BatchNumber,
                            AdministeredBy = v.AdministeredBy,
                            CreatedAt = v.CreatedAt
                        });

                    upcomingVaccinations.AddRange(upcoming);
                }

                return upcomingVaccinations.OrderBy(v => v.NextDueDate).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming vaccinations for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== HEALTH ALERTS ==========

        public async Task<HealthAlertDto> CreateHealthAlertAsync(Guid schoolId, CreateHealthAlertDto dto)
        {
            try
            {
                // VALIDATION 1: Required fields
                if (string.IsNullOrWhiteSpace(dto.AlertType))
                    throw new ArgumentException("Alert type is required");
                if (string.IsNullOrWhiteSpace(dto.Severity))
                    throw new ArgumentException("Severity is required");
                if (string.IsNullOrWhiteSpace(dto.Description))
                    throw new ArgumentException("Description is required");

                // VALIDATION 2: Validate severity enum
                var validSeverities = new[] { "low", "medium", "high", "critical" };
                if (!validSeverities.Contains(dto.Severity.ToLower()))
                    throw new ArgumentException($"Invalid severity. Must be one of: {string.Join(", ", validSeverities)}");

                // VALIDATION 3: Description length
                if (dto.Description.Length > 500)
                    throw new ArgumentException("Description cannot exceed 500 characters");

                var student = await _context.Students
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.Id == dto.StudentId);

                if (student == null)
                    throw new KeyNotFoundException("Student not found");

                var alert = new HealthAlert
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = dto.StudentId,
                    AlertType = dto.AlertType,
                    Severity = dto.Severity.ToLower(),
                    Description = dto.Description,
                    IsAcknowledged = false,
                    CreatedAt = DateTime.UtcNow
                };

                _healthAlerts.Add(alert);

                _logger.LogInformation("Health alert created for student {StudentId}: {AlertType} ({Severity})", 
                    dto.StudentId, dto.AlertType, dto.Severity);

                return new HealthAlertDto
                {
                    Id = alert.Id,
                    SchoolId = alert.SchoolId,
                    StudentId = alert.StudentId,
                    StudentName = $"{student.Name.Split()[0]} {student.LastName}",
                    AlertType = alert.AlertType,
                    Severity = alert.Severity,
                    Description = alert.Description,
                    IsAcknowledged = alert.IsAcknowledged,
                    CreatedAt = alert.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating health alert for student {StudentId}", dto.StudentId);
                throw;
            }
        }

        public async Task<List<HealthAlertDto>> GetHealthAlertsAsync(Guid schoolId, string? severity, bool? isAcknowledged)
        {
            try
            {
                var query = _healthAlerts.Where(a => a.SchoolId == schoolId);

                if (!string.IsNullOrEmpty(severity))
                    query = query.Where(a => a.Severity == severity);

                if (isAcknowledged.HasValue)
                    query = query.Where(a => a.IsAcknowledged == isAcknowledged.Value);

                var alerts = query.OrderByDescending(a => a.CreatedAt).ToList();

                var studentIds = alerts.Select(a => a.StudentId).Distinct().ToList();
                var students = await _context.Students
                    .AsNoTracking()
                    .Where(s => studentIds.Contains(s.Id))
                    .ToDictionaryAsync(s => s.Id, s => $"{s.FirstName} {s.LastName}");

                var users = new Dictionary<Guid, string>();
                var userIds = alerts.Where(a => a.AcknowledgedBy.HasValue)
                    .Select(a => a.AcknowledgedBy!.Value)
                    .Distinct()
                    .ToList();

                if (userIds.Any())
                {
                    users = await _context.StaffMembers
                        .AsNoTracking()
                        .Where(u => userIds.Contains(u.Id))
                        .ToDictionaryAsync(u => u.Id, u => u.Name ?? "Unknown");
                }

                return alerts.Select(a => new HealthAlertDto
                {
                    Id = a.Id,
                    SchoolId = a.SchoolId,
                    StudentId = a.StudentId,
                    StudentName = students.GetValueOrDefault(a.StudentId, "Unknown"),
                    AlertType = a.AlertType,
                    Severity = a.Severity,
                    Description = a.Description,
                    IsAcknowledged = a.IsAcknowledged,
                    AcknowledgedBy = a.AcknowledgedBy,
                    AcknowledgedByName = a.AcknowledgedBy.HasValue
                        ? users.GetValueOrDefault(a.AcknowledgedBy.Value, "Unknown")
                        : null,
                    AcknowledgedAt = a.AcknowledgedAt,
                    CreatedAt = a.CreatedAt
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health alerts for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<bool> AcknowledgeAlertAsync(Guid schoolId, Guid alertId, Guid userId)
        {
            try
            {
                var alert = _healthAlerts.FirstOrDefault(a => a.SchoolId == schoolId && a.Id == alertId);

                if (alert == null)
                    throw new KeyNotFoundException("Health alert not found");

                alert.IsAcknowledged = true;
                alert.AcknowledgedBy = userId;
                alert.AcknowledgedAt = DateTime.UtcNow;

                _logger.LogInformation("Health alert {AlertId} acknowledged by user {UserId}", alertId, userId);

                return await Task.FromResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error acknowledging health alert {AlertId}", alertId);
                throw;
            }
        }

        // ========== STATISTICS ==========

        public async Task<HealthStatsDto> GetHealthStatsAsync(Guid schoolId)
        {
            try
            {
                var records = await _context.HealthRecords
                    .AsNoTracking()
                    .Where(h => h.SchoolId == schoolId)
                    .ToListAsync();

                var totalRecords = records.Count;
                var normalStatus = 0;
                var attentionRequired = 0;
                var critical = 0;
                var followUp = 0;
                var underweight = 0;
                var normal = 0;
                var overweight = 0;
                var obese = 0;
                var totalBMI = 0m;
                var bmiCount = 0;

                foreach (var record in records)
                {
                    var healthData = DeserializeHealthData(record.Notes);

                    // Count status
                    switch (healthData.Status.ToLower())
                    {
                        case "normal":
                            normalStatus++;
                            break;
                        case "attention_required":
                            attentionRequired++;
                            break;
                        case "critical":
                            critical++;
                            break;
                        case "follow_up":
                            followUp++;
                            break;
                    }

                    // Calculate BMI distribution
                    if (record.Height.HasValue && record.Weight.HasValue && record.Height > 0 && record.Weight > 0)
                    {
                        var bmi = CalculateBMI(record.Height.Value, record.Weight.Value);
                        totalBMI += bmi;
                        bmiCount++;

                        var category = GetBMICategory(bmi);
                        switch (category.ToLower())
                        {
                            case "underweight":
                                underweight++;
                                break;
                            case "normal":
                                normal++;
                                break;
                            case "overweight":
                                overweight++;
                                break;
                            case "obese":
                                obese++;
                                break;
                        }
                    }
                }

                // Count upcoming checkups (within next 30 days)
                var today = DateTime.UtcNow.Date;
                var thirtyDaysFromNow = today.AddDays(30);
                var upcomingCheckups = records.Count(r =>
                {
                    var healthData = DeserializeHealthData(r.Notes);
                    return healthData.NextCheckupDate.HasValue &&
                           healthData.NextCheckupDate.Value.Date >= today &&
                           healthData.NextCheckupDate.Value.Date <= thirtyDaysFromNow;
                });

                // Count vaccinations due
                var vaccinationsDue = 0;
                foreach (var record in records)
                {
                    var healthData = DeserializeHealthData(record.Notes);
                    vaccinationsDue += healthData.Vaccinations.Count(v =>
                        v.NextDueDate.HasValue &&
                        v.NextDueDate.Value.Date >= today &&
                        v.NextDueDate.Value.Date <= thirtyDaysFromNow);
                }

                return new HealthStatsDto
                {
                    TotalRecords = totalRecords,
                    NormalStatus = normalStatus,
                    AttentionRequired = attentionRequired,
                    Critical = critical,
                    FollowUp = followUp,
                    AvgBMI = bmiCount > 0 ? Math.Round(totalBMI / bmiCount, 2) : 0,
                    UpcomingCheckups = upcomingCheckups,
                    VaccinationsDue = vaccinationsDue,
                    BMIDistribution = new BMIDistributionDto
                    {
                        Underweight = underweight,
                        Normal = normal,
                        Overweight = overweight,
                        Obese = obese
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting health stats for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== BMI CALCULATIONS ==========

        public async Task<BMIResultDto> CalculateBMIAsync(decimal height, decimal weight)
        {
            return await Task.FromResult(CalculateBMIResult(height, weight));
        }

        // ========== PRIVATE HELPER METHODS ==========

        private decimal CalculateBMI(decimal heightCm, decimal weightKg)
        {
            if (heightCm <= 0 || weightKg <= 0)
                return 0;

            var heightM = heightCm / 100m;
            return Math.Round(weightKg / (heightM * heightM), 2);
        }

        private string GetBMICategory(decimal bmi)
        {
            if (bmi < 18.5m) return "underweight";
            if (bmi < 25m) return "normal";
            if (bmi < 30m) return "overweight";
            return "obese";
        }

        private BMIResultDto CalculateBMIResult(decimal heightCm, decimal weightKg)
        {
            var bmi = CalculateBMI(heightCm, weightKg);
            var category = GetBMICategory(bmi);

            var heightM = heightCm / 100m;
            var idealWeightMin = 18.5m * heightM * heightM;
            var idealWeightMax = 24.9m * heightM * heightM;

            var interpretation = category switch
            {
                "underweight" => "Below normal weight range. Consider consulting a nutritionist.",
                "normal" => "Within healthy weight range.",
                "overweight" => "Above normal weight range. Consider diet and exercise modifications.",
                "obese" => "Significantly above normal weight range. Medical consultation recommended.",
                _ => "BMI calculation unavailable."
            };

            return new BMIResultDto
            {
                BMI = bmi,
                Category = category,
                Interpretation = interpretation,
                IdealWeightMin = Math.Round(idealWeightMin, 2),
                IdealWeightMax = Math.Round(idealWeightMax, 2)
            };
        }

        private HealthData DeserializeHealthData(string? notes)
        {
            if (string.IsNullOrEmpty(notes))
                return new HealthData();

            try
            {
                var data = JsonSerializer.Deserialize<HealthData>(notes);
                return data ?? new HealthData();
            }
            catch
            {
                return new HealthData();
            }
        }

        private string ExtractStatus(string notes)
        {
            try
            {
                var data = JsonSerializer.Deserialize<HealthData>(notes);
                return data?.Status ?? "normal";
            }
            catch
            {
                return "normal";
            }
        }

        private async Task CreateAutoAlertsAsync(Guid schoolId, Guid studentId, string status,
            List<string>? allergies, List<string>? medicalConditions)
        {
            try
            {
                // Create alert for critical status
                if (status == "critical")
                {
                    await CreateHealthAlertAsync(schoolId, new CreateHealthAlertDto
                    {
                        SchoolId = schoolId,
                        StudentId = studentId,
                        AlertType = "medical_condition",
                        Severity = "critical",
                        Description = "Critical health status detected during checkup"
                    });
                }

                // Create alerts for new allergies
                if (allergies != null && allergies.Any())
                {
                    foreach (var allergy in allergies.Take(3)) // Limit to first 3
                    {
                        await CreateHealthAlertAsync(schoolId, new CreateHealthAlertDto
                        {
                            SchoolId = schoolId,
                            StudentId = studentId,
                            AlertType = "allergy",
                            Severity = "high",
                            Description = $"Allergy reported: {allergy}"
                        });
                    }
                }

                // Create alerts for new medical conditions
                if (medicalConditions != null && medicalConditions.Any())
                {
                    foreach (var condition in medicalConditions.Take(2)) // Limit to first 2
                    {
                        await CreateHealthAlertAsync(schoolId, new CreateHealthAlertDto
                        {
                            SchoolId = schoolId,
                            StudentId = studentId,
                            AlertType = "medical_condition",
                            Severity = "medium",
                            Description = $"Medical condition reported: {condition}"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error creating auto-alerts for student {StudentId}", studentId);
                // Don't throw - this is a non-critical operation
            }
        }
    }
}



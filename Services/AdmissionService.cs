using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IAdmissionService
    {
        // Application Management
        Task<PaginatedResponse<AdmissionBasicDto>> GetApplicationsAsync(
            Guid schoolId, AdmissionFiltersDto filters, int page, int pageSize);
        Task<AdmissionFullDto?> GetApplicationByIdAsync(Guid schoolId, Guid id);
        Task<AdmissionFullDto> CreateApplicationAsync(Guid schoolId, CreateAdmissionDto dto, Guid userId);
        Task<AdmissionFullDto> UpdateApplicationAsync(Guid schoolId, Guid id, UpdateAdmissionDto dto);
        Task<bool> DeleteApplicationAsync(Guid schoolId, Guid id);

        // Status Management
        Task<bool> UpdateStatusAsync(Guid schoolId, Guid id, string status, string? remarks, Guid userId);
        Task<bool> ScheduleInterviewAsync(Guid schoolId, Guid id, DateTime interviewDate, string? notes);
        Task<bool> ApproveApplicationAsync(Guid schoolId, Guid id, Guid userId);
        Task<bool> RejectApplicationAsync(Guid schoolId, Guid id, string reason, Guid userId);
        Task<bool> EnrollStudentAsync(Guid schoolId, Guid id, string admissionNumber, Guid userId, string? section = null);

        // Statistics
        Task<AdmissionStatsDto> GetApplicationStatsAsync(Guid schoolId);

        // Documents
        Task<List<AdmissionDocumentDto>> GetDocumentsAsync(Guid schoolId, Guid admissionId);
        Task<AdmissionDocumentDto> UploadDocumentAsync(Guid schoolId, Guid admissionId, CreateAdmissionDocumentDto dto);
    }

    public class AdmissionService : IAdmissionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdmissionService> _logger;

        // Valid admission status values and their allowed transitions
        private static readonly string[] ValidStatuses = { "pending", "approved", "rejected", "waitlisted", "enrolled", "interviewed" };

        // Status transition rules: key = current status, value = allowed next statuses
        private static readonly Dictionary<string, string[]> AllowedTransitions = new()
        {
            ["pending"]    = new[] { "approved", "rejected", "waitlisted", "interviewed" },
            ["interviewed"]= new[] { "approved", "rejected", "waitlisted" },
            ["waitlisted"] = new[] { "approved", "rejected" },
            ["approved"]   = new[] { "enrolled", "rejected" },
            ["rejected"]   = Array.Empty<string>(),  // terminal state
            ["enrolled"]   = Array.Empty<string>()   // terminal state
        };

        private static readonly string[] ValidGenders   = { "male", "female", "other" };
        private static readonly string[] ValidCategories = { "general", "obc", "sc", "st", "ews" };

        // Age eligibility by class
        private static readonly Dictionary<string, int> MinAgeMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Nursery"] = 3, ["LKG"] = 4, ["UKG"] = 5,
            ["1"] = 6,  ["2"] = 7,  ["3"] = 8,  ["4"] = 9, ["5"] = 10,
            ["6"] = 11, ["7"] = 12, ["8"] = 13, ["9"] = 14, ["10"] = 15,
            ["11"] = 16, ["12"] = 17
        };

        public AdmissionService(AppDbContext context, ILogger<AdmissionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== APPLICATION MANAGEMENT ==========

        public async Task<PaginatedResponse<AdmissionBasicDto>> GetApplicationsAsync(
            Guid schoolId, AdmissionFiltersDto filters, int page, int pageSize)
        {
            // Pagination bounds normalization
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            try
            {
                var query = _context.Admissions
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId);

                // Apply filters
                if (!string.IsNullOrEmpty(filters.Status))
                    query = query.Where(a => a.Status == filters.Status);

                if (!string.IsNullOrEmpty(filters.Class))
                    query = query.Where(a => a.ApplyingForClass == filters.Class);

                if (!string.IsNullOrEmpty(filters.AcademicYear))
                    query = query.Where(a => a.AcademicYear == filters.AcademicYear);

                if (!string.IsNullOrEmpty(filters.SearchTerm))
                {
                    var searchLower = filters.SearchTerm.ToLower();
                    query = query.Where(a =>
                        a.FirstName.ToLower().Contains(searchLower) ||
                        a.LastName.ToLower().Contains(searchLower) ||
                        a.ApplicationNumber.ToLower().Contains(searchLower) ||
                        a.ParentPhone.Contains(searchLower));
                }

                if (filters.DateFrom.HasValue)
                    query = query.Where(a => a.ApplicationDate >= filters.DateFrom.Value);

                if (filters.DateTo.HasValue)
                    query = query.Where(a => a.ApplicationDate <= filters.DateTo.Value);

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderByDescending(a => a.ApplicationDate)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(a => new AdmissionBasicDto
                    {
                        Id = a.Id,
                        ApplicationNumber = a.ApplicationNumber,
                        StudentName = $"{a.FirstName} {a.LastName}",
                        DateOfBirth = a.DateOfBirth,
                        Gender = a.Gender,
                        AppliedClass = a.ApplyingForClass,
                        GuardianName = a.ParentName,
                        GuardianPhone = a.ParentPhone,
                        ApplicationDate = a.ApplicationDate,
                        Status = a.Status
                    })
                    .ToListAsync();

                return new PaginatedResponse<AdmissionBasicDto>
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
                _logger.LogError(ex, "Error getting applications for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<AdmissionFullDto?> GetApplicationByIdAsync(Guid schoolId, Guid id)
        {
            try
            {
                var admission = await _context.Admissions
                    .AsNoTracking()
                    .Include(a => a.ProcessedByStaff)
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (admission == null)
                    return null;

                // Parse additional details from Remarks field (stored as JSON)
                var additionalData = ParseAdditionalData(admission.Remarks);

                var dto = new AdmissionFullDto
                {
                    Id = admission.Id,
                    SchoolId = admission.SchoolId,
                    ApplicationNumber = admission.ApplicationNumber,

                    // Student Information
                    FirstName = admission.FirstName,
                    LastName = admission.LastName,
                    StudentName = $"{admission.FirstName} {admission.LastName}",
                    DateOfBirth = admission.DateOfBirth,
                    Gender = admission.Gender,
                    BloodGroup = GetStringValue(additionalData, "BloodGroup"),
                    Nationality = GetStringValue(additionalData, "Nationality") ?? "Indian",
                    Religion = GetStringValue(additionalData, "Religion"),
                    Caste = GetStringValue(additionalData, "Caste"),
                    Category = GetStringValue(additionalData, "Category"),
                    MotherTongue = GetStringValue(additionalData, "MotherTongue"),

                    // Guardian Information
                    GuardianName = admission.ParentName,
                    GuardianRelation = GetStringValue(additionalData, "GuardianRelation") ?? "Parent",
                    GuardianPhone = admission.ParentPhone,
                    GuardianEmail = admission.ParentEmail,
                    GuardianOccupation = GetStringValue(additionalData, "GuardianOccupation"),
                    GuardianAnnualIncome = GetDecimalValue(additionalData, "GuardianAnnualIncome"),

                    // Father Details
                    FatherName = GetStringValue(additionalData, "FatherName"),
                    FatherPhone = GetStringValue(additionalData, "FatherPhone"),
                    FatherEmail = GetStringValue(additionalData, "FatherEmail"),
                    FatherOccupation = GetStringValue(additionalData, "FatherOccupation"),

                    // Mother Details
                    MotherName = GetStringValue(additionalData, "MotherName"),
                    MotherPhone = GetStringValue(additionalData, "MotherPhone"),
                    MotherEmail = GetStringValue(additionalData, "MotherEmail"),
                    MotherOccupation = GetStringValue(additionalData, "MotherOccupation"),

                    // Address
                    Address = admission.Address,
                    City = GetStringValue(additionalData, "City"),
                    State = GetStringValue(additionalData, "State"),
                    Pincode = GetStringValue(additionalData, "Pincode"),
                    PermanentAddress = GetStringValue(additionalData, "PermanentAddress"),

                    // Academic
                    AppliedClass = admission.ApplyingForClass,
                    AcademicYear = admission.AcademicYear,
                    PreviousSchool = admission.PreviousSchool,
                    PreviousClass = GetStringValue(additionalData, "PreviousClass"),
                    PreviousMarks = GetDecimalValue(additionalData, "PreviousMarks"),
                    TransferCertificateNumber = GetStringValue(additionalData, "TransferCertificateNumber"),

                    // Documents
                    AadharNumber = GetStringValue(additionalData, "AadharNumber"),
                    BirthCertificateNumber = GetStringValue(additionalData, "BirthCertificateNumber"),
                    PhotoUrl = GetStringValue(additionalData, "PhotoUrl"),

                    // Application Status
                    ApplicationDate = admission.ApplicationDate,
                    Status = admission.Status,
                    InterviewDate = admission.InterviewDate,
                    InterviewNotes = GetStringValue(additionalData, "InterviewNotes"),
                    ApprovedBy = admission.ProcessedBy,
                    ApprovedByName = admission.ProcessedByStaff != null ? $"{admission.ProcessedByStaff.FirstName} {admission.ProcessedByStaff.LastName}" : null,
                    ApprovedAt = admission.ProcessedAt,
                    RejectionReason = GetStringValue(additionalData, "RejectionReason"),
                    EnrollmentDate = GetDateTimeValue(additionalData, "EnrollmentDate"),

                    CreatedAt = admission.CreatedAt,
                    UpdatedAt = admission.UpdatedAt
                };

                // Get documents
                dto.Documents = await GetDocumentsAsync(schoolId, id);

                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting application {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<AdmissionFullDto> CreateApplicationAsync(Guid schoolId, CreateAdmissionDto dto, Guid userId)
        {
            // ===== VALIDATION 1: Required field lengths =====
            if (string.IsNullOrWhiteSpace(dto.FirstName) || dto.FirstName.Trim().Length < 2)
                throw new ArgumentException("First name must be at least 2 characters");
            if (dto.FirstName.Length > 100)
                throw new ArgumentException("First name must not exceed 100 characters");

            if (string.IsNullOrWhiteSpace(dto.LastName) || dto.LastName.Trim().Length < 2)
                throw new ArgumentException("Last name must be at least 2 characters");
            if (dto.LastName.Length > 100)
                throw new ArgumentException("Last name must not exceed 100 characters");

            if (string.IsNullOrWhiteSpace(dto.GuardianName) || dto.GuardianName.Trim().Length < 2)
                throw new ArgumentException("Guardian name must be at least 2 characters");

            if (string.IsNullOrWhiteSpace(dto.GuardianPhone))
                throw new ArgumentException("Guardian phone is required");

            if (string.IsNullOrWhiteSpace(dto.Address) || dto.Address.Trim().Length < 5)
                throw new ArgumentException("Address must be at least 5 characters");

            if (string.IsNullOrWhiteSpace(dto.AppliedClass))
                throw new ArgumentException("Applied class is required");

            // ===== VALIDATION 2: Gender enum =====
            if (string.IsNullOrWhiteSpace(dto.Gender) || !ValidGenders.Contains(dto.Gender.ToLower()))
                throw new ArgumentException($"Invalid gender. Must be one of: {string.Join(", ", ValidGenders)}");

            // ===== VALIDATION 3: Category enum =====
            if (!string.IsNullOrWhiteSpace(dto.Category) && !ValidCategories.Contains(dto.Category.ToLower()))
                throw new ArgumentException($"Invalid category. Must be one of: {string.Join(", ", ValidCategories)}");

            // ===== VALIDATION 4: Academic year format =====
            if (string.IsNullOrWhiteSpace(dto.AcademicYear))
                throw new ArgumentException("Academic year is required");
            if (dto.AcademicYear.Length > 20)
                throw new ArgumentException("Academic year must not exceed 20 characters");
            if (!Regex.IsMatch(dto.AcademicYear, @"^\d{4}(-\d{2,4})?$"))
                throw new ArgumentException("Academic year must be in format YYYY or YYYY-YY (e.g. 2025 or 2025-26)");

            // ===== VALIDATION 5: Date of birth (not in future, not unreasonably old) =====
            if (dto.DateOfBirth >= DateTime.UtcNow.Date)
                throw new ArgumentException("Date of birth must be in the past");
            if (dto.DateOfBirth < DateTime.UtcNow.AddYears(-25))
                throw new ArgumentException("Date of birth is too far in the past (max 25 years ago)");

            // ===== VALIDATION 6: Age eligibility =====
            var age = CalculateAge(dto.DateOfBirth);
            if (MinAgeMap.TryGetValue(dto.AppliedClass, out var minAge) && age < minAge)
                throw new InvalidOperationException($"Student must be at least {minAge} years old for class {dto.AppliedClass} (Current: {age} years)");

            // ===== VALIDATION 7: Previous marks bounds =====
            if (dto.PreviousMarks.HasValue)
            {
                if (dto.PreviousMarks < 0 || dto.PreviousMarks > 100)
                    throw new ArgumentException("Previous marks must be between 0 and 100");
            }

            // ===== VALIDATION 8: Guardian annual income (if provided) =====
            if (dto.GuardianAnnualIncome.HasValue && dto.GuardianAnnualIncome < 0)
                throw new ArgumentException("Guardian annual income cannot be negative");

            // ===== VALIDATION 9: Pincode format =====
            if (!string.IsNullOrWhiteSpace(dto.Pincode) && !Regex.IsMatch(dto.Pincode, @"^\d{6}$"))
                throw new ArgumentException("Pincode must be exactly 6 digits");

            // ===== DB VALIDATION 10: Duplicate applicant check =====
            var existingApplication = await _context.Admissions
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId
                    && a.FirstName == dto.FirstName.Trim()
                    && a.LastName == dto.LastName.Trim()
                    && a.DateOfBirth.Date == dto.DateOfBirth.Date
                    && a.AcademicYear == dto.AcademicYear
                    && a.Status != "rejected");

            if (existingApplication != null)
                throw new InvalidOperationException("An active application already exists for this student in this academic year");

            // ===== DB VALIDATION 11: Class capacity check =====
            const int classCapacity = 45;
            var confirmedEnrollments = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Class == dto.AppliedClass && s.Status == "Active")
                .CountAsync();

            var approvedApplications = await _context.Admissions
                .Where(a => a.SchoolId == schoolId
                    && a.ApplyingForClass == dto.AppliedClass
                    && a.AcademicYear == dto.AcademicYear
                    && (a.Status == "enrolled" || a.Status == "approved"))
                .CountAsync();

            if (confirmedEnrollments + approvedApplications >= classCapacity)
                throw new InvalidOperationException($"Class {dto.AppliedClass} is full (Capacity: {classCapacity}, Enrolled: {confirmedEnrollments}, Approved: {approvedApplications})");

            // Generate application number
            var year = DateTime.UtcNow.Year;
            var count = await _context.Admissions
                .Where(a => a.SchoolId == schoolId && a.ApplicationDate.Year == year)
                .CountAsync();
            var applicationNumber = $"ADM{year}{(count + 1):D5}";

            // Store additional fields as JSON in Remarks
            var additionalData = new Dictionary<string, object?>
            {
                ["BloodGroup"] = dto.BloodGroup,
                ["Nationality"] = dto.Nationality,
                ["Religion"] = dto.Religion,
                ["Caste"] = dto.Caste,
                ["Category"] = dto.Category?.ToLower(),
                ["MotherTongue"] = dto.MotherTongue,
                ["GuardianRelation"] = dto.GuardianRelation,
                ["GuardianOccupation"] = dto.GuardianOccupation,
                ["GuardianAnnualIncome"] = dto.GuardianAnnualIncome,
                ["FatherName"] = dto.FatherName,
                ["FatherPhone"] = dto.FatherPhone,
                ["FatherEmail"] = dto.FatherEmail,
                ["FatherOccupation"] = dto.FatherOccupation,
                ["MotherName"] = dto.MotherName,
                ["MotherPhone"] = dto.MotherPhone,
                ["MotherEmail"] = dto.MotherEmail,
                ["MotherOccupation"] = dto.MotherOccupation,
                ["City"] = dto.City,
                ["State"] = dto.State,
                ["Pincode"] = dto.Pincode,
                ["PermanentAddress"] = dto.PermanentAddress,
                ["PreviousClass"] = dto.PreviousClass,
                ["PreviousMarks"] = dto.PreviousMarks,
                ["TransferCertificateNumber"] = dto.TransferCertificateNumber,
                ["AadharNumber"] = dto.AadharNumber,
                ["BirthCertificateNumber"] = dto.BirthCertificateNumber,
                ["PhotoUrl"] = dto.PhotoUrl
            };

            var admission = new Admission
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ApplicationNumber = applicationNumber,
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                MiddleName = "",
                ParentName = dto.GuardianName.Trim(),
                ParentPhone = dto.GuardianPhone.Trim(),
                ParentEmail = dto.GuardianEmail?.Trim(),
                ApplyingForClass = dto.AppliedClass,
                ApplicationDate = DateTime.UtcNow,
                Status = "pending",
                PreviousSchool = dto.PreviousSchool,
                Address = dto.Address.Trim(),
                DateOfBirth = dto.DateOfBirth.Date,
                Gender = dto.Gender.ToLower(),
                AcademicYear = dto.AcademicYear,
                Remarks = JsonSerializer.Serialize(additionalData),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Admissions.Add(admission);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Application created: {AppNum} | Student: {First} {Last} | Class: {Class} | Age: {Age}",
                applicationNumber, dto.FirstName, dto.LastName, dto.AppliedClass, age);

            return await GetApplicationByIdAsync(schoolId, admission.Id)
                ?? throw new InvalidOperationException("Failed to retrieve created application");
        }

        public async Task<AdmissionFullDto> UpdateApplicationAsync(Guid schoolId, Guid id, UpdateAdmissionDto dto)
        {
            try
            {
                var admission = await _context.Admissions
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (admission == null)
                    throw new KeyNotFoundException($"Application {id} not found");

                // Parse existing additional data
                var additionalData = ParseAdditionalData(admission.Remarks);

                // Update basic fields
                if (!string.IsNullOrEmpty(dto.FirstName))
                    admission.FirstName = dto.FirstName;
                if (!string.IsNullOrEmpty(dto.LastName))
                    admission.LastName = dto.LastName;
                if (dto.DateOfBirth.HasValue)
                    admission.DateOfBirth = dto.DateOfBirth.Value;
                if (!string.IsNullOrEmpty(dto.Gender))
                    admission.Gender = dto.Gender;
                if (!string.IsNullOrEmpty(dto.GuardianName))
                    admission.ParentName = dto.GuardianName;
                if (!string.IsNullOrEmpty(dto.GuardianPhone))
                    admission.ParentPhone = dto.GuardianPhone;
                if (dto.GuardianEmail != null)
                    admission.ParentEmail = dto.GuardianEmail;
                if (!string.IsNullOrEmpty(dto.Address))
                    admission.Address = dto.Address;

                // Update additional fields in JSON
                if (!string.IsNullOrEmpty(dto.BloodGroup))
                    additionalData["BloodGroup"] = dto.BloodGroup;
                if (!string.IsNullOrEmpty(dto.GuardianRelation))
                    additionalData["GuardianRelation"] = dto.GuardianRelation;
                if (!string.IsNullOrEmpty(dto.GuardianOccupation))
                    additionalData["GuardianOccupation"] = dto.GuardianOccupation;
                if (dto.GuardianAnnualIncome.HasValue)
                    additionalData["GuardianAnnualIncome"] = dto.GuardianAnnualIncome.Value;
                if (!string.IsNullOrEmpty(dto.City))
                    additionalData["City"] = dto.City;
                if (!string.IsNullOrEmpty(dto.State))
                    additionalData["State"] = dto.State;
                if (!string.IsNullOrEmpty(dto.Pincode))
                    additionalData["Pincode"] = dto.Pincode;
                if (dto.InterviewDate.HasValue)
                {
                    admission.InterviewDate = dto.InterviewDate.Value;
                }
                if (dto.InterviewNotes != null)
                    additionalData["InterviewNotes"] = dto.InterviewNotes;

                admission.Remarks = JsonSerializer.Serialize(additionalData);
                admission.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated application {Id} for school {SchoolId}", id, schoolId);

                return await GetApplicationByIdAsync(schoolId, id)
                    ?? throw new Exception("Failed to retrieve updated application");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating application {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        public async Task<bool> DeleteApplicationAsync(Guid schoolId, Guid id)
        {
            try
            {
                var admission = await _context.Admissions
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                if (admission == null)
                    return false;

                // Cannot delete enrolled applications
                if (admission.Status == "enrolled")
                    throw new InvalidOperationException("Cannot delete an enrolled application");

                // Delete associated documents first
                var documents = await _context.AdmissionDocuments
                    .Where(d => d.AdmissionId == id)
                    .ToListAsync();
                _context.AdmissionDocuments.RemoveRange(documents);

                _context.Admissions.Remove(admission);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted application {Id} for school {SchoolId}", id, schoolId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting application {Id} for school {SchoolId}", id, schoolId);
                throw;
            }
        }

        // ========== STATUS MANAGEMENT ==========

        public async Task<bool> UpdateStatusAsync(Guid schoolId, Guid id, string status, string? remarks, Guid userId)
        {
            // ===== VALIDATION: Status enum =====
            if (string.IsNullOrWhiteSpace(status))
                throw new ArgumentException("Status is required");

            var normalizedStatus = status.Trim().ToLower();
            if (!ValidStatuses.Contains(normalizedStatus))
                throw new ArgumentException($"Invalid status '{status}'. Valid values: {string.Join(", ", ValidStatuses)}");

            // ===== VALIDATION: Rejection reason required =====
            if (normalizedStatus == "rejected" && string.IsNullOrWhiteSpace(remarks))
                throw new ArgumentException("Rejection reason is required when rejecting an application");

            var admission = await _context.Admissions
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (admission == null)
                throw new KeyNotFoundException($"Admission application {id} not found");

            // ===== VALIDATION: Status workflow =====
            var currentStatus = admission.Status.ToLower();
            if (!AllowedTransitions.TryGetValue(currentStatus, out var allowedNext) || !allowedNext.Contains(normalizedStatus))
                throw new InvalidOperationException($"Cannot transition from '{admission.Status}' to '{status}'. Allowed transitions: {string.Join(", ", AllowedTransitions.GetValueOrDefault(currentStatus, Array.Empty<string>()))}");

            var additionalData = ParseAdditionalData(admission.Remarks);

            admission.Status = normalizedStatus;
            // ProcessedBy would require userId to be a valid Staff ID (foreign key constraint)
            // Since the JWT token contains User IDs, not Staff IDs, we skip setting this to avoid FK violation
            // admission.ProcessedBy = userId;
            admission.ProcessedAt = DateTime.UtcNow;
            admission.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(remarks))
            {
                if (normalizedStatus == "rejected")
                    additionalData["RejectionReason"] = remarks;
                else
                    additionalData["StatusRemarks"] = remarks;
            }

            admission.Remarks = JsonSerializer.Serialize(additionalData);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated status to {Status} for application {Id} by user {UserId}", status, id, userId);
            return true;
        }

        public async Task<bool> ScheduleInterviewAsync(Guid schoolId, Guid id, DateTime interviewDate, string? notes)
        {
            // ===== VALIDATION: Interview date must be in the future =====
            if (interviewDate.Date < DateTime.UtcNow.Date)
                throw new ArgumentException("Interview date must be today or a future date");

            if (interviewDate > DateTime.UtcNow.AddYears(1))
                throw new ArgumentException("Interview date cannot be more than 1 year in the future");

            // ===== VALIDATION: Notes length =====
            if (!string.IsNullOrWhiteSpace(notes) && notes.Length > 1000)
                throw new ArgumentException("Interview notes must not exceed 1000 characters");

            var admission = await _context.Admissions
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (admission == null)
                throw new KeyNotFoundException($"Admission application {id} not found");

            // ===== VALIDATION: Can only schedule interview for pending/waitlisted applications =====
            if (admission.Status != "pending" && admission.Status != "waitlisted")
                throw new InvalidOperationException($"Cannot schedule interview for application with status '{admission.Status}'. Only pending or waitlisted applications can be scheduled.");

            admission.InterviewDate = interviewDate.ToUniversalTime();
            admission.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(notes))
            {
                var additionalData = ParseAdditionalData(admission.Remarks);
                additionalData["InterviewNotes"] = notes;
                admission.Remarks = JsonSerializer.Serialize(additionalData);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Scheduled interview for application {Id} on {Date}", id, interviewDate);
            return true;
        }

        public async Task<bool> ApproveApplicationAsync(Guid schoolId, Guid id, Guid userId)
        {
            return await UpdateStatusAsync(schoolId, id, "approved", null, userId);
        }

        public async Task<bool> RejectApplicationAsync(Guid schoolId, Guid id, string reason, Guid userId)
        {
            if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 3)
                throw new ArgumentException("Rejection reason must be at least 3 characters");
            if (reason.Length > 500)
                throw new ArgumentException("Rejection reason must not exceed 500 characters");

            return await UpdateStatusAsync(schoolId, id, "rejected", reason, userId);
        }

        public async Task<bool> EnrollStudentAsync(Guid schoolId, Guid id, string admissionNumber, Guid userId, string? section = null)
        {
            // ===== UPFRONT VALIDATION (before transaction) =====
            if (string.IsNullOrWhiteSpace(admissionNumber))
                throw new ArgumentException("Admission number is required");

            if (admissionNumber.Length > 50)
                throw new ArgumentException("Admission number must not exceed 50 characters");

            var admission = await _context.Admissions
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

            if (admission == null)
                throw new KeyNotFoundException($"Admission application {id} not found");

            if (admission.Status != "approved")
                throw new InvalidOperationException($"Only approved applications can be enrolled (Current: {admission.Status})");

            // Check admission number uniqueness before entering transaction
            var duplicateAdmissionNumber = await _context.Students
                .FirstOrDefaultAsync(s => s.AdmissionNumber == admissionNumber.Trim() && s.SchoolId == schoolId);
            if (duplicateAdmissionNumber != null)
                throw new InvalidOperationException($"Admission number '{admissionNumber}' is already in use");

            // ===== EXECUTE IN STRATEGY (PostgreSQL retry-safe) =====
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Re-fetch inside transaction for consistency
                    var admissionInTx = await _context.Admissions
                        .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == id);

                    if (admissionInTx == null)
                        throw new KeyNotFoundException($"Admission application {id} not found");

                    if (admissionInTx.Status != "approved")
                        throw new InvalidOperationException($"Application status changed during processing (Current: {admissionInTx.Status})");

                    // Generate roll number
                    var rollNumber = await GetNextRollNumberAsync(schoolId, admissionInTx.ApplyingForClass);

                    var student = new Student
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        AdmissionNumber = admissionNumber.Trim(),
                        Name = $"{admissionInTx.FirstName} {admissionInTx.LastName}",
                        FirstName = admissionInTx.FirstName,
                        LastName = admissionInTx.LastName,
                        DateOfBirth = admissionInTx.DateOfBirth,
                        Gender = admissionInTx.Gender,
                        Class = admissionInTx.ApplyingForClass,
                        Section = !string.IsNullOrWhiteSpace(section) ? section.Trim() : "A",
                        RollNumber = rollNumber,
                        Status = "active",  // Lowercase to match queries
                        IsActive = true,
                        GuardianName = admissionInTx.ParentName,
                        Address = admissionInTx.Address,
                        AdmissionDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Students.Add(student);
                    await _context.SaveChangesAsync();

                    // Update admission record
                    var additionalData = ParseAdditionalData(admissionInTx.Remarks);
                    additionalData["AdmissionNumber"] = admissionNumber.Trim();
                    additionalData["EnrollmentDate"] = DateTime.UtcNow;
                    additionalData["StudentId"] = student.Id.ToString();

                    admissionInTx.Status = "enrolled";
                    // admissionInTx.ProcessedBy = userId;  // Avoid FK constraint: userId is not a valid Staff ID
                    admissionInTx.ProcessedAt = DateTime.UtcNow;
                    admissionInTx.Remarks = JsonSerializer.Serialize(additionalData);
                    admissionInTx.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation("ENROLLED | Admission: {AdmNum} | Student: {First} {Last} | Class: {Class}",
                        admissionNumber, admissionInTx.FirstName, admissionInTx.LastName, admissionInTx.ApplyingForClass);

                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ===== NEW HELPER: Get Next Roll Number =====
        private async Task<string> GetNextRollNumberAsync(Guid schoolId, string className)
        {
            var existingRollNumbers = await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Class == className)
                .Select(s => s.RollNumber)
                .ToListAsync();

            var maxRoll = existingRollNumbers
                .Where(r => !string.IsNullOrEmpty(r) && int.TryParse(r, out _))
                .Select(r => int.Parse(r!))
                .DefaultIfEmpty(0)
                .Max();

            return (maxRoll + 1).ToString();
        }

        private static int CalculateAge(DateTime dateOfBirth)
        {
            var today = DateTime.UtcNow.Date;
            var age = today.Year - dateOfBirth.Year;
            if (dateOfBirth.Date > today.AddYears(-age)) age--;
            return age;
        }

        // ========== STATISTICS ==========

        public async Task<AdmissionStatsDto> GetApplicationStatsAsync(Guid schoolId)
        {
            // Return stats for ALL applications (not limited to current year)
            var applications = await _context.Admissions
                .AsNoTracking()
                .Where(a => a.SchoolId == schoolId)
                .ToListAsync();

            var stats = new AdmissionStatsDto
            {
                Total = applications.Count,
                Pending = applications.Count(a => a.Status == "pending"),
                Approved = applications.Count(a => a.Status == "approved"),
                Rejected = applications.Count(a => a.Status == "rejected"),
                Waitlisted = applications.Count(a => a.Status == "waitlisted"),
                Enrolled = applications.Count(a => a.Status == "enrolled"),
                Interviewed = applications.Count(a => a.Status == "interviewed"),
                ByClass = applications
                    .GroupBy(a => a.ApplyingForClass)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ByCategory = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            };

            // Parse categories from JSON
            foreach (var app in applications)
            {
                var additionalData = ParseAdditionalData(app.Remarks);
                var category = GetStringValue(additionalData, "Category") ?? "General";
                stats.ByCategory[category] = stats.ByCategory.GetValueOrDefault(category, 0) + 1;
            }

            return stats;
        }

        // ========== DOCUMENTS ==========

        public async Task<List<AdmissionDocumentDto>> GetDocumentsAsync(Guid schoolId, Guid admissionId)
        {
            try
            {
                var admission = await _context.Admissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == admissionId);

                if (admission == null)
                    throw new KeyNotFoundException($"Application {admissionId} not found");

                var documents = await _context.AdmissionDocuments
                    .AsNoTracking()
                    .Include(d => d.VerifiedByStaff)
                    .Where(d => d.AdmissionId == admissionId)
                    .Select(d => new AdmissionDocumentDto
                    {
                        Id = d.Id,
                        AdmissionId = d.AdmissionId,
                        DocumentType = d.Type,
                        DocumentName = d.Name,
                        FileUrl = d.Url,
                        IsVerified = d.Verified,
                        VerifiedBy = d.VerifiedBy,
                        VerifiedByName = d.VerifiedByStaff != null ? $"{d.VerifiedByStaff.FirstName} {d.VerifiedByStaff.LastName}" : null,
                        VerifiedAt = d.VerifiedAt,
                        CreatedAt = d.CreatedAt
                    })
                    .ToListAsync();

                return documents;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting documents for admission {AdmissionId}", admissionId);
                throw;
            }
        }

        public async Task<AdmissionDocumentDto> UploadDocumentAsync(
            Guid schoolId, Guid admissionId, CreateAdmissionDocumentDto dto)
        {
            // Validate document type and URL
            if (string.IsNullOrWhiteSpace(dto.DocumentType))
                throw new ArgumentException("Document type is required");
            if (string.IsNullOrWhiteSpace(dto.FileUrl))
                throw new ArgumentException("File URL is required");

            try
            {
                var admission = await _context.Admissions
                    .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.Id == admissionId);

                if (admission == null)
                    throw new KeyNotFoundException($"Application {admissionId} not found");

                var document = new AdmissionDocument
                {
                    Id = Guid.NewGuid(),
                    AdmissionId = admissionId,
                    Name = dto.DocumentName,
                    Type = dto.DocumentType,
                    Url = dto.FileUrl,
                    Verified = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AdmissionDocuments.Add(document);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Uploaded document {DocumentName} for admission {AdmissionId}",
                    dto.DocumentName, admissionId);

                return new AdmissionDocumentDto
                {
                    Id = document.Id,
                    AdmissionId = document.AdmissionId,
                    DocumentType = document.Type,
                    DocumentName = document.Name,
                    FileUrl = document.Url,
                    IsVerified = document.Verified,
                    VerifiedBy = document.VerifiedBy,
                    VerifiedByName = null,
                    VerifiedAt = document.VerifiedAt,
                    CreatedAt = document.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading document for admission {AdmissionId}", admissionId);
                throw;
            }
        }

        // ========== HELPER METHODS ==========

        private Dictionary<string, object?> ParseAdditionalData(string? remarksJson)
        {
            if (string.IsNullOrEmpty(remarksJson))
                return new Dictionary<string, object?>();

            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(remarksJson);
                if (parsed == null)
                    return new Dictionary<string, object?>();

                var result = new Dictionary<string, object?>();
                foreach (var kvp in parsed)
                {
                    if (kvp.Value.ValueKind == JsonValueKind.Null)
                        result[kvp.Key] = null;
                    else if (kvp.Value.ValueKind == JsonValueKind.String)
                        result[kvp.Key] = kvp.Value.GetString();
                    else if (kvp.Value.ValueKind == JsonValueKind.Number)
                        result[kvp.Key] = kvp.Value.GetDecimal();
                    else
                        result[kvp.Key] = kvp.Value.ToString();
                }
                return result;
            }
            catch
            {
                return new Dictionary<string, object?>();
            }
        }

        private string? GetStringValue(Dictionary<string, object?> data, string key)
        {
            if (data.TryGetValue(key, out var value))
                return value?.ToString();
            return null;
        }

        private decimal? GetDecimalValue(Dictionary<string, object?> data, string key)
        {
            if (data.TryGetValue(key, out var value) && value != null)
            {
                if (decimal.TryParse(value.ToString(), out var result))
                    return result;
            }
            return null;
        }

        private DateTime? GetDateTimeValue(Dictionary<string, object?> data, string key)
        {
            if (data.TryGetValue(key, out var value) && value != null)
            {
                if (DateTime.TryParse(value.ToString(), out var result))
                    return result;
            }
            return null;
        }
    }

    // ========== FILTER DTOs ==========

    public class AdmissionFiltersDto
    {
        public string? Status { get; set; }
        public string? Class { get; set; }
        public string? AcademicYear { get; set; }
        public string? SearchTerm { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    public class CreateAdmissionDocumentDto
    {
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
    }
}


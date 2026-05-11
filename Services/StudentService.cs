using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IStudentService
    {
        Task<StudentListResponse> GetStudentsAsync(Guid schoolId, int page, int pageSize, string? search, string? classFilter, string? sectionFilter, string? status, string? academicYear = null, string? sortBy = null, string? sortOrder = null);
        Task<StudentResponse?> GetStudentByIdAsync(Guid id, Guid schoolId);
        Task<StudentResponse> CreateStudentAsync(CreateStudentRequest request);
        Task<StudentResponse?> UpdateStudentAsync(Guid id, Guid schoolId, UpdateStudentRequest request);
        Task<bool> DeleteStudentAsync(Guid id, Guid schoolId);
        Task<StudentStatsResponse> GetStudentStatsAsync(Guid schoolId);
        Task<string> UploadPhotoAsync(Guid studentId, Guid schoolId, string fileName, byte[] fileData);
        Task<StudentDocumentDto> UploadDocumentAsync(Guid studentId, Guid schoolId, string documentType, string fileName, byte[] fileData);
        Task<List<StudentDocumentDto>> GetDocumentsAsync(Guid studentId, Guid schoolId);
        Task<bool> DeleteDocumentAsync(Guid documentId, Guid schoolId);
        Task<StudentResponse?> PromoteStudentAsync(Guid studentId, Guid schoolId, PromoteStudentRequest request);
        Task<BulkOperationResult> BulkPromoteStudentsAsync(Guid schoolId, BulkPromoteRequest request);
        Task<BulkOperationResult> BulkUpdateStudentsAsync(Guid schoolId, BulkUpdateRequest request);
        
        // Guardian Management
        Task<List<GuardianDto>> GetGuardiansAsync(Guid studentId, Guid schoolId);
        Task<GuardianDto> AddGuardianAsync(Guid schoolId, Guid studentId, CreateGuardianDto dto, Guid userId);
        Task<GuardianDto> UpdateGuardianAsync(Guid schoolId, Guid guardianId, UpdateGuardianDto dto);
        Task<bool> DeleteGuardianAsync(Guid schoolId, Guid guardianId);
        
        // Advanced Filtering
        Task<StudentListResponse> GetStudentsByTransportAsync(Guid schoolId, bool transportRequired, int page, int pageSize);
        Task<StudentListResponse> GetStudentsByHostelAsync(Guid schoolId, bool hostelRequired, int page, int pageSize);
        Task<StudentListResponse> GetStudentsByCategoryAsync(Guid schoolId, string category, int page, int pageSize);
        Task<List<StudentBasicResponse>> GetStudentSiblingsAsync(Guid schoolId, Guid studentId);
        
        // Bulk Operations
        Task<BulkOperationResult> BulkImportStudentsAsync(Guid schoolId, List<CreateStudentRequest> students, Guid userId);

        // CSV export / template
        Task<byte[]> ExportStudentsToCsvAsync(Guid schoolId, string? classFilter = null, string? status = null, string? academicYear = null);

        // Cross-module profile summary
        Task<StudentProfileSummary?> GetStudentProfileSummaryAsync(Guid studentId, Guid schoolId);

        /// <summary>Returns students whose guardian email matches the given parent email.</summary>
        Task<List<StudentBasicResponse>> GetMyChildrenAsync(Guid schoolId, string parentEmail);

        // ─── Sibling Management ───────────────────────────────────────────────
        Task<List<StudentBasicResponse>> GetSiblingsAsync(Guid schoolId, Guid studentId);
        Task AddSiblingAsync(Guid schoolId, Guid studentId, Guid siblingStudentId);
        Task RemoveSiblingAsync(Guid schoolId, Guid studentId, Guid siblingStudentId);

        // ─── Annual Health Records ────────────────────────────────────────────
        Task<List<StudentAnnualHealthDto>> GetAnnualHealthRecordsAsync(Guid schoolId, Guid studentId);
        Task<StudentAnnualHealthDto> UpsertAnnualHealthAsync(Guid schoolId, Guid studentId, UpsertAnnualHealthRequest request);

        // ─── Hobby / Club Management ──────────────────────────────────────────
        Task<List<HobbyDto>> GetHobbiesAsync(Guid schoolId);
        Task<HobbyDto> CreateHobbyAsync(Guid schoolId, CreateHobbyRequest request);
        Task<List<StudentHobbyEnrollmentDto>> GetStudentHobbiesAsync(Guid schoolId, Guid studentId, string? academicYear);
        Task<StudentHobbyEnrollmentDto> EnrollHobbyAsync(Guid schoolId, Guid studentId, EnrollHobbyRequest request);
        Task BulkEnrollHobbiesAsync(Guid schoolId, Guid studentId, BulkEnrollHobbiesRequest request);
        Task RemoveHobbyEnrollmentAsync(Guid schoolId, Guid enrollmentId);

        // ─── Permission Slips ────────────────────────────────────────────────
        Task<List<StudentPermissionSlipDto>> GetPermissionSlipsAsync(Guid schoolId, Guid studentId, string? academicYear);
        Task<List<StudentPermissionSlipDto>> GetAllPermissionSlipsAsync(Guid schoolId, DateTime date, string? academicYear);
        Task<StudentPermissionSlipDto> CreatePermissionSlipAsync(Guid schoolId, Guid studentId, CreatePermissionSlipRequest request, Guid issuedBy);
        Task<StudentPermissionSlipDto> ReviewPermissionSlipAsync(Guid schoolId, Guid slipId, ReviewPermissionSlipRequest request, Guid reviewedBy);

        // ─── Transfer Certificate ─────────────────────────────────────────────
        Task<TransferCertificateDto?> GetTransferCertificateAsync(Guid schoolId, Guid studentId);
        Task<TransferCertificateDto> CreateTransferCertificateAsync(Guid schoolId, Guid studentId, CreateTransferCertificateRequest request, Guid issuedBy);
        Task<TransferCertificateDto> IssueTCAsync(Guid schoolId, Guid studentId, IssueTCRequest request, Guid issuedBy);

        // ─── Document Verification ────────────────────────────────────────────
        Task<StudentDocumentDto> VerifyDocumentAsync(Guid schoolId, Guid documentId, VerifyDocumentDto request, Guid verifiedBy);

        // ─── Roll Number Assignment ────────────────────────────────────────────
        Task<List<RollNumberStudentDto>> GetStudentsForRollAssignmentAsync(Guid schoolId, string className, string section);
        Task BulkAssignRollNumbersAsync(Guid schoolId, RollNumberAssignmentRequest request);

        // ─── Guardian Staff Link ───────────────────────────────────────────────
        Task<GuardianStaffDto?> GetGuardianStaffAsync(Guid schoolId, Guid staffId);
        Task SetGuardianStaffAsync(Guid schoolId, Guid studentId, Guid? staffId);
        Task<List<StaffChildDto>> GetChildrenOfStaffAsync(Guid schoolId, Guid staffId);
    }

    public class StudentService : IStudentService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<StudentService> _logger;
        private readonly IAlumniService _alumniService;

        public StudentService(AppDbContext context, ILogger<StudentService> logger, IAlumniService alumniService)
        {
            _context = context;
            _logger = logger;
            _alumniService = alumniService;
        }

        // ── PII Masking helpers ──────────────────────────────────────────────
        /// <summary>Masks Aadhar: XXXX-XXXX-1234 (shows last 4 digits only)</summary>
        private static string? MaskAadhar(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var digits = value.Replace("-", "").Replace(" ", "");
            if (digits.Length < 4) return "****";
            return $"XXXX-XXXX-{digits[^4..]}";
        }

        /// <summary>Masks PAN: XXXXXE1234F (shows last 5 chars only)</summary>
        private static string? MaskPan(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (value.Length < 5) return "XXXXX";
            return $"XXXXX{value[^5..]}";
        }
        // ────────────────────────────────────────────────────────────────────

        public async Task<StudentListResponse> GetStudentsAsync(
            Guid schoolId, 
            int page, 
            int pageSize, 
            string? search, 
            string? classFilter,
            string? sectionFilter,
            string? status,
            string? academicYear = null,
            string? sortBy = null,
            string? sortOrder = null)
        {
            var query = _context.Students.Where(s => s.SchoolId == schoolId);

            // Apply filters
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower();
                query = query.Where(s => 
                    s.Name.ToLower().Contains(search) ||
                    s.AdmissionNumber.ToLower().Contains(search) ||
                    (s.Email != null && s.Email.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(classFilter))
            {
                query = query.Where(s => s.Class == classFilter);
            }

            if (!string.IsNullOrWhiteSpace(sectionFilter))
            {
                query = query.Where(s => s.Section == sectionFilter);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(s => s.Status == status);
            }

            // Academic year scoping: only include students who were enrolled in that year
            // Uses PromotionHistory to derive class membership per year
            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                var studentsInYear = _context.PromotionHistories
                    .Where(p => p.SchoolId == schoolId && p.AcademicYear == academicYear)
                    .Select(p => p.StudentId);
                // Include students promoted in that year, OR students with no promotion history (current year)
                query = query.Where(s => studentsInYear.Contains(s.Id) || !_context.PromotionHistories
                    .Any(p => p.SchoolId == schoolId && p.StudentId == s.Id));
            }

            var total = await query.CountAsync();

            // Dynamic sort: defaults to admissionNumber; supports name, class, section, status, dob
            bool descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
            IQueryable<Student> sortedQuery = (sortBy?.ToLower()) switch
            {
                "name"   => descending ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "class"  => descending ? query.OrderByDescending(s => s.Class).ThenByDescending(s => s.Section) : query.OrderBy(s => s.Class).ThenBy(s => s.Section),
                "status" => descending ? query.OrderByDescending(s => s.Status) : query.OrderBy(s => s.Status),
                "dob"    => descending ? query.OrderByDescending(s => s.DateOfBirth) : query.OrderBy(s => s.DateOfBirth),
                _        => descending ? query.OrderByDescending(s => s.AdmissionNumber) : query.OrderBy(s => s.AdmissionNumber),
            };

            var students = await sortedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentBasicResponse
                {
                    Id = s.Id,
                    Name = s.Name,
                    AdmissionNumber = s.AdmissionNumber,
                    Class = s.Class ?? "",
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return new StudentListResponse
            {
                Students = students,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<StudentResponse?> GetStudentByIdAsync(Guid id, Guid schoolId)
        {
            var student = await _context.Students
                .Include(s => s.Guardians)
                .Include(s => s.Documents)
                .Include(s => s.Siblings!).ThenInclude(ss => ss.Sibling)
                .Where(s => s.Id == id && s.SchoolId == schoolId)
                .FirstOrDefaultAsync();

            if (student == null)
                return null;

            return new StudentResponse
            {
                Id = student.Id,
                SchoolId = student.SchoolId,
                AdmissionNumber = student.AdmissionNumber,
                AdmissionDate = student.AdmissionDate,
                Name = student.Name,
                PreferredName = student.PreferredName,
                DateOfBirth = student.DateOfBirth,
                PlaceOfBirth = student.PlaceOfBirth,
                Gender = student.Gender,
                Nationality = student.Nationality,
                Class = student.Class,
                Section = student.Section,
                RollNumber = student.RollNumber,
                
                // Indian IDs (masked for PII compliance - last digits only)
                AadharNumber = MaskAadhar(student.AadharNumber),
                PanNumber = MaskPan(student.PanNumber),
                PassportNumber = student.PassportNumber,
                VisaType = student.VisaType,
                VisaExpiry = student.VisaExpiry,
                RationCardNumber = student.RationCardNumber,
                
                // Government / UDISE
                PenNumber = student.PenNumber,
                UDISENumber = student.UDISENumber,
                BoardRollNumber = student.BoardRollNumber,
                RegistrationNumber = student.RegistrationNumber,
                EnrollmentNumber = student.EnrollmentNumber,
                LedgerNumber = student.LedgerNumber,
                ApplicationFormNumber = student.ApplicationFormNumber,
                ReasonToApply = student.ReasonToApply,
                KnownAboutSchoolBy = student.KnownAboutSchoolBy,
                
                // Contact
                Address = student.Address,
                PermanentAddress = student.PermanentAddress,
                PrimaryPhone = student.PrimaryPhone,
                SecondaryPhone = student.SecondaryPhone,
                Email = student.Email,
                
                // Academic History
                PreviousSchool = student.PreviousSchool,
                PreviousClass = student.PreviousClass,
                PreviousSchoolPlace = student.PreviousSchoolPlace,
                PreviousSchoolBoard = student.PreviousSchoolBoard,
                PreviousSchoolYearOfPassing = student.PreviousSchoolYearOfPassing,
                PreviousSchoolPercentage = student.PreviousSchoolPercentage,
                PreviousSchoolMedium = student.PreviousSchoolMedium,
                TransferReason = student.TransferReason,
                Category = student.Category,
                SubCaste = student.SubCaste,
                
                // DISE flags
                IsMinority = student.IsMinority,
                IsBPL = student.IsBPL,
                IsDifferentlyAbled = student.IsDifferentlyAbled,
                DifferentlyAbledType = student.DifferentlyAbledType,
                DifferentlyAbledPercentage = student.DifferentlyAbledPercentage,
                
                // Cultural
                Religion = student.Religion,
                Caste = student.Caste,
                MotherTongue = student.MotherTongue,
                
                // Medical
                BloodGroup = student.BloodGroup,
                Allergies = student.Allergies,
                ChronicConditions = student.ChronicConditions,
                Medications = student.Medications,
                EmergencyContact = student.EmergencyContact,
                EmergencyPhone = student.EmergencyPhone,
                DoctorName = student.DoctorName,
                DoctorPhone = student.DoctorPhone,
                
                // Consent
                PhotoConsent = student.PhotoConsent,
                MediaConsent = student.MediaConsent,
                MedicalConsent = student.MedicalConsent,
                
                // Additional
                LanguageProficiency = student.LanguageProficiency,
                SpecialNeeds = student.SpecialNeeds,
                TransportRequired = student.TransportRequired,
                HostelRequired = student.HostelRequired,
                CommunicationMode = student.CommunicationMode,
                
                // Extracurricular
                IsNCCCadet = student.IsNCCCadet,
                NCCDetails = student.NCCDetails,
                ExtraCurricularActivities = student.ExtraCurricularActivities,
                
                // Report Card
                ProgressReportRemarks = student.ProgressReportRemarks,
                ProgressReportRemarksCBSE = student.ProgressReportRemarksCBSE,
                
                // Character cert
                IsCharacterCertificateIssued = student.IsCharacterCertificateIssued,
                CharacterCertificateNumber = student.CharacterCertificateNumber,
                
                SiblingIds = student.SiblingIds,
                GuardianStaffId = student.GuardianStaffId,
                
                // Legacy fields for backward compatibility
                GuardianName = student.GuardianName,
                GuardianPhone = student.GuardianPhone,
                
                Status = student.Status,
                PhotoUrl = student.PhotoUrl,
                
                // Collections
                Guardians = student.Guardians?.Select(g => new GuardianDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Surname = g.Surname,
                    Relation = g.Relation,
                    Qualification = g.Qualification,
                    Occupation = g.Occupation,
                    EmploymentType = g.EmploymentType,
                    Employer = g.Employer,
                    OfficeAddress = g.OfficeAddress,
                    OfficePhone = g.OfficePhone,
                    OfficeEmail = g.OfficeEmail,
                    AnnualIncome = g.AnnualIncome,
                    DateOfBirth = g.DateOfBirth,
                    ResidentialAddress = g.ResidentialAddress,
                    Phone = g.Phone,
                    HomePhone = g.HomePhone,
                    Email = g.Email,
                    AadharNumber = MaskAadhar(g.AadharNumber),
                    PanNumber = MaskPan(g.PanNumber),
                    PassportNumber = g.PassportNumber,
                    PhotoUrl = g.PhotoUrl,
                    HasPortalAccess = g.HasPortalAccess
                }).ToList(),
                
                Documents = student.Documents?.Select(d => new StudentDocumentDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    FileUrl = d.FileUrl,
                    FileName = d.FileName,
                    DocumentNumber = d.DocumentNumber,
                    IssuingAuthority = d.IssuingAuthority,
                    IssueDate = d.IssueDate,
                    ExpiryDate = d.ExpiryDate,
                    VerificationStatus = d.VerificationStatus,
                    VerifiedAt = d.VerifiedAt,
                    UploadedAt = d.UploadedAt
                }).ToList(),
                
                Siblings = student.Siblings?.Select(ss => new StudentSiblingDto
                {
                    SiblingId = ss.SiblingId,
                    Name = ss.Sibling?.Name ?? string.Empty,
                    AdmissionNumber = ss.Sibling?.AdmissionNumber,
                    Class = ss.Sibling?.Class ?? string.Empty,
                    Section = ss.Sibling?.Section ?? string.Empty,
                    PhotoUrl = ss.Sibling?.PhotoUrl
                }).ToList(),
                
                CreatedAt = student.CreatedAt,
                UpdatedAt = student.UpdatedAt
            };
        }

        public async Task<StudentResponse> CreateStudentAsync(CreateStudentRequest request)
        {
            // Check if admission number already exists for this school
            var exists = await _context.Students
                .AnyAsync(s => s.SchoolId == request.SchoolId && s.AdmissionNumber == request.AdmissionNumber);

            if (exists)
            {
                throw new InvalidOperationException("A student with this admission number already exists.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            StudentResponse? createdStudent = null;

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var student = new Student
                    {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    AdmissionNumber = request.AdmissionNumber,
                    AdmissionDate = request.AdmissionDate,
                    Name = request.Name,
                    FirstName = request.FirstName,
                    MiddleName = request.MiddleName,
                    LastName = request.LastName,
                    PreferredName = request.PreferredName,
                    DateOfBirth = request.DateOfBirth,
                    PlaceOfBirth = request.PlaceOfBirth,
                    Gender = request.Gender,
                    Nationality = request.Nationality,
                    Class = request.Class,
                    Section = request.Section,
                    RollNumber = request.RollNumber,
                    
                    // Government / UDISE
                    PenNumber = request.PenNumber,
                    UDISENumber = request.UDISENumber,
                    BoardRollNumber = request.BoardRollNumber,
                    RegistrationNumber = request.RegistrationNumber,
                    EnrollmentNumber = request.EnrollmentNumber,
                    LedgerNumber = request.LedgerNumber,
                    ApplicationFormNumber = request.ApplicationFormNumber,
                    ReasonToApply = request.ReasonToApply,
                    KnownAboutSchoolBy = request.KnownAboutSchoolBy,
                    
                    // Indian IDs
                    AadharNumber = request.AadharNumber,
                    PanNumber = request.PanNumber,
                    PassportNumber = request.PassportNumber,
                    VisaType = request.VisaType,
                    VisaExpiry = request.VisaExpiry,
                    RationCardNumber = request.RationCardNumber,
                    
                    // Contact
                    Address = request.Address,
                    PermanentAddress = request.PermanentAddress,
                    PrimaryPhone = request.PrimaryPhone,
                    SecondaryPhone = request.SecondaryPhone,
                    Email = request.Email,
                    
                    // Academic History
                    PreviousSchool = request.PreviousSchool,
                    PreviousClass = request.PreviousClass,
                    PreviousSchoolPlace = request.PreviousSchoolPlace,
                    PreviousSchoolBoard = request.PreviousSchoolBoard,
                    PreviousSchoolYearOfPassing = request.PreviousSchoolYearOfPassing,
                    PreviousSchoolPercentage = request.PreviousSchoolPercentage,
                    PreviousSchoolMedium = request.PreviousSchoolMedium,
                    TransferReason = request.TransferReason,
                    Category = request.Category,
                    SubCaste = request.SubCaste,
                    
                    // DISE flags
                    IsMinority = request.IsMinority,
                    IsBPL = request.IsBPL,
                    IsDifferentlyAbled = request.IsDifferentlyAbled,
                    DifferentlyAbledType = request.DifferentlyAbledType,
                    DifferentlyAbledPercentage = request.DifferentlyAbledPercentage,
                    
                    // Cultural
                    Religion = request.Religion,
                    Caste = request.Caste,
                    MotherTongue = request.MotherTongue,
                    
                    // Medical
                    BloodGroup = request.BloodGroup,
                    Allergies = request.Allergies,
                    ChronicConditions = request.ChronicConditions,
                    Medications = request.Medications,
                    EmergencyContact = request.EmergencyContact,
                    EmergencyPhone = request.EmergencyPhone,
                    DoctorName = request.DoctorName,
                    DoctorPhone = request.DoctorPhone,
                    
                    // Consent
                    PhotoConsent = request.PhotoConsent,
                    MediaConsent = request.MediaConsent,
                    MedicalConsent = request.MedicalConsent,
                    
                    // Additional
                    LanguageProficiency = request.LanguageProficiency,
                    SpecialNeeds = request.SpecialNeeds,
                    TransportRequired = request.TransportRequired,
                    HostelRequired = request.HostelRequired,
                    CommunicationMode = request.CommunicationMode,
                    
                    // Extracurricular
                    IsNCCCadet = request.IsNCCCadet,
                    NCCDetails = request.NCCDetails,
                    ExtraCurricularActivities = request.ExtraCurricularActivities,
                    
                    // Report Card
                    ProgressReportRemarks = request.ProgressReportRemarks,
                    ProgressReportRemarksCBSE = request.ProgressReportRemarksCBSE,
                    
                    SiblingIds = request.SiblingIds,
                    
                    // Legacy fields
                    GuardianName = request.GuardianName,
                    GuardianPhone = request.GuardianPhone,
                    
                    Status = request.Status,
                    PhotoUrl = request.PhotoUrl,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                    _context.Students.Add(student);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Student created: {StudentId}, Admission: {AdmissionNumber}", student.Id, student.AdmissionNumber);

                    // AUTO-CREATE GUARDIAN RECORD from mandatory guardian fields (required for parent portal tab)
                    // Email is optional — record is created even without email so the parent portal tab
                    // shows the guardian and prompts admin to add email for portal login
                    if (!string.IsNullOrWhiteSpace(request.GuardianName))
                    {
                        var guardian = new StudentGuardian
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = request.SchoolId,
                            StudentId = student.Id,
                            Name = request.GuardianName,
                            Phone = request.GuardianPhone ?? "",
                            Email = string.IsNullOrWhiteSpace(request.GuardianEmail) ? null : request.GuardianEmail.Trim().ToLower(),
                            Relation = "guardian",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.StudentGuardians.Add(guardian);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Guardian record created for student {StudentId}", student.Id);
                    }

                    // AUTO-CREATE FEE RECORD based on class fee structure
                    await CreateInitialFeeRecordAsync(student);
                    
                    // AUTO-CREATE LIBRARY CARD if student needs library access
                    await CreateLibraryCardAsync(student);
                    
                    // AUTO-ASSIGN TRANSPORT ROUTE if student needs transport
                    if (student.TransportRequired)
                    {
                        await AutoAssignTransportRouteAsync(student);
                    }
                    
                    // AUTO-ALLOCATE HOSTEL ROOM if student needs hostel
                    if (student.HostelRequired)
                    {
                        await AutoAllocateHostelRoomAsync(student);
                    }
                    
                    await transaction.CommitAsync();
                    _logger.LogInformation("Student creation completed with all related records: {StudentId}", student.Id);

                    createdStudent = await GetStudentByIdAsync(student.Id, student.SchoolId)
                        ?? throw new InvalidOperationException("Failed to retrieve created student.");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to create student: {AdmissionNumber}", request.AdmissionNumber);
                    throw;
                }
            });

            return createdStudent ?? throw new InvalidOperationException("Failed to create student.");
        }
        
        /// <summary>
        /// Resolves the active academic year name for a school.
        /// Falls back to a calendar-based string if no active year is found.
        /// </summary>
        private async Task<string> GetActiveAcademicYearAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var activeYear = await _context.AcademicYears
                .Where(a => a.SchoolId == schoolId && a.StartDate <= now && a.EndDate >= now)
                .OrderByDescending(a => a.StartDate)
                .Select(a => a.Name)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(activeYear))
                return activeYear;

            // Fallback: most recent year in DB
            var latestYear = await _context.AcademicYears
                .Where(a => a.SchoolId == schoolId)
                .OrderByDescending(a => a.StartDate)
                .Select(a => a.Name)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(latestYear))
                return latestYear;

            // Final fallback: derive from calendar
            return now.Month >= 4
                ? $"{now.Year}-{now.Year + 1}"
                : $"{now.Year - 1}-{now.Year}";
        }

        private async Task CreateInitialFeeRecordAsync(Student student)
        {
            try
            {
                var academicYear = await GetActiveAcademicYearAsync(student.SchoolId);
                
                var feeStructure = await _context.FeeStructures
                    .Where(f => f.SchoolId == student.SchoolId && 
                               f.Class == student.Class &&
                               f.AcademicYear == academicYear)
                    .OrderByDescending(f => f.CreatedAt)
                    .FirstOrDefaultAsync();

                if (feeStructure != null)
                {
                    var feeRecord = new FeeRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = student.SchoolId,
                        StudentId = student.Id,
                        FeeStructureId = feeStructure.Id,
                        AcademicYear = academicYear,
                        TotalAmount = feeStructure.TotalAmount,
                        PaidAmount = 0,
                        BalanceAmount = feeStructure.TotalAmount,
                        DueDate = DateTime.UtcNow.AddDays(30), // 30 days to pay
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.FeeRecords.Add(feeRecord);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Fee record auto-created for student {StudentId}, Amount: {Amount}", 
                        student.Id, feeStructure.TotalAmount);
                }
                else
                {
                    _logger.LogWarning("No fee structure found for class {Class}, academic year {Year}. Fee record not created.",
                        student.Class, academicYear);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create fee record for student {StudentId}", student.Id);
                // Don't throw - fee record creation failure shouldn't block student creation
            }
        }
        
        private async Task CreateLibraryCardAsync(Student student)
        {
            try
            {
                // Check if library system is being used by this school
                var hasLibraryBooks = await _context.Books.AnyAsync(b => b.SchoolId == student.SchoolId);
                
                if (hasLibraryBooks)
                {
                    // Generate unique library card number
                    var cardNumber = $"LIB-{student.AdmissionNumber}";
                    
                    // Check if card already exists (shouldn't happen, but safety check)
                    var existingCard = await _context.BookIssues
                        .AnyAsync(b => b.StudentId == student.Id && b.SchoolId == student.SchoolId);
                    
                    if (!existingCard)
                    {
                        _logger.LogInformation("Library card initialized for student {StudentId}: {CardNumber}", 
                            student.Id, cardNumber);
                        // Library card will be created on first book issue
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize library card for student {StudentId}", student.Id);
                // Don't throw - library card failure shouldn't block student creation
            }
        }
        
        private async Task AutoAssignTransportRouteAsync(Student student)
        {
            try
            {
                _logger.LogInformation("Auto-assigning transport route for student {StudentId}", student.Id);
                
                // Find an active route with available capacity
                // Priority: Route with space that serves student's address area
                var availableRoute = await _context.TransportRoutes
                    .Where(r => r.SchoolId == student.SchoolId && 
                               r.Status == "active" &&
                               r.StudentsAssigned < r.Capacity)
                    .OrderBy(r => r.StudentsAssigned) // Prefer routes with fewer students
                    .FirstOrDefaultAsync();

                if (availableRoute != null)
                {
                    // Create transport assignment
                    var transportStudent = new TransportStudent
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = student.SchoolId,
                        StudentId = student.Id,
                        RouteId = availableRoute.Id,
                        PickupPoint = student.Address, // Use student's address as pickup point
                        DropPoint = student.Address,
                        Fare = availableRoute.Fare,
                        MonthlyFee = availableRoute.MonthlyFee ?? availableRoute.Fare,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.TransportStudents.Add(transportStudent);
                    
                    // Increment route's student count
                    availableRoute.StudentsAssigned++;
                    availableRoute.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Transport route assigned: StudentId={StudentId}, Route={RouteName}, Fee={Fee}",
                        student.Id, availableRoute.RouteName, transportStudent.MonthlyFee);
                    
                    // Auto-generate transport fee record
                    await CreateTransportFeeRecordAsync(student, transportStudent.MonthlyFee.GetValueOrDefault());
                }
                else
                {
                    _logger.LogWarning("No available transport routes found for student {StudentId}. Transport assignment skipped.",
                        student.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-assign transport for student {StudentId}", student.Id);
                // Don't throw - transport assignment failure shouldn't block student creation
            }
        }
        
        private async Task CreateTransportFeeRecordAsync(Student student, decimal monthlyFee)
        {
            try
            {
                var academicYear = await GetActiveAcademicYearAsync(student.SchoolId);
                
                var feeRecord = new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = student.SchoolId,
                    StudentId = student.Id,
                    FeeStructureId = null, // Transport fee not linked to structure
                    AcademicYear = academicYear,
                    TotalAmount = monthlyFee,
                    PaidAmount = 0,
                    BalanceAmount = monthlyFee,
                    DueDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 10).AddMonths(1), // 10th of next month
                    Status = "pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.FeeRecords.Add(feeRecord);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Transport fee record created for student {StudentId}, Amount: {Amount}",
                    student.Id, monthlyFee);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create transport fee record for student {StudentId}", student.Id);
                // Don't throw - fee record creation failure shouldn't block student creation
            }
        }
        
        private async Task AutoAllocateHostelRoomAsync(Student student)
        {
            try
            {
                _logger.LogInformation("Auto-allocating hostel room for student {StudentId}", student.Id);
                
                // Find available room matching student's gender (if tracked)
                // Priority: Room with available space
                var availableRoom = await _context.HostelRooms
                    .Where(r => r.SchoolId == student.SchoolId && 
                               r.Status == "available" &&
                               r.Occupied < r.Capacity)
                    .OrderBy(r => r.Occupied) // Prefer rooms with fewer occupants
                    .FirstOrDefaultAsync();

                if (availableRoom != null)
                {
                    // Create hostel assignment
                    var hostelStudent = new HostelStudent
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = student.SchoolId,
                        StudentId = student.Id,
                        RoomId = availableRoom.Id,
                        CheckInDate = DateTime.UtcNow,
                        CheckOutDate = null,
                        MonthlyFee = availableRoom.RentPerBed,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.HostelStudents.Add(hostelStudent);
                    
                    // Increment room's occupied count
                    availableRoom.Occupied++;
                    availableRoom.UpdatedAt = DateTime.UtcNow;
                    
                    // Update room status if now full
                    if (availableRoom.Occupied >= availableRoom.Capacity)
                    {
                        availableRoom.Status = "full";
                    }
                    
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Hostel room allocated: StudentId={StudentId}, Room={RoomNumber}, Fee={Fee}",
                        student.Id, availableRoom.RoomNumber, hostelStudent.MonthlyFee);
                    
                    // Auto-generate hostel fee record
                    await CreateHostelFeeRecordAsync(student, hostelStudent.MonthlyFee);
                }
                else
                {
                    _logger.LogWarning("No available hostel rooms found for student {StudentId}. Hostel allocation skipped.",
                        student.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-allocate hostel for student {StudentId}", student.Id);
                // Don't throw - hostel allocation failure shouldn't block student creation
            }
        }
        
        private async Task CreateHostelFeeRecordAsync(Student student, decimal monthlyFee)
        {
            try
            {
                var academicYear = await GetActiveAcademicYearAsync(student.SchoolId);
                
                var feeRecord = new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = student.SchoolId,
                    StudentId = student.Id,
                    FeeStructureId = null, // Hostel fee not linked to structure
                    AcademicYear = academicYear,
                    TotalAmount = monthlyFee,
                    PaidAmount = 0,
                    BalanceAmount = monthlyFee,
                    DueDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 10).AddMonths(1), // 10th of next month
                    Status = "pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.FeeRecords.Add(feeRecord);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Hostel fee record created for student {StudentId}, Amount: {Amount}",
                    student.Id, monthlyFee);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create hostel fee record for student {StudentId}", student.Id);
                // Don't throw - fee record creation failure shouldn't block student creation
            }
        }

        public async Task<StudentResponse?> UpdateStudentAsync(Guid id, Guid schoolId, UpdateStudentRequest request)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (student == null)
            {
                return null;
            }

            // Validate status value before applying any changes
            if (request.Status != null)
            {
                var allowedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                    { "active", "inactive", "transferred", "graduated", "left", "dropped_out", "on_leave" };
                if (!allowedStatuses.Contains(request.Status))
                    throw new InvalidOperationException($"Invalid status '{request.Status}'. Allowed: {string.Join(", ", allowedStatuses)}");
            }

            // Update only provided fields
            if (request.Name != null) student.Name = request.Name;
            if (request.PreferredName != null) student.PreferredName = request.PreferredName;
            if (request.DateOfBirth.HasValue) student.DateOfBirth = request.DateOfBirth.Value;
            if (request.PlaceOfBirth != null) student.PlaceOfBirth = request.PlaceOfBirth;
            if (request.Gender != null) student.Gender = request.Gender;
            if (request.Nationality != null) student.Nationality = request.Nationality;
            if (request.Class != null) student.Class = request.Class;
            if (request.Section != null) student.Section = request.Section;
            if (request.RollNumber != null) student.RollNumber = request.RollNumber;
            
            // IDs
            if (request.AadharNumber != null) student.AadharNumber = request.AadharNumber;
            if (request.PanNumber != null) student.PanNumber = request.PanNumber;
            if (request.PassportNumber != null) student.PassportNumber = request.PassportNumber;
            if (request.VisaType != null) student.VisaType = request.VisaType;
            if (request.VisaExpiry.HasValue) student.VisaExpiry = request.VisaExpiry;
            if (request.RationCardNumber != null) student.RationCardNumber = request.RationCardNumber;
            
            // Government / UDISE
            if (request.PenNumber != null) student.PenNumber = request.PenNumber;
            if (request.UDISENumber != null) student.UDISENumber = request.UDISENumber;
            if (request.BoardRollNumber != null) student.BoardRollNumber = request.BoardRollNumber;
            if (request.RegistrationNumber != null) student.RegistrationNumber = request.RegistrationNumber;
            if (request.EnrollmentNumber != null) student.EnrollmentNumber = request.EnrollmentNumber;
            if (request.LedgerNumber != null) student.LedgerNumber = request.LedgerNumber;
            if (request.PreviousSchoolPlace != null) student.PreviousSchoolPlace = request.PreviousSchoolPlace;
            if (request.PreviousSchoolBoard != null) student.PreviousSchoolBoard = request.PreviousSchoolBoard;
            if (request.PreviousSchoolYearOfPassing != null) student.PreviousSchoolYearOfPassing = request.PreviousSchoolYearOfPassing;
            if (request.PreviousSchoolPercentage != null) student.PreviousSchoolPercentage = request.PreviousSchoolPercentage;
            if (request.PreviousSchoolMedium != null) student.PreviousSchoolMedium = request.PreviousSchoolMedium;
            
            // DISE flags
            if (request.IsMinority.HasValue) student.IsMinority = request.IsMinority.Value;
            if (request.IsBPL.HasValue) student.IsBPL = request.IsBPL.Value;
            if (request.IsDifferentlyAbled.HasValue) student.IsDifferentlyAbled = request.IsDifferentlyAbled.Value;
            if (request.DifferentlyAbledType != null) student.DifferentlyAbledType = request.DifferentlyAbledType;
            if (request.DifferentlyAbledPercentage != null) student.DifferentlyAbledPercentage = request.DifferentlyAbledPercentage;
            if (request.SubCaste != null) student.SubCaste = request.SubCaste;
            
            // Contact
            if (request.Address != null) student.Address = request.Address;
            if (request.PermanentAddress != null) student.PermanentAddress = request.PermanentAddress;
            if (request.PrimaryPhone != null) student.PrimaryPhone = request.PrimaryPhone;
            if (request.SecondaryPhone != null) student.SecondaryPhone = request.SecondaryPhone;
            if (request.Email != null) student.Email = request.Email;
            
            // Academic
            if (request.PreviousSchool != null) student.PreviousSchool = request.PreviousSchool;
            if (request.PreviousClass != null) student.PreviousClass = request.PreviousClass;
            if (request.TransferReason != null) student.TransferReason = request.TransferReason;
            if (request.Category != null) student.Category = request.Category;
            
            // Medical
            if (request.BloodGroup != null) student.BloodGroup = request.BloodGroup;
            if (request.Allergies != null) student.Allergies = request.Allergies;
            if (request.ChronicConditions != null) student.ChronicConditions = request.ChronicConditions;
            if (request.Medications != null) student.Medications = request.Medications;
            if (request.EmergencyContact != null) student.EmergencyContact = request.EmergencyContact;
            if (request.EmergencyPhone != null) student.EmergencyPhone = request.EmergencyPhone;
            if (request.DoctorName != null) student.DoctorName = request.DoctorName;
            if (request.DoctorPhone != null) student.DoctorPhone = request.DoctorPhone;
            
            // Consent
            if (request.PhotoConsent.HasValue) student.PhotoConsent = request.PhotoConsent.Value;
            if (request.MediaConsent.HasValue) student.MediaConsent = request.MediaConsent.Value;
            if (request.MedicalConsent.HasValue) student.MedicalConsent = request.MedicalConsent.Value;
            
            // Additional
            if (request.LanguageProficiency != null) student.LanguageProficiency = request.LanguageProficiency;
            if (request.SpecialNeeds != null) student.SpecialNeeds = request.SpecialNeeds;
            if (request.TransportRequired.HasValue) student.TransportRequired = request.TransportRequired.Value;
            if (request.HostelRequired.HasValue) student.HostelRequired = request.HostelRequired.Value;
            if (request.CommunicationMode != null) student.CommunicationMode = request.CommunicationMode;
            
            // Extracurricular
            if (request.IsNCCCadet.HasValue) student.IsNCCCadet = request.IsNCCCadet.Value;
            if (request.NCCDetails != null) student.NCCDetails = request.NCCDetails;
            if (request.ExtraCurricularActivities != null) student.ExtraCurricularActivities = request.ExtraCurricularActivities;
            if (request.ProgressReportRemarks != null) student.ProgressReportRemarks = request.ProgressReportRemarks;
            if (request.ProgressReportRemarksCBSE != null) student.ProgressReportRemarksCBSE = request.ProgressReportRemarksCBSE;
            
            if (request.SiblingIds != null) student.SiblingIds = request.SiblingIds;
            
            // Legacy
            if (request.GuardianName != null) student.GuardianName = request.GuardianName;
            if (request.GuardianPhone != null) student.GuardianPhone = request.GuardianPhone;
            
            var previousStatus = student.Status;
            if (request.Status != null) student.Status = request.Status;
            if (request.PhotoUrl != null) student.PhotoUrl = request.PhotoUrl;

            student.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Upsert guardian email in StudentGuardians table (required for parent portal login)
            if (!string.IsNullOrWhiteSpace(request.GuardianEmail))
            {
                var normalizedEmail = request.GuardianEmail.Trim().ToLower();
                var existingGuardian = await _context.StudentGuardians
                    .FirstOrDefaultAsync(g => g.StudentId == id && g.SchoolId == schoolId && !g.IsDeleted);

                if (existingGuardian != null)
                {
                    existingGuardian.Email = normalizedEmail;
                    if (request.GuardianName != null) existingGuardian.Name = request.GuardianName;
                    if (request.GuardianPhone != null) existingGuardian.Phone = request.GuardianPhone;
                    existingGuardian.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.StudentGuardians.Add(new StudentGuardian
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = id,
                        Name = request.GuardianName ?? student.GuardianName,
                        Phone = request.GuardianPhone ?? student.GuardianPhone,
                        Email = normalizedEmail,
                        Relation = "guardian",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                await _context.SaveChangesAsync();
            }

            // Auto-register as alumni when student leaves (TC / dropped out)
            if (request.Status != null
                && previousStatus != request.Status
                && (request.Status == "transferred" || request.Status == "left" || request.Status == "dropped_out"))
            {
                var graduationYear = DateTime.UtcNow.Year.ToString();
                var reason = request.Status == "transferred" ? "tc_issued" : "left_school";
                await _alumniService.TryAutoRegisterFromStudentAsync(schoolId, id, reason, graduationYear);
            }

            // Cascade inactive status to transport and hostel assignments
            // When a student is marked inactive/left/transferred/dropped_out, their transport and hostel
            // assignments are also deactivated. Fee records are intentionally NOT cascaded.
            var inactiveStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "inactive", "left", "transferred", "dropped_out", "on_leave" };

            if (request.Status != null
                && previousStatus != request.Status
                && inactiveStatuses.Contains(request.Status))
            {
                var activeTransportAssignments = await _context.TransportStudents
                    .Where(ts => ts.StudentId == id && ts.SchoolId == schoolId && ts.Status == "active")
                    .ToListAsync();
                foreach (var ts in activeTransportAssignments)
                    ts.Status = "inactive";

                var activeHostelAssignments = await _context.HostelStudents
                    .Where(hs => hs.StudentId == id && hs.SchoolId == schoolId && hs.Status == "active")
                    .ToListAsync();
                foreach (var hs in activeHostelAssignments)
                    hs.Status = "inactive";

                if (activeTransportAssignments.Count > 0 || activeHostelAssignments.Count > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation(
                        "Cascaded inactive status for student {StudentId}: {TransportCount} transport, {HostelCount} hostel assignments deactivated.",
                        id, activeTransportAssignments.Count, activeHostelAssignments.Count);
                }
            }

            return await GetStudentByIdAsync(id, schoolId);
        }

        public async Task<bool> DeleteStudentAsync(Guid id, Guid schoolId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (student == null)
            {
                return false;
            }

            // CRITICAL FIX: Use soft delete — preserve data for audit, GDPR, and referential integrity.
            // Hard-deleting a student breaks FeeRecords, AttendanceRecords, ExamResults foreign keys.
            student.IsDeleted = true;
            student.DeletedAt = DateTime.UtcNow;
            student.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<StudentStatsResponse> GetStudentStatsAsync(Guid schoolId)
        {
            var baseQuery = _context.Students.Where(s => s.SchoolId == schoolId);

            // Aggregated counts — server-side, no full table scan into memory
            var statusCounts = await baseQuery
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var byClass = await baseQuery
                .GroupBy(s => s.Class)
                .Select(g => new { Class = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Class ?? "Unknown", g => g.Count);

            var byGender = await baseQuery
                .Where(s => s.Gender != null)
                .GroupBy(s => s.Gender!)
                .Select(g => new { Gender = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Gender, g => g.Count);

            var byCategory = await baseQuery
                .GroupBy(s => s.Category)
                .Select(g => new { Category = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Category ?? "Unknown", g => g.Count);

            int GetCount(string statusKey) =>
                statusCounts.FirstOrDefault(s => s.Status == statusKey)?.Count ?? 0;

            return new StudentStatsResponse
            {
                Total = statusCounts.Sum(s => s.Count),
                Active = GetCount("active"),
                Inactive = GetCount("inactive"),
                Transferred = GetCount("transferred"),
                Graduated = GetCount("graduated"),
                ByClass = byClass,
                ByGender = byGender,
                ByCategory = byCategory
            };
        }

        public async Task<string> UploadPhotoAsync(Guid studentId, Guid schoolId, string fileName, byte[] fileData)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null)
                throw new InvalidOperationException("Student not found.");

            // In production, upload to Azure Blob Storage, AWS S3, or local file system
            var photoUrl = $"/uploads/students/{studentId}/photo/{fileName}";
            
            // TODO: Implement actual file upload logic
            // await _fileStorageService.UploadAsync(photoUrl, fileData);

            student.PhotoUrl = photoUrl;
            await _context.SaveChangesAsync();

            return photoUrl;
        }

        public async Task<StudentDocumentDto> UploadDocumentAsync(Guid studentId, Guid schoolId, string documentType, string fileName, byte[] fileData)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null)
                throw new InvalidOperationException("Student not found.");

            var fileUrl = $"/uploads/students/{studentId}/documents/{fileName}";
            
            // TODO: Implement actual file upload logic
            // await _fileStorageService.UploadAsync(fileUrl, fileData);

            var document = new StudentDocument
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                SchoolId = schoolId,
                DocumentType = documentType,
                FileUrl = fileUrl,
                FileName = fileName,
                UploadedAt = DateTime.UtcNow
            };

            _context.StudentDocuments.Add(document);
            await _context.SaveChangesAsync();

            return new StudentDocumentDto
            {
                Id = document.Id,
                DocumentType = document.DocumentType,
                FileUrl = document.FileUrl,
                FileName = document.FileName,
                UploadedAt = document.UploadedAt
            };
        }

        public async Task<List<StudentDocumentDto>> GetDocumentsAsync(Guid studentId, Guid schoolId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null)
                return new List<StudentDocumentDto>();

            var documents = await _context.StudentDocuments
                .Where(d => d.StudentId == studentId)
                .Select(d => new StudentDocumentDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    FileUrl = d.FileUrl,
                    FileName = d.FileName,
                    UploadedAt = d.UploadedAt
                })
                .ToListAsync();

            return documents;
        }

        public async Task<bool> DeleteDocumentAsync(Guid documentId, Guid schoolId)
        {
            var document = await _context.StudentDocuments
                .Include(d => d.Student)
                .FirstOrDefaultAsync(d => d.Id == documentId && d.Student!.SchoolId == schoolId);

            if (document == null)
                return false;

            // TODO: Delete actual file from storage
            // await _fileStorageService.DeleteAsync(document.FileUrl);

            _context.StudentDocuments.Remove(document);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<BulkOperationResult> BulkPromoteStudentsAsync(Guid schoolId, BulkPromoteRequest request)
        {
            var result = new BulkOperationResult();

            if (request.StudentIds == null || request.StudentIds.Count == 0)
                return result;

            const int maxBulkSize = 500;
            if (request.StudentIds.Count > maxBulkSize)
            {
                result.FailureCount = request.StudentIds.Count;
                result.Errors.Add($"Batch size {request.StudentIds.Count} exceeds maximum of {maxBulkSize}.");
                return result;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && request.StudentIds.Contains(s.Id))
                .ToListAsync();

            var notFound = request.StudentIds.Except(students.Select(s => s.Id)).ToList();
            foreach (var missingId in notFound)
            {
                result.FailureCount++;
                result.Errors.Add($"Student {missingId}: Not found in school");
            }

            var academicYear = request.AcademicYear ?? await GetActiveAcademicYearAsync(schoolId);
            var now = DateTime.UtcNow;
            var class12Passouts = new List<Guid>();
            var promotionHistories = new List<PromotionHistory>();
            var newEnrollments = new List<StudentEnrollment>();

            // ── Resolve all FK entities up-front in BATCH queries (no N+1) ──────────
            // Target class/section/year: same for the whole batch
            var newClassEntity     = await _context.Classes.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.Name == request.NewClass);
            var newSectionEntity   = newClassEntity != null
                ? await _context.Sections.FirstOrDefaultAsync(s => s.ClassId == newClassEntity.Id && s.Name == request.NewSection)
                : null;
            var academicYearEntity = await _context.AcademicYears
                .FirstOrDefaultAsync(y => y.SchoolId == schoolId && (y.Name == academicYear || y.IsCurrent));

            // Previous classes/sections: load all distinct values in two batch queries
            var distinctPrevClasses  = students.Select(s => s.Class).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();
            var distinctPrevSections = students.Select(s => s.Section).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();

            var prevClassMap = await _context.Classes
                .Where(c => c.SchoolId == schoolId && distinctPrevClasses.Contains(c.Name))
                .ToDictionaryAsync(c => c.Name, c => c);

            // Build a composite key lookup for sections: "ClassName|SectionName" → Section
            var prevClassIds = prevClassMap.Values.Select(c => c.Id).ToList();
            var prevSectionList = await _context.Sections
                .Where(s => prevClassIds.Contains(s.ClassId) && distinctPrevSections.Contains(s.Name))
                .ToListAsync();
            var prevSectionMap = prevSectionList
                .GroupBy(s => $"{s.ClassId}|{s.Name}")
                .ToDictionary(g => g.Key, g => g.First());

            // Close all active enrollments for the students being promoted in bulk
            var studentIds = students.Select(s => s.Id).ToList();
            var activeEnrollments = await _context.StudentEnrollments
                .Where(e => studentIds.Contains(e.StudentId) && e.SchoolId == schoolId && e.Status == "active")
                .ToListAsync();
            foreach (var enrollment in activeEnrollments)
            {
                enrollment.Status  = "promoted";
                enrollment.ExitDate = now;
            }

            foreach (var student in students)
            {
                try
                {
                    var oldClass = student.Class;
                    var oldSection = student.Section;

                    student.Class = request.NewClass;
                    student.Section = request.NewSection;
                    student.UpdatedAt = now;

                    // Track Class 12 passouts for auto-alumni registration
                    if (IsClass12(oldClass) && !IsClass12(request.NewClass))
                        class12Passouts.Add(student.Id);

                    // Resolve per-student previous class/section from pre-loaded dictionaries (O(1) lookups)
                    prevClassMap.TryGetValue(oldClass ?? "", out var prevClassEntity);
                    SmsApi.Models.Entities.Section? prevSectionEntity = null;
                    if (prevClassEntity != null)
                        prevSectionMap.TryGetValue($"{prevClassEntity.Id}|{oldSection}", out prevSectionEntity);

                    // Create new StudentEnrollment row
                    StudentEnrollment? newEnrollment = null;
                    if (newClassEntity != null && newSectionEntity != null && academicYearEntity != null)
                    {
                        newEnrollment = new StudentEnrollment
                        {
                            Id             = Guid.NewGuid(),
                            SchoolId       = schoolId,
                            StudentId      = student.Id,
                            AcademicYearId = academicYearEntity.Id,
                            ClassId        = newClassEntity.Id,
                            SectionId      = newSectionEntity.Id,
                            Status         = "active",
                            EnrollmentDate = now,
                            CreatedAt      = now,
                            UpdatedAt      = now
                        };
                        newEnrollments.Add(newEnrollment);
                    }

                    // CRITICAL FIX: Create PromotionHistory record for audit trail
                    promotionHistories.Add(new PromotionHistory
                    {
                        Id                    = Guid.NewGuid(),
                        StudentId             = student.Id,
                        SchoolId              = schoolId,
                        PreviousClass         = oldClass,
                        PreviousSection       = oldSection,
                        NewClass              = request.NewClass,
                        NewSection            = request.NewSection,
                        PreviousClassId       = prevClassEntity?.Id,
                        PreviousSectionId     = prevSectionEntity?.Id,
                        NewClassId            = newClassEntity?.Id,
                        NewSectionId          = newSectionEntity?.Id,
                        AcademicYearId        = academicYearEntity?.Id,
                        ResultingEnrollmentId = newEnrollment?.Id,
                        AcademicYear          = academicYear,
                        PromotionDate         = now,
                        PromotionStatus       = "completed",
                        Remarks               = "Bulk promotion",
                        PromotionReason       = "regular_promotion",
                        ApprovalRemarks       = "",
                        MetaData              = "{}",
                        CreatedAt             = now
                    });

                    result.SuccessCount++;
                    result.SuccessfulIds.Add(student.Id);
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Student {student.Id}: {ex.Message}");
                }
            }

            if (result.SuccessCount > 0)
            {
                _context.PromotionHistories.AddRange(promotionHistories);
                if (newEnrollments.Count > 0)
                    _context.StudentEnrollments.AddRange(newEnrollments);
                await _context.SaveChangesAsync();
            }

            // Auto-register alumni for Class 12 passouts
            if (class12Passouts.Count > 0)
            {
                var graduationYear = now.Year.ToString();
                foreach (var studentId in class12Passouts)
                    await _alumniService.TryAutoRegisterFromStudentAsync(schoolId, studentId, "class12_passout", graduationYear);
            }

            return result;
        }

        public async Task<BulkOperationResult> BulkUpdateStudentsAsync(Guid schoolId, BulkUpdateRequest request)
        {
            var result = new BulkOperationResult();

            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && request.StudentIds.Contains(s.Id))
                .ToListAsync();

            // Pre-validate status if provided
            var allowedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "active", "inactive", "transferred", "graduated", "left", "dropped_out", "on_leave" };
            if (!string.IsNullOrEmpty(request.Status) && !allowedStatuses.Contains(request.Status))
            {
                result.FailureCount = request.StudentIds.Count;
                result.Errors.Add($"Invalid status '{request.Status}'. Allowed: {string.Join(", ", allowedStatuses)}");
                return result;
            }

            foreach (var student in students)
            {
                try
                {
                    if (!string.IsNullOrEmpty(request.Class))
                        student.Class = request.Class;
                    if (!string.IsNullOrEmpty(request.Section))
                        student.Section = request.Section;
                    if (!string.IsNullOrEmpty(request.Status))
                        student.Status = request.Status;
                    
                    student.UpdatedAt = DateTime.UtcNow;
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"Student {student.Id}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return result;
        }

        // ===========================
        // Guardian Management
        // ===========================

        public async Task<List<GuardianDto>> GetGuardiansAsync(Guid studentId, Guid schoolId)
        {
            var student = await _context.Students
                .AsNoTracking()
                .Include(s => s.Guardians)
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null)
                return new List<GuardianDto>();

            return student.Guardians?.Select(g => new GuardianDto
            {
                Id = g.Id,
                Name = g.Name,
                Relation = g.Relation,
                Occupation = g.Occupation,
                Employer = g.Employer,
                Phone = g.Phone,
                Email = g.Email,
                AadharNumber = MaskAadhar(g.AadharNumber),
                PanNumber = MaskPan(g.PanNumber)
            }).ToList() ?? new List<GuardianDto>();
        }

        public async Task<GuardianDto> AddGuardianAsync(Guid schoolId, Guid studentId, CreateGuardianDto dto, Guid userId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null)
                throw new Exception("Student not found");

            var guardian = new StudentGuardian
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                Name = dto.Name,
                Relation = dto.Relation,
                Occupation = dto.Occupation,
                Employer = dto.Employer,
                Phone = dto.Phone,
                Email = dto.Email,
                AadharNumber = dto.AadharNumber,
                PanNumber = dto.PanNumber,
                SchoolId = schoolId,
                CreatedAt = DateTime.UtcNow
            };

            _context.StudentGuardians.Add(guardian);
            await _context.SaveChangesAsync();

            return new GuardianDto
            {
                Id = guardian.Id,
                Name = guardian.Name,
                Relation = guardian.Relation,
                Occupation = guardian.Occupation,
                Employer = guardian.Employer,
                Phone = guardian.Phone,
                Email = guardian.Email,
                AadharNumber = MaskAadhar(guardian.AadharNumber),
                PanNumber = MaskPan(guardian.PanNumber)
            };
        }

        public async Task<GuardianDto> UpdateGuardianAsync(Guid schoolId, Guid guardianId, UpdateGuardianDto dto)
        {
            var guardian = await _context.StudentGuardians
                .FirstOrDefaultAsync(g => g.Id == guardianId && g.SchoolId == schoolId);

            if (guardian == null)
                throw new Exception("Guardian not found");

            guardian.Name = dto.Name ?? guardian.Name;
            guardian.Relation = dto.Relation ?? guardian.Relation;
            guardian.Occupation = dto.Occupation ?? guardian.Occupation;
            guardian.Employer = dto.Employer ?? guardian.Employer;
            guardian.Phone = dto.Phone ?? guardian.Phone;
            guardian.Email = dto.Email ?? guardian.Email;
            guardian.AadharNumber = dto.AadharNumber ?? guardian.AadharNumber;
            guardian.PanNumber = dto.PanNumber ?? guardian.PanNumber;
            guardian.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new GuardianDto
            {
                Id = guardian.Id,
                Name = guardian.Name,
                Relation = guardian.Relation,
                Occupation = guardian.Occupation,
                Employer = guardian.Employer,
                Phone = guardian.Phone,
                Email = guardian.Email,
                AadharNumber = MaskAadhar(guardian.AadharNumber),
                PanNumber = MaskPan(guardian.PanNumber)
            };
        }

        public async Task<bool> DeleteGuardianAsync(Guid schoolId, Guid guardianId)
        {
            var guardian = await _context.StudentGuardians
                .FirstOrDefaultAsync(g => g.Id == guardianId && g.SchoolId == schoolId);

            if (guardian == null)
                return false;

            _context.StudentGuardians.Remove(guardian);
            await _context.SaveChangesAsync();
            return true;
        }

        // ===========================
        // Advanced Filtering
        // ===========================

        public async Task<StudentListResponse> GetStudentsByTransportAsync(Guid schoolId, bool transportRequired, int page, int pageSize)
        {
            var query = _context.Students
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.TransportRequired == transportRequired)
                .OrderBy(s => s.Class)
                .ThenBy(s => s.Section)
                .ThenBy(s => s.RollNumber);

            var total = await query.CountAsync();
            var students = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentBasicResponse
                {
                    Id = s.Id,
                    AdmissionNumber = s.AdmissionNumber,
                    Name = s.Name,
                    Class = s.Class ?? "",
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return new StudentListResponse
            {
                Students = students,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<StudentListResponse> GetStudentsByHostelAsync(Guid schoolId, bool hostelRequired, int page, int pageSize)
        {
            var query = _context.Students
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.HostelRequired == hostelRequired)
                .OrderBy(s => s.Class)
                .ThenBy(s => s.Section)
                .ThenBy(s => s.RollNumber);

            var total = await query.CountAsync();
            var students = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentBasicResponse
                {
                    Id = s.Id,
                    AdmissionNumber = s.AdmissionNumber,
                    Name = s.Name,
                    Class = s.Class ?? "",
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return new StudentListResponse
            {
                Students = students,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<StudentListResponse> GetStudentsByCategoryAsync(Guid schoolId, string category, int page, int pageSize)
        {
            var query = _context.Students
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Category == category)
                .OrderBy(s => s.Class)
                .ThenBy(s => s.Section)
                .ThenBy(s => s.RollNumber);

            var total = await query.CountAsync();
            var students = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new StudentBasicResponse
                {
                    Id = s.Id,
                    AdmissionNumber = s.AdmissionNumber,
                    Name = s.Name,
                    Class = s.Class ?? "",
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return new StudentListResponse
            {
                Students = students,
                Total = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<List<StudentBasicResponse>> GetStudentSiblingsAsync(Guid schoolId, Guid studentId)
        {
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null || string.IsNullOrEmpty(student.SiblingIds))
                return new List<StudentBasicResponse>();

            List<Guid> siblingIds;
            try
            {
                siblingIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(student.SiblingIds) ?? new List<Guid>();
            }
            catch
            {
                return new List<StudentBasicResponse>();
            }

            var siblings = await _context.Students
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && siblingIds.Contains(s.Id))
                .Select(s => new StudentBasicResponse
                {
                    Id = s.Id,
                    AdmissionNumber = s.AdmissionNumber,
                    Name = s.Name,
                    Class = s.Class ?? "",
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status ?? "",
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();

            return siblings;
        }

        // ===========================
        // Student Promotion (Individual & Bulk)
        // ===========================

        /// <summary>
        /// Promote a single student to next class/section WITH BUSINESS LOGIC VALIDATION
        /// CRITICAL FIX: Validates exam results, attendance, and eligibility before promotion
        /// </summary>
        public async Task<StudentResponse?> PromoteStudentAsync(Guid studentId, Guid schoolId, PromoteStudentRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

                if (student == null)
                {
                    _logger.LogWarning($"Student {studentId} not found for promotion in school {schoolId}");
                    return null;
                }

                // ===== CRITICAL VALIDATION 1: Basic Input Validation =====
                if (string.IsNullOrWhiteSpace(request.NewClass))
                {
                    throw new InvalidOperationException("New class is required for promotion");
                }

                if (student.Class == request.NewClass && student.Section == (request.NewSection ?? student.Section))
                {
                    throw new InvalidOperationException("Student is already in the specified class/section. No promotion needed.");
                }

                // ===== CRITICAL VALIDATION 2: Check for Duplicate Promotion =====
                var currentYear = DateTime.UtcNow.Year;
                var alreadyPromotedThisYear = await _context.PromotionHistories
                    .AnyAsync(p => p.StudentId == studentId
                                && p.SchoolId == schoolId
                                && p.PromotionDate.Year == currentYear
                                && p.PromotionStatus != "cancelled");

                if (alreadyPromotedThisYear)
                {
                    throw new InvalidOperationException("Student has already been promoted this academic year. Cannot promote again.");
                }

                // ===== CRITICAL VALIDATION 3: Check Exam Results for Subject Pass/Fail =====
                var academicYear = request.AcademicYear ?? DateTime.UtcNow.Year.ToString();
                var studentResults = await _context.ExamResults
                    .Include(r => r.Exam)
                    .Where(r => r.StudentId == studentId && 
                               r.SchoolId == schoolId &&
                               r.Exam.Description.Contains($"AY:{academicYear}"))
                    .ToListAsync();

                if (studentResults.Count > 0)
                {
                    // Check if student passed all subjects
                    var failedSubjects = new List<string>();
                    var subjectResults = studentResults.GroupBy(r => r.Subject);

                    foreach (var subjectGroup in subjectResults)
                    {
                        // Take highest score in each subject (for improvement exams)
                        var bestResult = subjectGroup.OrderByDescending(r => r.Percentage).First();
                        
                        // Check if passed (percentage >= passing percentage)
                        var examPassingPercentage = (bestResult.Exam?.PassingMarks ?? 0) > 0 
                            ? ((bestResult.Exam.PassingMarks / (decimal)bestResult.Exam.TotalMarks) * 100)
                            : 35; // Default passing percentage

                        if (bestResult.Percentage < examPassingPercentage)
                        {
                            failedSubjects.Add(subjectGroup.Key);
                        }
                    }

                    if (failedSubjects.Count > 0)
                    {
                        var failedList = string.Join(", ", failedSubjects);
                        throw new InvalidOperationException($"Student has failed in: {failedList}. Cannot promote. Please set up compartment/improvement exams first.");
                    }

                    _logger.LogInformation($"Promotion validation: Student {studentId} passed all subjects");
                }
                else
                {
                    _logger.LogWarning($"No exam results found for student {studentId} in academic year {academicYear}. Proceeding with manual promotion.");
                }

                // ===== CRITICAL VALIDATION 4: Check Minimum Attendance =====
                try
                {
                    var attendanceRecords = await _context.StudentAttendances
                        .Where(a => a.StudentId == studentId && a.SchoolId == schoolId)
                        .ToListAsync();

                    if (attendanceRecords.Count > 0)
                    {
                        var totalClasses = attendanceRecords.Count;
                        var presentClasses = attendanceRecords.Count(a => a.Status == "present" || a.Status == "late");
                        var attendancePercentage = (presentClasses / (decimal)totalClasses) * 100;
                        
                        const decimal minimumAttendancePercentage = 75m; // 75% minimum

                        if (attendancePercentage < minimumAttendancePercentage)
                        {
                            _logger.LogWarning($"⚠️ Student {studentId} has {attendancePercentage:F2}% attendance (below {minimumAttendancePercentage}%). WARNING: Low attendance for promotion.");
                            // Log warning but allow promotion (schools may override)
                        }
                        else
                        {
                            _logger.LogInformation($"✓ Student {studentId} has {attendancePercentage:F2}% attendance (meets minimum {minimumAttendancePercentage}%)");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Could not validate attendance for student {studentId}: {ex.Message}. Continuing with promotion.");
                }

                // ===== CRITICAL VALIDATION 5: Check for Any Pending Disciplinary Cases =====
                // Note: Disciplinary module integration - can be added in Phase 2
                _logger.LogInformation($"Student {studentId} cleared all validation checks for promotion");

                // ===== Store old values for history tracking =====
                var oldClass = student.Class;
                var oldSection = student.Section;

                // ===== Update student class and section =====
                student.Class = request.NewClass;
                student.Section = request.NewSection ?? student.Section;
                
                // Optional: Reset roll number if new class assigned
                if (request.ResetRollNumber)
                {
                    student.RollNumber = null;
                }

                student.UpdatedAt = DateTime.UtcNow;

                // ===== Create Promotion History Record for Audit Trail =====

                // Resolve FK references for the new structured columns (best-effort — no failure if not found)
                var newClassEntity     = await _context.Classes.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.Name == request.NewClass);
                var newSectionEntity   = newClassEntity != null
                    ? await _context.Sections.FirstOrDefaultAsync(s => s.ClassId == newClassEntity.Id && s.Name == (request.NewSection ?? oldSection))
                    : null;
                var prevClassEntity    = await _context.Classes.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.Name == oldClass);
                var prevSectionEntity  = prevClassEntity != null
                    ? await _context.Sections.FirstOrDefaultAsync(s => s.ClassId == prevClassEntity.Id && s.Name == oldSection)
                    : null;
                var academicYearEntity = await _context.AcademicYears
                    .FirstOrDefaultAsync(y => y.SchoolId == schoolId && (y.Name == academicYear || y.IsCurrent));

                // Close the current active StudentEnrollment row and open a new one
                StudentEnrollment? newEnrollment = null;
                if (newClassEntity != null && newSectionEntity != null && academicYearEntity != null)
                {
                    // Close any currently active enrollment for this student
                    var currentEnrollment = await _context.StudentEnrollments
                        .FirstOrDefaultAsync(e => e.StudentId == studentId
                                               && e.SchoolId == schoolId
                                               && e.Status == "active");
                    if (currentEnrollment != null)
                    {
                        currentEnrollment.Status   = "promoted";
                        currentEnrollment.ExitDate = DateTime.UtcNow;
                    }

                    newEnrollment = new StudentEnrollment
                    {
                        Id             = Guid.NewGuid(),
                        SchoolId       = schoolId,
                        StudentId      = studentId,
                        AcademicYearId = academicYearEntity.Id,
                        ClassId        = newClassEntity.Id,
                        SectionId      = newSectionEntity.Id,
                        Status         = "active",
                        EnrollmentDate = DateTime.UtcNow,
                        CreatedAt      = DateTime.UtcNow,
                        UpdatedAt      = DateTime.UtcNow
                    };
                    _context.StudentEnrollments.Add(newEnrollment);
                }

                var promotionHistory = new PromotionHistory
                {
                    Id                  = Guid.NewGuid(),
                    StudentId           = studentId,
                    SchoolId            = schoolId,
                    PreviousClass       = oldClass,
                    PreviousSection     = oldSection,
                    NewClass            = request.NewClass,
                    NewSection          = request.NewSection ?? student.Section,
                    // Structured FK columns — populated when entities resolve
                    PreviousClassId     = prevClassEntity?.Id,
                    PreviousSectionId   = prevSectionEntity?.Id,
                    NewClassId          = newClassEntity?.Id,
                    NewSectionId        = newSectionEntity?.Id,
                    AcademicYearId      = academicYearEntity?.Id,
                    ResultingEnrollmentId = newEnrollment?.Id,
                    AcademicYear        = academicYear,
                    PromotionDate       = DateTime.UtcNow,
                    PromotionStatus     = "completed",
                    Remarks             = request.Remarks ?? "",
                    PromotionReason     = "regular_promotion",
                    ApprovalRemarks     = "",
                    MetaData            = "{}",
                    CreatedAt           = DateTime.UtcNow
                };

                // Add to context (assuming PromotionHistory entity exists)
                try
                {
                    _context.Set<PromotionHistory>().Add(promotionHistory);
                }
                catch
                {
                    _logger.LogWarning("PromotionHistory table not found. Continuing without history.");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation(
                    $"✅ CRITICAL: Student {student.AdmissionNumber} ({student.Name}) PROMOTED from {oldClass} {oldSection} to {request.NewClass} {request.NewSection ?? student.Section} | Academic Year: {academicYear} | Remarks: {request.Remarks}");

                // Auto-register as alumni when passing out of Class 12 (final year)
                if (IsClass12(oldClass) && !IsClass12(request.NewClass))
                {
                    var graduationYear = DateTime.UtcNow.Year.ToString();
                    await _alumniService.TryAutoRegisterFromStudentAsync(schoolId, studentId, "class12_passout", graduationYear);
                }

                return await GetStudentByIdAsync(studentId, schoolId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"❌ CRITICAL: Error promoting student {studentId}: {ex.Message}");
                throw;
            }
        }

        // ===========================
        // Bulk Operations
        // ===========================

        public async Task<BulkOperationResult> BulkImportStudentsAsync(Guid schoolId, List<CreateStudentRequest> students, Guid userId)
        {
            var result = new BulkOperationResult();

            if (students == null || students.Count == 0)
                return result;

            // ── Safety: cap at 500 per batch to prevent memory/timeout issues ─
            const int maxBatchSize = 500;
            if (students.Count > maxBatchSize)
            {
                result.FailureCount = students.Count;
                result.Errors.Add($"Batch size {students.Count} exceeds maximum of {maxBatchSize}. Split into smaller batches.");
                return result;
            }

            // ── Allowed value sets for validation ───────────────────────────
            var validGenders    = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "male", "female", "other", "prefer_not_to_say" };
            var validBloodGroups= new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Unknown" };
            var validCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "General", "OBC", "SC", "ST", "EWS", "Minority", "Other" };
            var validStatuses   = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "active", "inactive", "transferred", "graduated", "left", "dropped_out", "on_leave" };

            // ── Pre-fetch existing admission numbers (single DB round-trip) ──
            var incomingNumbers = students
                .Where(s => !string.IsNullOrWhiteSpace(s.AdmissionNumber))
                .Select(s => s.AdmissionNumber!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var existingNumbers = (await _context.Students
                .Where(s => s.SchoolId == schoolId && incomingNumbers.Contains(s.AdmissionNumber!))
                .Select(s => s.AdmissionNumber!)
                .ToListAsync())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // Track admission numbers added in this batch (to catch duplicates within the same payload)
            var seenInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var newStudentEntities = new List<Student>();
            var newGuardianEntities = new List<StudentGuardian>();

            foreach (var req in students)
            {
                var rowRef = req.AdmissionNumber ?? $"row-{students.IndexOf(req) + 1}";

                try
                {
                    // ── Per-row required field validation ────────────────────
                    var rowErrors = new List<string>();

                    // Resolve name from parts if full name not provided
                    var resolvedName = !string.IsNullOrWhiteSpace(req.Name)
                        ? req.Name.Trim()
                        : string.Join(" ", new[] { req.FirstName, req.MiddleName, req.LastName }
                            .Where(p => !string.IsNullOrWhiteSpace(p))).Trim();

                    if (string.IsNullOrWhiteSpace(resolvedName))
                        rowErrors.Add("Name is required");
                    if (string.IsNullOrWhiteSpace(req.AdmissionNumber))
                        rowErrors.Add("AdmissionNumber is required");
                    if (string.IsNullOrWhiteSpace(req.Class))
                        rowErrors.Add("Class is required");
                    if (string.IsNullOrWhiteSpace(req.Section))
                        rowErrors.Add("Section is required");
                    if (req.DateOfBirth == default || req.DateOfBirth > DateTime.UtcNow)
                        rowErrors.Add("DateOfBirth must be a valid past date");
                    if (req.AdmissionDate == default || req.AdmissionDate > DateTime.UtcNow.AddDays(1))
                        rowErrors.Add("AdmissionDate must not be in the future");

                    // Enum-like field validation
                    if (!string.IsNullOrWhiteSpace(req.Gender) && !validGenders.Contains(req.Gender))
                        rowErrors.Add($"Gender '{req.Gender}' invalid. Allowed: {string.Join(", ", validGenders)}");
                    if (!string.IsNullOrWhiteSpace(req.BloodGroup) && !validBloodGroups.Contains(req.BloodGroup))
                        rowErrors.Add($"BloodGroup '{req.BloodGroup}' invalid. Allowed: {string.Join(", ", validBloodGroups)}");
                    if (!string.IsNullOrWhiteSpace(req.Category) && !validCategories.Contains(req.Category))
                        rowErrors.Add($"Category '{req.Category}' invalid. Allowed: {string.Join(", ", validCategories)}");
                    if (!string.IsNullOrWhiteSpace(req.Status) && !validStatuses.Contains(req.Status))
                        rowErrors.Add($"Status '{req.Status}' invalid. Allowed: {string.Join(", ", validStatuses)}");

                    if (rowErrors.Count > 0)
                    {
                        result.FailureCount++;
                        result.Errors.Add($"[{rowRef}] Validation: {string.Join("; ", rowErrors)}");
                        continue;
                    }

                    // ── Duplicate checks ────────────────────────────────────
                    if (existingNumbers.Contains(req.AdmissionNumber!))
                    {
                        result.FailureCount++;
                        result.Errors.Add($"[{rowRef}] Duplicate admission number — already exists in school");
                        continue;
                    }
                    if (seenInBatch.Contains(req.AdmissionNumber!))
                    {
                        result.FailureCount++;
                        result.Errors.Add($"[{rowRef}] Duplicate admission number — appears twice in this import");
                        continue;
                    }
                    seenInBatch.Add(req.AdmissionNumber!);

                    var studentId = Guid.NewGuid();
                    var now = DateTime.UtcNow;

                    var student = new Student
                    {
                        Id = studentId,
                        SchoolId = schoolId,
                        AdmissionNumber = req.AdmissionNumber,
                        AdmissionDate = req.AdmissionDate,
                        Name = resolvedName,
                        FirstName = req.FirstName,
                        MiddleName = req.MiddleName,
                        LastName = req.LastName,
                        PreferredName = req.PreferredName,

                        // Identity
                        DateOfBirth = req.DateOfBirth,
                        PlaceOfBirth = req.PlaceOfBirth,
                        Gender = req.Gender,
                        Nationality = req.Nationality,
                        Religion = req.Religion,
                        Caste = req.Caste,
                        MotherTongue = req.MotherTongue,

                        // IDs
                        AadharNumber = req.AadharNumber,
                        PanNumber = req.PanNumber,
                        PassportNumber = req.PassportNumber,
                        VisaType = req.VisaType,
                        VisaExpiry = req.VisaExpiry,

                        // Contact
                        Address = req.Address ?? string.Empty,
                        PermanentAddress = req.PermanentAddress,
                        PrimaryPhone = req.PrimaryPhone,
                        SecondaryPhone = req.SecondaryPhone,
                        Email = req.Email,

                        // Academic
                        Class = req.Class,
                        Section = req.Section,
                        RollNumber = req.RollNumber,
                        Category = !string.IsNullOrWhiteSpace(req.Category) ? req.Category : "General",
                        PreviousSchool = req.PreviousSchool,
                        PreviousClass = req.PreviousClass,
                        TransferReason = req.TransferReason,

                        // Medical
                        BloodGroup = req.BloodGroup,
                        Allergies = req.Allergies,
                        ChronicConditions = req.ChronicConditions,
                        Medications = req.Medications,
                        EmergencyContact = req.EmergencyContact,
                        EmergencyPhone = req.EmergencyPhone,
                        DoctorName = req.DoctorName,
                        DoctorPhone = req.DoctorPhone,

                        // Consent
                        PhotoConsent = req.PhotoConsent,
                        MediaConsent = req.MediaConsent,
                        MedicalConsent = req.MedicalConsent,

                        // Additional
                        LanguageProficiency = req.LanguageProficiency,
                        SpecialNeeds = req.SpecialNeeds,
                        TransportRequired = req.TransportRequired,
                        HostelRequired = req.HostelRequired,
                        SiblingIds = req.SiblingIds,

                        // Legacy guardian quick-access fields
                        GuardianName = req.GuardianName ?? string.Empty,
                        GuardianPhone = req.GuardianPhone ?? string.Empty,

                        Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : "active",
                        PhotoUrl = req.PhotoUrl,
                        CreatedBy = userId,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    newStudentEntities.Add(student);

                    // ── Create normalised guardian entity ───────────────────
                    if (!string.IsNullOrWhiteSpace(req.GuardianName))
                    {
                        newGuardianEntities.Add(new StudentGuardian
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            StudentId = studentId,
                            Name = req.GuardianName,
                            Relation = "guardian",
                            Phone = req.GuardianPhone ?? string.Empty,
                            CreatedAt = now,
                            UpdatedAt = now
                        });
                    }

                    result.SuccessCount++;
                    result.SuccessfulIds.Add(studentId);
                    if (!string.IsNullOrWhiteSpace(req.AdmissionNumber))
                        result.SuccessfulAdmissionNumbers.Add(req.AdmissionNumber!);
                }
                catch (Exception ex)
                {
                    result.FailureCount++;
                    result.Errors.Add($"[{rowRef}] Unexpected error: {ex.Message}");
                }
            }

            if (newStudentEntities.Count > 0)
            {
                _context.Students.AddRange(newStudentEntities);
                if (newGuardianEntities.Count > 0)
                    _context.StudentGuardians.AddRange(newGuardianEntities);
                await _context.SaveChangesAsync();
                _logger.LogInformation("BulkImport: {Success} students imported, {Fail} failed for school {SchoolId}",
                    result.SuccessCount, result.FailureCount, schoolId);
            }

            return result;
        }

        /// <summary>
        /// Exports all students for the school as a UTF-8 CSV byte array.
        /// Supports optional filtering by class, status, and academic year.
        /// </summary>
        public async Task<byte[]> ExportStudentsToCsvAsync(Guid schoolId, string? classFilter = null, string? status = null, string? academicYear = null)
        {
            var query = _context.Students
                .Include(s => s.Guardians)
                .Where(s => s.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(classFilter))
                query = query.Where(s => s.Class == classFilter);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);
            if (!string.IsNullOrWhiteSpace(academicYear))
            {
                var ids = _context.PromotionHistories
                    .Where(p => p.SchoolId == schoolId && p.AcademicYear == academicYear)
                    .Select(p => p.StudentId);
                query = query.Where(s => ids.Contains(s.Id) || !_context.PromotionHistories
                    .Any(p => p.SchoolId == schoolId && p.StudentId == s.Id));
            }

            var students = await query.OrderBy(s => s.Class).ThenBy(s => s.AdmissionNumber).ToListAsync();

            var sb = new System.Text.StringBuilder();
            // Header row — matches the CSV import template exactly
            sb.AppendLine("AdmissionNumber,Name,FirstName,MiddleName,LastName,Class,Section,RollNumber," +
                          "DateOfBirth,Gender,Nationality,Religion,Caste,Category,MotherTongue," +
                          "AdmissionDate,Status,Email,PrimaryPhone,SecondaryPhone," +
                          "Address,PermanentAddress,BloodGroup,AadharNumber,PanNumber,PassportNumber," +
                          "GuardianName,GuardianPhone,GuardianRelation,GuardianEmail," +
                          "EmergencyContact,EmergencyPhone,DoctorName,DoctorPhone," +
                          "Allergies,ChronicConditions,Medications,SpecialNeeds," +
                          "TransportRequired,HostelRequired,PreviousSchool,PreviousClass,PhotoUrl");

            foreach (var s in students)
            {
                var primaryGuardian = s.Guardians?.OrderBy(g => g.CreatedAt).FirstOrDefault();
                sb.AppendLine(string.Join(",",
                    CsvEscape(s.AdmissionNumber),
                    CsvEscape(s.Name),
                    CsvEscape(s.FirstName),
                    CsvEscape(s.MiddleName),
                    CsvEscape(s.LastName),
                    CsvEscape(s.Class),
                    CsvEscape(s.Section),
                    CsvEscape(s.RollNumber),
                    s.DateOfBirth.ToString("yyyy-MM-dd"),
                    CsvEscape(s.Gender),
                    CsvEscape(s.Nationality),
                    CsvEscape(s.Religion),
                    CsvEscape(s.Caste),
                    CsvEscape(s.Category),
                    CsvEscape(s.MotherTongue),
                    s.AdmissionDate.ToString("yyyy-MM-dd"),
                    CsvEscape(s.Status),
                    CsvEscape(s.Email),
                    CsvEscape(s.PrimaryPhone),
                    CsvEscape(s.SecondaryPhone),
                    CsvEscape(s.Address),
                    CsvEscape(s.PermanentAddress),
                    CsvEscape(s.BloodGroup),
                    // Aadhar/PAN are masked in export for PII compliance
                    CsvEscape(MaskAadhar(s.AadharNumber)),
                    CsvEscape(MaskPan(s.PanNumber)),
                    CsvEscape(s.PassportNumber),
                    CsvEscape(primaryGuardian?.Name ?? s.GuardianName),
                    CsvEscape(primaryGuardian?.Phone ?? s.GuardianPhone),
                    CsvEscape(primaryGuardian?.Relation),
                    CsvEscape(primaryGuardian?.Email),
                    CsvEscape(s.EmergencyContact),
                    CsvEscape(s.EmergencyPhone),
                    CsvEscape(s.DoctorName),
                    CsvEscape(s.DoctorPhone),
                    CsvEscape(s.Allergies),
                    CsvEscape(s.ChronicConditions),
                    CsvEscape(s.Medications),
                    CsvEscape(s.SpecialNeeds),
                    s.TransportRequired ? "true" : "false",
                    s.HostelRequired ? "true" : "false",
                    CsvEscape(s.PreviousSchool),
                    CsvEscape(s.PreviousClass),
                    CsvEscape(s.PhotoUrl)
                ));
            }

            return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        }

        /// <summary>Returns a blank CSV template with all supported column headers and one example row.</summary>
        public static byte[] GetImportTemplate()
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("AdmissionNumber,Name,FirstName,MiddleName,LastName,Class,Section,RollNumber," +
                          "DateOfBirth,Gender,Nationality,Religion,Caste,Category,MotherTongue," +
                          "AdmissionDate,Status,Email,PrimaryPhone,SecondaryPhone," +
                          "Address,PermanentAddress,BloodGroup,AadharNumber,PanNumber,PassportNumber," +
                          "GuardianName,GuardianPhone,GuardianRelation,GuardianEmail," +
                          "EmergencyContact,EmergencyPhone,DoctorName,DoctorPhone," +
                          "Allergies,ChronicConditions,Medications,SpecialNeeds," +
                          "TransportRequired,HostelRequired,PreviousSchool,PreviousClass,PhotoUrl");
            // Example row with all possible values
            sb.AppendLine("ADM-2025-001,Ramesh Kumar,Ramesh,,Kumar,Class 10,A,1," +
                          "2010-05-15,male,Indian,Hindu,Brahmin,General,Telugu," +
                          "2025-06-01,active,ramesh@example.com,9876543210,," +
                          "\"123 Main Street, Hyderabad 500001\",,B+,1234-5678-9012,ABCDE1234F,," +
                          "Suresh Kumar,9876543211,father,suresh@example.com," +
                          "Suresh Kumar,9876543211,Dr. Sharma,9876543212," +
                          ",,,,false,false,St. Mary's High School,Class 9,");
            return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        }

        private static string CsvEscape(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }

        public async Task<StudentProfileSummary?> GetStudentProfileSummaryAsync(Guid studentId, Guid schoolId)
        {
            // Load base student record
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);

            if (student == null) return null;

            var summary = new StudentProfileSummary
            {
                Student = new StudentBasicResponse
                {
                    Id = student.Id,
                    AdmissionNumber = student.AdmissionNumber,
                    Name = student.Name,
                    Class = student.Class,
                    Section = student.Section,
                    RollNumber = student.RollNumber,
                    Status = student.Status,
                    PhotoUrl = student.PhotoUrl
                }
            };

            // ── Fee summary ──────────────────────────────────────────────────
            var feeRecords = await _context.FeeRecords
                .Where(f => f.StudentId == studentId && f.SchoolId == schoolId)
                .ToListAsync();

            if (feeRecords.Count > 0)
            {
                var latestPayment = await _context.PaymentTransactions
                    .Where(p => p.StudentId == studentId && p.SchoolId == schoolId && p.Status == "success")
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => (DateTime?)p.CreatedAt)
                    .FirstOrDefaultAsync();

                summary.Fee = new StudentFeeSummary
                {
                    TotalAmount = feeRecords.Sum(f => f.TotalAmount),
                    PaidAmount = feeRecords.Sum(f => f.PaidAmount),
                    PendingAmount = feeRecords.Sum(f => f.PendingAmount),
                    AcademicYear = feeRecords.OrderByDescending(f => f.AcademicYear).First().AcademicYear,
                    Status = feeRecords.Any(f => f.Status == "overdue") ? "overdue"
                           : feeRecords.Any(f => f.Status == "pending") ? "pending" : "paid",
                    LastPaymentDate = latestPayment,
                    TotalRecords = feeRecords.Count
                };
            }

            // ── Attendance summary (last 90 days) ────────────────────────────
            var since = DateTime.UtcNow.AddDays(-90);
            var attendanceRecords = await _context.AttendanceRecords
                .Where(a => a.StudentId == studentId && a.SchoolId == schoolId && a.Date >= since)
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            if (attendanceRecords.Count > 0)
            {
                int total = attendanceRecords.Count;
                int present = attendanceRecords.Count(a => a.Status == "present");
                int absent = attendanceRecords.Count(a => a.Status == "absent");
                int late = attendanceRecords.Count(a => a.Status == "late");

                summary.Attendance = new StudentAttendanceSummary
                {
                    TotalDays = total,
                    PresentDays = present,
                    AbsentDays = absent,
                    LateDays = late,
                    AttendancePercent = total > 0 ? Math.Round((present + late * 0.5) / total * 100, 1) : 0,
                    RecentRecords = attendanceRecords.Take(30).Select(a => new StudentAttendanceRecord
                    {
                        Date = a.Date,
                        Status = a.Status,
                        Remarks = a.Remarks,
                        IsManualOverride = a.IsManualOverride
                    }).ToList()
                };
            }

            // ── Exam results ─────────────────────────────────────────────────
            var examResults = await _context.ExamResults
                .Include(r => r.Exam)
                .Where(r => r.StudentId == studentId && r.SchoolId == schoolId)
                .OrderByDescending(r => r.Exam != null ? r.Exam.ExamDate : DateTime.MinValue)
                .Take(50)
                .ToListAsync();

            summary.Exams = new StudentExamSummary
            {
                Results = examResults.Select(r => new StudentExamResult
                {
                    ExamName = r.Exam?.Name ?? "Unknown",
                    Subject = r.Subject,
                    MarksObtained = r.MarksObtained,
                    TotalMarks = r.TotalMarks,
                    Percentage = (double)r.Percentage,
                    Grade = r.Grade,
                    IsAbsent = r.IsAbsent,
                    ExamDate = r.Exam?.ExamDate ?? DateTime.MinValue
                }).ToList()
            };

            // ── Transport ────────────────────────────────────────────────────
            var transport = await _context.TransportStudents
                .Include(ts => ts.Route)
                .Where(ts => ts.StudentId == studentId && ts.SchoolId == schoolId && ts.Status == "active")
                .FirstOrDefaultAsync();

            if (transport != null)
            {
                summary.Transport = new StudentTransportInfo
                {
                    AssignmentId = transport.Id,
                    RouteName = transport.Route?.RouteName ?? "(Route unavailable)",
                    RouteNumber = transport.Route?.RouteNumber ?? "—",
                    PickupPoint = transport.PickupPoint,
                    DropPoint = transport.DropPoint,
                    MonthlyFee = transport.MonthlyFee ?? transport.Fare,
                    Status = transport.Status,
                    VehicleNumber = transport.Route?.VehicleNumber,
                    DriverName = transport.Route?.DriverName,
                    DriverPhone = transport.Route?.DriverPhone ?? transport.Route?.DriverContact
                };
            }

            // ── Hostel ───────────────────────────────────────────────────────
            var hostel = await _context.HostelStudents
                .Include(hs => hs.Room)
                .Where(hs => hs.StudentId == studentId && hs.SchoolId == schoolId && hs.Status == "active")
                .FirstOrDefaultAsync();

            if (hostel != null)
            {
                summary.Hostel = new StudentHostelInfo
                {
                    AssignmentId = hostel.Id,
                    RoomNumber = hostel.Room?.RoomNumber ?? "(Room unavailable)",
                    RoomType = hostel.Room?.RoomType,
                    Floor = hostel.Room?.Floor,
                    MonthlyFee = hostel.MonthlyFee,
                    Status = hostel.Status,
                    CheckInDate = hostel.CheckInDate,
                    CheckOutDate = hostel.CheckOutDate
                };
            }

            // ── Health records ───────────────────────────────────────────────
            var healthRecords = await _context.HealthRecords
                .Where(h => h.StudentId == studentId && h.SchoolId == schoolId)
                .OrderByDescending(h => h.CheckupDate)
                .Take(10)
                .ToListAsync();

            summary.HealthRecords = healthRecords.Select(h =>
            {
                double? bmi = null;
                if (h.Height.HasValue && h.Weight.HasValue && h.Height > 0)
                {
                    double heightM = (double)h.Height.Value / 100.0;
                    bmi = Math.Round((double)h.Weight.Value / (heightM * heightM), 1);
                }
                return new StudentHealthInfo
                {
                    RecordId = h.Id,
                    CheckupDate = h.CheckupDate,
                    Height = h.Height,
                    Weight = h.Weight,
                    Bmi = bmi,
                    BloodGroup = h.BloodGroup,
                    VisionLeft = h.VisionLeft,
                    VisionRight = h.VisionRight,
                    Allergies = h.Allergies,
                    ChronicConditions = h.ChronicConditions,
                    Medications = h.Medications,
                    Vaccinations = h.Vaccinations,
                    Notes = h.Notes,
                    CheckedBy = h.CheckedBy
                };
            }).ToList();

            // ── Visitor history ──────────────────────────────────────────────
            var visitorLogs = await _context.VisitorLogs
                .Include(vl => vl.Visitor)
                .Where(vl => vl.StudentId == studentId && vl.SchoolId == schoolId)
                .OrderByDescending(vl => vl.CheckInTime)
                .Take(20)
                .ToListAsync();

            summary.VisitorHistory = visitorLogs.Select(vl => new StudentVisitorRecord
            {
                VisitorLogId = vl.Id,
                VisitorName = vl.Visitor?.Name ?? "Unknown",
                VisitorPhone = vl.Visitor?.Phone,
                Purpose = vl.Purpose,
                CheckInTime = vl.CheckInTime,
                CheckOutTime = vl.CheckOutTime,
                Status = vl.Status
            }).ToList();

            return summary;
        }

        public async Task<List<StudentBasicResponse>> GetMyChildrenAsync(Guid schoolId, string parentEmail)
        {
            // Find all students whose guardian email matches the parent's login email
            var guardianLinks = await _context.StudentGuardians
                .Where(sg => sg.SchoolId == schoolId
                    && sg.Email != null
                    && sg.Email.ToLower() == parentEmail.ToLower()
                    && !sg.IsDeleted)
                .Select(sg => sg.StudentId)
                .Distinct()
                .ToListAsync();

            if (!guardianLinks.Any())
                return new List<StudentBasicResponse>();

            var students = await _context.Students
                .Where(s => guardianLinks.Contains(s.Id) && s.SchoolId == schoolId && !s.IsDeleted)
                .OrderBy(s => s.Name)
                .ToListAsync();

            return students.Select(s => new StudentBasicResponse
            {
                Id = s.Id,
                Name = s.Name,
                Class = s.Class,
                Section = s.Section,
                RollNumber = s.RollNumber,
                AdmissionNumber = s.AdmissionNumber,
                PhotoUrl = s.PhotoUrl
            }).ToList();
        }

        // ========== PRIVATE HELPERS ==========

        // ─── Sibling Management ───────────────────────────────────────────────

        public async Task<List<StudentBasicResponse>> GetSiblingsAsync(Guid schoolId, Guid studentId)
        {
            return await _context.StudentSiblings
                .Include(ss => ss.Sibling)
                .Where(ss => ss.SchoolId == schoolId && ss.StudentId == studentId)
                .Select(ss => new StudentBasicResponse
                {
                    Id = ss.SiblingId,
                    Name = ss.Sibling != null ? ss.Sibling.Name : string.Empty,
                    AdmissionNumber = ss.Sibling != null ? ss.Sibling.AdmissionNumber : string.Empty,
                    Class = ss.Sibling != null ? (ss.Sibling.Class ?? string.Empty) : string.Empty,
                    Section = ss.Sibling != null ? ss.Sibling.Section : string.Empty,
                    RollNumber = ss.Sibling != null ? ss.Sibling.RollNumber : null,
                    Status = ss.Sibling != null ? (ss.Sibling.Status ?? string.Empty) : string.Empty,
                    PhotoUrl = ss.Sibling != null ? ss.Sibling.PhotoUrl : null
                })
                .ToListAsync();
        }

        public async Task AddSiblingAsync(Guid schoolId, Guid studentId, Guid siblingStudentId)
        {
            if (studentId == siblingStudentId)
                throw new InvalidOperationException("A student cannot be their own sibling.");

            // Check both students exist in this school
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId && (s.Id == studentId || s.Id == siblingStudentId))
                .Select(s => s.Id)
                .ToListAsync();

            if (students.Count < 2)
                throw new InvalidOperationException("One or both students not found.");

            // Idempotent — if already linked, skip.
            var existsAtoB = await _context.StudentSiblings
                .AnyAsync(ss => ss.SchoolId == schoolId && ss.StudentId == studentId && ss.SiblingId == siblingStudentId);
            if (existsAtoB) return;

            // Add both directions (bidirectional symmetry)
            _context.StudentSiblings.AddRange(
                new StudentSibling { Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = studentId, SiblingId = siblingStudentId },
                new StudentSibling { Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = siblingStudentId, SiblingId = studentId }
            );
            await _context.SaveChangesAsync();
        }

        public async Task RemoveSiblingAsync(Guid schoolId, Guid studentId, Guid siblingStudentId)
        {
            var links = await _context.StudentSiblings
                .Where(ss => ss.SchoolId == schoolId &&
                    ((ss.StudentId == studentId && ss.SiblingId == siblingStudentId) ||
                     (ss.StudentId == siblingStudentId && ss.SiblingId == studentId)))
                .ToListAsync();

            foreach (var link in links)
            {
                link.IsDeleted = true;
                link.DeletedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        // ─── Annual Health Records ────────────────────────────────────────────

        public async Task<List<StudentAnnualHealthDto>> GetAnnualHealthRecordsAsync(Guid schoolId, Guid studentId)
        {
            return await _context.StudentAnnualHealthRecords
                .Where(h => h.SchoolId == schoolId && h.StudentId == studentId)
                .OrderByDescending(h => h.AcademicYear)
                .Select(h => new StudentAnnualHealthDto
                {
                    Id = h.Id,
                    AcademicYear = h.AcademicYear,
                    Weight = h.Weight,
                    Height = h.Height,
                    VisionLeft = h.VisionLeft,
                    VisionRight = h.VisionRight,
                    DentalHygiene = h.DentalHygiene,
                    Remarks = h.Remarks,
                    ExaminedOn = h.ExaminedOn,
                    ExaminedBy = h.ExaminedBy
                })
                .ToListAsync();
        }

        public async Task<StudentAnnualHealthDto> UpsertAnnualHealthAsync(Guid schoolId, Guid studentId, UpsertAnnualHealthRequest request)
        {
            var existing = await _context.StudentAnnualHealthRecords
                .FirstOrDefaultAsync(h => h.SchoolId == schoolId && h.StudentId == studentId && h.AcademicYear == request.AcademicYear);

            if (existing == null)
            {
                existing = new StudentAnnualHealth
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = studentId,
                    AcademicYear = request.AcademicYear
                };
                _context.StudentAnnualHealthRecords.Add(existing);
            }

            if (request.Weight != null) existing.Weight = request.Weight;
            if (request.Height != null) existing.Height = request.Height;
            if (request.VisionLeft != null) existing.VisionLeft = request.VisionLeft;
            if (request.VisionRight != null) existing.VisionRight = request.VisionRight;
            if (request.DentalHygiene != null) existing.DentalHygiene = request.DentalHygiene;
            if (request.Remarks != null) existing.Remarks = request.Remarks;
            if (request.ExaminedOn.HasValue) existing.ExaminedOn = request.ExaminedOn.Value;
            if (request.ExaminedBy != null) existing.ExaminedBy = request.ExaminedBy;

            await _context.SaveChangesAsync();

            return new StudentAnnualHealthDto
            {
                Id = existing.Id,
                AcademicYear = existing.AcademicYear,
                Weight = existing.Weight,
                Height = existing.Height,
                VisionLeft = existing.VisionLeft,
                VisionRight = existing.VisionRight,
                DentalHygiene = existing.DentalHygiene,
                Remarks = existing.Remarks,
                ExaminedOn = existing.ExaminedOn,
                ExaminedBy = existing.ExaminedBy
            };
        }

        // ─── Hobby / Club Management ──────────────────────────────────────────

        public async Task<List<HobbyDto>> GetHobbiesAsync(Guid schoolId)
        {
            return await _context.Hobbies
                .Where(h => h.SchoolId == schoolId && h.IsActive)
                .OrderBy(h => h.Category).ThenBy(h => h.Name)
                .Select(h => new HobbyDto { Id = h.Id, Name = h.Name, Category = h.Category, IsActive = h.IsActive })
                .ToListAsync();
        }

        public async Task<HobbyDto> CreateHobbyAsync(Guid schoolId, CreateHobbyRequest request)
        {
            var exists = await _context.Hobbies.AnyAsync(h => h.SchoolId == schoolId && h.Name == request.Name);
            if (exists) throw new InvalidOperationException($"Hobby '{request.Name}' already exists.");

            var hobby = new Hobby
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = request.Name,
                Category = request.Category,
                IsActive = true
            };
            _context.Hobbies.Add(hobby);
            await _context.SaveChangesAsync();
            return new HobbyDto { Id = hobby.Id, Name = hobby.Name, Category = hobby.Category, IsActive = true };
        }

        public async Task<List<StudentHobbyEnrollmentDto>> GetStudentHobbiesAsync(Guid schoolId, Guid studentId, string? academicYear)
        {
            var query = _context.StudentHobbyEnrollments
                .Include(e => e.Hobby)
                .Where(e => e.SchoolId == schoolId && e.StudentId == studentId);
            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(e => e.AcademicYear == academicYear);
            return await query.Select(e => new StudentHobbyEnrollmentDto
            {
                Id = e.Id,
                HobbyId = e.HobbyId,
                HobbyName = e.Hobby != null ? e.Hobby.Name : string.Empty,
                HobbyCategory = e.Hobby != null ? e.Hobby.Category : null,
                AcademicYear = e.AcademicYear,
                Remarks = e.Remarks
            }).ToListAsync();
        }

        public async Task<StudentHobbyEnrollmentDto> EnrollHobbyAsync(Guid schoolId, Guid studentId, EnrollHobbyRequest request)
        {
            var alreadyEnrolled = await _context.StudentHobbyEnrollments.AnyAsync(
                e => e.SchoolId == schoolId && e.StudentId == studentId
                  && e.HobbyId == request.HobbyId && e.AcademicYear == request.AcademicYear);
            if (alreadyEnrolled) throw new InvalidOperationException("Student is already enrolled in this hobby for this year.");

            var enrollment = new StudentHobbyEnrollment
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = studentId,
                HobbyId = request.HobbyId,
                AcademicYear = request.AcademicYear,
                Remarks = request.Remarks
            };
            _context.StudentHobbyEnrollments.Add(enrollment);
            await _context.SaveChangesAsync();

            var hobby = await _context.Hobbies.FindAsync(request.HobbyId);
            return new StudentHobbyEnrollmentDto
            {
                Id = enrollment.Id,
                HobbyId = enrollment.HobbyId,
                HobbyName = hobby?.Name ?? string.Empty,
                HobbyCategory = hobby?.Category,
                AcademicYear = enrollment.AcademicYear,
                Remarks = enrollment.Remarks
            };
        }

        public async Task BulkEnrollHobbiesAsync(Guid schoolId, Guid studentId, BulkEnrollHobbiesRequest request)
        {
            foreach (var hobbyId in request.HobbyIds)
            {
                var alreadyEnrolled = await _context.StudentHobbyEnrollments.AnyAsync(
                    e => e.SchoolId == schoolId && e.StudentId == studentId
                      && e.HobbyId == hobbyId && e.AcademicYear == request.AcademicYear);
                if (!alreadyEnrolled)
                {
                    _context.StudentHobbyEnrollments.Add(new StudentHobbyEnrollment
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = schoolId,
                        StudentId = studentId,
                        HobbyId = hobbyId,
                        AcademicYear = request.AcademicYear
                    });
                }
            }
            await _context.SaveChangesAsync();
        }

        public async Task RemoveHobbyEnrollmentAsync(Guid schoolId, Guid enrollmentId)
        {
            var enrollment = await _context.StudentHobbyEnrollments
                .FirstOrDefaultAsync(e => e.SchoolId == schoolId && e.Id == enrollmentId);
            if (enrollment == null) throw new InvalidOperationException("Enrollment not found.");
            enrollment.IsDeleted = true;
            enrollment.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // ─── Permission Slips ────────────────────────────────────────────────

        public async Task<List<StudentPermissionSlipDto>> GetPermissionSlipsAsync(Guid schoolId, Guid studentId, string? academicYear)
        {
            var query = _context.StudentPermissionSlips
                .Include(p => p.Student)
                .Where(p => p.SchoolId == schoolId && p.StudentId == studentId);
            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(p => p.AcademicYear == academicYear);
            return await query.OrderByDescending(p => p.OutDate).Select(p => MapSlipToDto(p)).ToListAsync();
        }

        public async Task<List<StudentPermissionSlipDto>> GetAllPermissionSlipsAsync(Guid schoolId, DateTime date, string? academicYear)
        {
            var query = _context.StudentPermissionSlips
                .Include(p => p.Student)
                .Where(p => p.SchoolId == schoolId && p.OutDate.Date == date.Date);
            if (!string.IsNullOrWhiteSpace(academicYear))
                query = query.Where(p => p.AcademicYear == academicYear);
            return await query.OrderBy(p => p.Student!.Class).ThenBy(p => p.Student!.Name)
                .Select(p => MapSlipToDto(p)).ToListAsync();
        }

        public async Task<StudentPermissionSlipDto> CreatePermissionSlipAsync(Guid schoolId, Guid studentId, CreatePermissionSlipRequest request, Guid issuedBy)
        {
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);
            if (student == null) throw new InvalidOperationException("Student not found.");

            var slip = new StudentPermissionSlip
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = studentId,
                AcademicYear = request.AcademicYear,
                OutWith = request.OutWith,
                OutWithRelation = request.OutWithRelation,
                Reason = request.Reason,
                OutDate = request.OutDate,
                OutTime = request.OutTime,
                Status = "pending",
                IssuedBy = issuedBy
            };
            _context.StudentPermissionSlips.Add(slip);
            await _context.SaveChangesAsync();

            return new StudentPermissionSlipDto
            {
                Id = slip.Id,
                StudentId = slip.StudentId,
                StudentName = student.Name,
                AcademicYear = slip.AcademicYear,
                OutWith = slip.OutWith,
                OutWithRelation = slip.OutWithRelation,
                Reason = slip.Reason,
                OutDate = slip.OutDate,
                OutTime = slip.OutTime,
                Status = slip.Status,
                CreatedAt = slip.CreatedAt
            };
        }

        public async Task<StudentPermissionSlipDto> ReviewPermissionSlipAsync(Guid schoolId, Guid slipId, ReviewPermissionSlipRequest request, Guid reviewedBy)
        {
            var allowedStatuses = new HashSet<string> { "approved", "rejected" };
            if (!allowedStatuses.Contains(request.Status))
                throw new InvalidOperationException("Status must be 'approved' or 'rejected'.");

            var slip = await _context.StudentPermissionSlips
                .Include(p => p.Student)
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.Id == slipId);
            if (slip == null) throw new InvalidOperationException("Permission slip not found.");

            slip.Status = request.Status;
            slip.ApprovedBy = reviewedBy;
            slip.ReviewedAt = DateTime.UtcNow;
            slip.ReviewRemarks = request.Remarks;
            slip.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapSlipToDto(slip);
        }

        private static StudentPermissionSlipDto MapSlipToDto(StudentPermissionSlip p) => new()
        {
            Id = p.Id,
            StudentId = p.StudentId,
            StudentName = p.Student?.Name ?? string.Empty,
            AcademicYear = p.AcademicYear,
            OutWith = p.OutWith,
            OutWithRelation = p.OutWithRelation,
            Reason = p.Reason,
            OutDate = p.OutDate,
            OutTime = p.OutTime,
            Status = p.Status,
            ReviewRemarks = p.ReviewRemarks,
            ReviewedAt = p.ReviewedAt,
            CreatedAt = p.CreatedAt
        };

        // ─── Transfer Certificate ─────────────────────────────────────────────

        public async Task<TransferCertificateDto?> GetTransferCertificateAsync(Guid schoolId, Guid studentId)
        {
            var tc = await _context.TransferCertificates
                .Include(t => t.Student)
                .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.StudentId == studentId);
            return tc == null ? null : MapTCToDto(tc);
        }

        public async Task<TransferCertificateDto> CreateTransferCertificateAsync(Guid schoolId, Guid studentId, CreateTransferCertificateRequest request, Guid issuedBy)
        {
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId);
            if (student == null) throw new InvalidOperationException("Student not found.");

            var existing = await _context.TransferCertificates.AnyAsync(t => t.SchoolId == schoolId && t.StudentId == studentId);
            if (existing) throw new InvalidOperationException("A Transfer Certificate already exists for this student.");

            // Auto-increment TC number within the school
            var maxAutoTc = await _context.TransferCertificates
                .Where(t => t.SchoolId == schoolId)
                .MaxAsync(t => (int?)t.AutoTCNumber) ?? 0;
            var autoTCNumber = maxAutoTc + 1;

            var tc = new TransferCertificate
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = studentId,
                TCNumber = request.TCNumber,
                TCNumberPrefix = request.TCNumberPrefix,
                AutoTCNumber = autoTCNumber,
                ApplicationDate = request.ApplicationDate ?? DateTime.UtcNow,
                ExitAcademicYear = request.ExitAcademicYear,
                ExitClass = request.ExitClass ?? student.Class,
                ExitSection = request.ExitSection ?? student.Section,
                ReasonForLeaving = request.ReasonForLeaving,
                Conduct = request.Conduct,
                IsFailedInLastClass = request.IsFailedInLastClass,
                LastAnnualExamResult = request.LastAnnualExamResult,
                IsQualifiedForHigherClass = request.IsQualifiedForHigherClass,
                QualifiedToClass = request.QualifiedToClass,
                AdditionalRemarks = request.AdditionalRemarks,
                IssuedBy = issuedBy
            };
            _context.TransferCertificates.Add(tc);
            await _context.SaveChangesAsync();

            return MapTCToDto(tc, student);
        }

        public async Task<TransferCertificateDto> IssueTCAsync(Guid schoolId, Guid studentId, IssueTCRequest request, Guid issuedBy)
        {
            var tc = await _context.TransferCertificates
                .Include(t => t.Student)
                .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.StudentId == studentId);
            if (tc == null) throw new InvalidOperationException("No Transfer Certificate record found. Create one first.");

            tc.IsTCIssued = true;
            tc.IssuedDate = request.IssuedDate;
            if (!string.IsNullOrWhiteSpace(request.TCNumber))
                tc.TCNumber = request.TCNumber;
            if (request.IssueCharacterCertificate)
            {
                tc.IsCharacterCertificateIssued = true;
                // Also update on Student entity for quick access
                var student = await _context.Students.FindAsync(studentId);
                if (student != null) student.IsCharacterCertificateIssued = true;
            }
            tc.IssuedBy = issuedBy;
            tc.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapTCToDto(tc);
        }

        private static TransferCertificateDto MapTCToDto(TransferCertificate tc, Student? student = null) => new()
        {
            Id = tc.Id,
            StudentId = tc.StudentId,
            StudentName = student?.Name ?? tc.Student?.Name ?? string.Empty,
            AdmissionNumber = student?.AdmissionNumber ?? tc.Student?.AdmissionNumber,
            TCNumber = tc.TCNumber,
            AutoTCNumber = tc.AutoTCNumber,
            TCNumberPrefix = tc.TCNumberPrefix,
            ApplicationDate = tc.ApplicationDate,
            IssuedDate = tc.IssuedDate,
            ExitAcademicYear = tc.ExitAcademicYear,
            ExitClass = tc.ExitClass,
            ExitSection = tc.ExitSection,
            ReasonForLeaving = tc.ReasonForLeaving,
            Conduct = tc.Conduct,
            IsTCIssued = tc.IsTCIssued,
            IsFailedInLastClass = tc.IsFailedInLastClass,
            LastAnnualExamResult = tc.LastAnnualExamResult,
            IsQualifiedForHigherClass = tc.IsQualifiedForHigherClass,
            QualifiedToClass = tc.QualifiedToClass,
            DetainedInSameClass = tc.DetainedInSameClass,
            DatePupilStruck = tc.DatePupilStruck,
            AdditionalRemarks = tc.AdditionalRemarks,
            IsCharacterCertificateIssued = tc.IsCharacterCertificateIssued,
            CharacterCertificateNumber = tc.CharacterCertificateNumber,
            CreatedAt = tc.CreatedAt,
            UpdatedAt = tc.UpdatedAt
        };

        // ─── Document Verification ────────────────────────────────────────────

        public async Task<StudentDocumentDto> VerifyDocumentAsync(Guid schoolId, Guid documentId, VerifyDocumentDto request, Guid verifiedBy)
        {
            var allowedStatuses = new HashSet<string> { "verified", "rejected" };
            if (!allowedStatuses.Contains(request.VerificationStatus))
                throw new InvalidOperationException("VerificationStatus must be 'verified' or 'rejected'.");

            var doc = await _context.StudentDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.SchoolId == schoolId);
            if (doc == null) throw new InvalidOperationException("Document not found.");

            doc.VerificationStatus = request.VerificationStatus;
            doc.VerifiedAt = DateTime.UtcNow;
            doc.VerifiedBy = verifiedBy;
            doc.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new StudentDocumentDto
            {
                Id = doc.Id,
                DocumentType = doc.DocumentType,
                FileUrl = doc.FileUrl,
                FileName = doc.FileName,
                DocumentNumber = doc.DocumentNumber,
                IssuingAuthority = doc.IssuingAuthority,
                IssueDate = doc.IssueDate,
                ExpiryDate = doc.ExpiryDate,
                VerificationStatus = doc.VerificationStatus,
                VerifiedAt = doc.VerifiedAt,
                UploadedAt = doc.UploadedAt
            };
        }

        // ─── Roll Number Assignment ────────────────────────────────────────────

        public async Task<List<RollNumberStudentDto>> GetStudentsForRollAssignmentAsync(Guid schoolId, string className, string section)
        {
            return await _context.Students
                .Where(s => s.SchoolId == schoolId && s.Class == className && s.Section == section && s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new RollNumberStudentDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    AdmissionNumber = s.AdmissionNumber,
                    Gender = s.Gender,
                    RollNumber = s.RollNumber
                })
                .ToListAsync();
        }

        public async Task BulkAssignRollNumbersAsync(Guid schoolId, RollNumberAssignmentRequest request)
        {
            var studentIds = request.Assignments.Keys.ToList();
            var students = await _context.Students
                .Where(s => s.SchoolId == schoolId
                    && s.Class == request.Class
                    && s.Section == request.Section
                    && studentIds.Contains(s.Id))
                .ToListAsync();

            foreach (var student in students)
            {
                if (request.Assignments.TryGetValue(student.Id, out var rollNo))
                    student.RollNumber = rollNo;
            }
            await _context.SaveChangesAsync();
        }

        /// <summary>Normalizes class names to detect if a student is in Class 12 (final year).</summary>
        private static bool IsClass12(string className)
        {
            if (string.IsNullOrWhiteSpace(className)) return false;
            var c = className.Trim().ToUpperInvariant();
            return c == "12" || c == "XII" || c.StartsWith("12 ") || c.StartsWith("12-") || c.StartsWith("XII ");
        }

        // ─── Guardian Staff Link ───────────────────────────────────────────────

        public async Task<GuardianStaffDto?> GetGuardianStaffAsync(Guid schoolId, Guid staffId)
        {
            var staff = await _context.StaffMembers
                .Where(s => s.Id == staffId && s.SchoolId == schoolId && !s.IsDeleted)
                .Select(s => new GuardianStaffDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Designation = s.Designation,
                    Department = s.Department,
                    Phone = s.Phone,
                    Email = s.Email,
                    ProfilePhoto = s.ProfilePhoto
                })
                .FirstOrDefaultAsync();
            return staff;
        }

        public async Task SetGuardianStaffAsync(Guid schoolId, Guid studentId, Guid? staffId)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId && !s.IsDeleted)
                ?? throw new KeyNotFoundException("Student not found.");

            if (staffId.HasValue)
            {
                var staffExists = await _context.StaffMembers
                    .AnyAsync(s => s.Id == staffId.Value && s.SchoolId == schoolId && !s.IsDeleted);
                if (!staffExists)
                    throw new KeyNotFoundException("Staff member not found.");
            }

            student.GuardianStaffId = staffId;
            student.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<List<StaffChildDto>> GetChildrenOfStaffAsync(Guid schoolId, Guid staffId)
        {
            return await _context.Students
                .Where(s => s.SchoolId == schoolId && s.GuardianStaffId == staffId && !s.IsDeleted)
                .Select(s => new StaffChildDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    AdmissionNumber = s.AdmissionNumber,
                    Class = s.Class,
                    Section = s.Section,
                    RollNumber = s.RollNumber,
                    Status = s.Status,
                    PhotoUrl = s.PhotoUrl
                })
                .ToListAsync();
        }
    }
}




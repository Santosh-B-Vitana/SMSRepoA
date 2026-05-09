using System;
using System.Collections.Generic;
using System.Linq;
using SmsApi.Models.DTOs;

namespace SmsApi.Services.Migration
{
    // ─── v1 Source DTOs ──────────────────────────────────────────────────────
    // These represent the raw JSON/EF objects returned by the v1 SQL Server database.
    // Field names mirror the v1 entity columns exactly so this mapper has zero ambiguity.

    public sealed class V1Student
    {
        public int    Id                  { get; set; }
        public string? AdmissionNo        { get; set; }
        public string? FirstName          { get; set; }
        public string? LastName           { get; set; }
        public string? MiddleName         { get; set; }
        public DateTime? DateOfBirth      { get; set; }
        public string? Gender             { get; set; }   // "M" / "F" / "Other"
        public string? BloodGroup         { get; set; }   // "A+" / "B-" etc.
        public string? Address            { get; set; }
        public string? City               { get; set; }
        public string? State              { get; set; }
        public string? PinCode            { get; set; }
        public string? MobileNumber       { get; set; }
        public string? EmailId            { get; set; }
        public string? Nationality        { get; set; }
        public string? Religion           { get; set; }
        public string? Category           { get; set; }   // "GEN" / "SC" / "ST" / "OBC"
        public string? Caste              { get; set; }
        public string? MotherTongue       { get; set; }
        public string? AadharNo           { get; set; }   // 12-digit, raw
        public string? BirthCertificateNo { get; set; }
        public string? PassportNo         { get; set; }
        public string? RationCardNo       { get; set; }
        public string? PENNumber          { get; set; }
        public decimal? Height            { get; set; }
        public decimal? Weight            { get; set; }
        public string? Allergies          { get; set; }
        public string? SpecialNeeds       { get; set; }
        public string? EmergencyContact   { get; set; }
        public string? EmergencyContactNo { get; set; }
        public bool   IsActive            { get; set; } = true;
        public bool   IsLeft              { get; set; }
        public DateTime? LeftDate         { get; set; }
        public DateTime? AdmissionDate    { get; set; }
        public string? GRNumber           { get; set; }   // General Register number
        public string? SRNumber           { get; set; }   // Serial Register number
        public bool   TransportRequired   { get; set; }
        public bool   HostelRequired      { get; set; }
        public string? BusRoute           { get; set; }
        public string? BusStop            { get; set; }
        public string? PreviousSchool     { get; set; }
        public string? PreviousClass      { get; set; }
        public string? TCReason           { get; set; }
    }

    public sealed class V1StudentOfficialInfo
    {
        public int    StudentId      { get; set; }
        public int    AcademicYearId { get; set; }
        public string? AcademicYear  { get; set; }  // e.g. "2024-25"
        public string? ClassName     { get; set; }  // e.g. "Class 10"
        public string? SectionName   { get; set; }  // e.g. "A"
        public string? RollNo        { get; set; }
        public int    AcademicStatus { get; set; }  // 1=Promoted, 2=Detained, 0=Active
    }

    public sealed class V1Guardian
    {
        public int    Id           { get; set; }
        public int    StudentId    { get; set; }
        public string? Name        { get; set; }
        public string? Relation    { get; set; }   // "Father" / "Mother" / "Guardian"
        public string? MobileNo    { get; set; }
        public string? EmailId     { get; set; }
        public string? Occupation  { get; set; }
        public string? AadharNo    { get; set; }
        public string? PAN         { get; set; }
        public decimal? AnnualIncome { get; set; }
        public bool   IsPrimary    { get; set; }
    }

    public sealed class V1Document
    {
        public int    Id             { get; set; }
        public int    StudentId      { get; set; }
        public string? DocumentType  { get; set; }
        public string? DocumentNo    { get; set; }
        public string? FileName      { get; set; }
        public bool   IsVerified     { get; set; }
    }

    public sealed class V1TransferCertificate
    {
        public int    StudentId           { get; set; }
        public string? TCNumber           { get; set; }
        public string? TCNumberPrefix     { get; set; }
        public int?   AutoTCNumber        { get; set; }
        public DateTime? ApplicationDate  { get; set; }
        public DateTime? IssuedDate       { get; set; }
        public string? ExitClass          { get; set; }
        public string? ExitSection        { get; set; }
        public string? ExitAcademicYear   { get; set; }
        public string? ReasonForLeaving   { get; set; }
        public string? Conduct            { get; set; }
        public bool   IsFailedInLastClass { get; set; }
        public string? LastAnnualExamResult { get; set; }
        public bool   IsQualifiedForHigherClass { get; set; }
        public string? QualifiedToClass   { get; set; }
        public bool   IsTCIssued          { get; set; }
        public string? AdditionalRemarks  { get; set; }
    }

    // ─── Migration Mapper ────────────────────────────────────────────────────

    /// <summary>
    /// Maps v1 (SQL Server / .NET Framework 4.x) student entities to v2
    /// (PostgreSQL / .NET 8) CreateStudentRequest DTOs.
    ///
    /// This mapper is intentionally pure (no I/O, no DI) so it can be
    /// unit tested in isolation and reused in both the CLI migration tool
    /// and a REST import endpoint.
    ///
    /// Usage:
    ///   var mapper   = new V1StudentMigrationMapper(schoolId);
    ///   var requests = mapper.MapStudents(v1Students, v1OfficialInfos);
    ///   var result   = await studentService.BulkImportStudentsAsync(schoolId, requests, adminId);
    /// </summary>
    public sealed class V1StudentMigrationMapper
    {
        private readonly Guid _targetSchoolId;

        // Field normalisation tables
        private static readonly Dictionary<string, string> GenderMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["M"] = "male", ["Male"] = "male", ["F"] = "female", ["Female"] = "female",
            ["Other"] = "other", ["O"] = "other",
        };

        private static readonly Dictionary<string, string> BloodGroupMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["A+"] = "A+", ["A-"] = "A-", ["B+"] = "B+", ["B-"] = "B-",
            ["AB+"] = "AB+", ["AB-"] = "AB-", ["O+"] = "O+", ["O-"] = "O-",
        };

        private static readonly Dictionary<string, string> CategoryMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["GEN"] = "General", ["GENERAL"] = "General",
            ["SC"]  = "SC",  ["ST"] = "ST",
            ["OBC"] = "OBC", ["EWS"] = "EWS",
        };

        private static readonly Dictionary<string, string> RelationMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Father"] = "father", ["Mother"] = "mother",
            ["Guardian"] = "guardian", ["Brother"] = "brother",
            ["Sister"] = "sister", ["Uncle"] = "uncle", ["Aunt"] = "aunt",
        };

        public V1StudentMigrationMapper(Guid targetSchoolId)
        {
            _targetSchoolId = targetSchoolId;
        }

        // ── Primary entry points ─────────────────────────────────────────────

        /// <summary>
        /// Maps a batch of v1 students to v2 CreateStudentRequests.
        /// Provide <paramref name="officialInfos"/> (StudentOfficialInfo table) to
        /// resolve class/section/roll number for each student's most recent academic year.
        /// </summary>
        public List<CreateStudentRequest> MapStudents(
            IEnumerable<V1Student> v1Students,
            IEnumerable<V1StudentOfficialInfo>? officialInfos = null)
        {
            var infoByStudent = officialInfos?
                .GroupBy(o => o.StudentId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(o => o.AcademicYearId).First())
                ?? new Dictionary<int, V1StudentOfficialInfo>();

            return v1Students
                .Select(s => MapSingleStudent(s, infoByStudent.GetValueOrDefault(s.Id)))
                .ToList();
        }

        /// <summary>
        /// Maps a single v1 Guardian to a v2 CreateGuardianDto.
        /// </summary>
        public CreateGuardianDto MapGuardian(V1Guardian g) => new()
        {
            Name         = NormaliseString(g.Name)   ?? "Unknown",
            Relation     = NormaliseRelation(g.Relation),
            Phone        = NormalisePhone(g.MobileNo) ?? "",
            Email        = NormaliseEmail(g.EmailId),
            Occupation   = NormaliseString(g.Occupation),
            AadharNumber = NormaliseString(g.AadharNo),
            PanNumber    = NormaliseString(g.PAN),
        };

        /// <summary>
        /// Maps a v1 TransferCertificate to a v2 CreateTransferCertificateRequest.
        /// </summary>
        public CreateTransferCertificateRequest MapTransferCertificate(V1TransferCertificate tc) => new()
        {
            TCNumber               = NormaliseString(tc.TCNumber),
            TCNumberPrefix         = NormaliseString(tc.TCNumberPrefix),
            ApplicationDate        = tc.ApplicationDate,
            ExitAcademicYear       = NormaliseString(tc.ExitAcademicYear),
            ExitClass              = NormaliseString(tc.ExitClass),
            ExitSection            = NormaliseString(tc.ExitSection),
            ReasonForLeaving       = NormaliseString(tc.ReasonForLeaving),
            Conduct                = NormaliseConductGrade(tc.Conduct),
            IsFailedInLastClass    = tc.IsFailedInLastClass,
            LastAnnualExamResult   = NormaliseString(tc.LastAnnualExamResult),
            IsQualifiedForHigherClass = tc.IsQualifiedForHigherClass,
            QualifiedToClass       = NormaliseString(tc.QualifiedToClass),
            AdditionalRemarks      = NormaliseString(tc.AdditionalRemarks),
        };

        // ── Internal mapping ─────────────────────────────────────────────────

        private CreateStudentRequest MapSingleStudent(V1Student s, V1StudentOfficialInfo? info) => new()
        {
            SchoolId        = _targetSchoolId,
            AdmissionNumber = NormaliseAdmissionNumber(s.AdmissionNo, s.GRNumber, s.Id),
            Name            = BuildFullName(s.FirstName, s.MiddleName, s.LastName),
            Class           = info?.ClassName ?? "Unknown",
            Section         = info?.SectionName ?? "A",
            RollNumber      = info?.RollNo,
            DateOfBirth     = s.DateOfBirth ?? DateTime.Today.AddYears(-10),
            AdmissionDate   = s.AdmissionDate ?? DateTime.UtcNow,
            Gender          = NormaliseGender(s.Gender),
            BloodGroup      = NormaliseBloodGroup(s.BloodGroup),
            Category        = NormaliseCategory(s.Category),
            Caste           = NormaliseString(s.Caste),
            Nationality     = NormaliseString(s.Nationality) ?? "Indian",
            Religion        = NormaliseString(s.Religion),
            MotherTongue    = NormaliseString(s.MotherTongue),
            Address         = BuildFullAddress(s.Address, s.City, s.State, s.PinCode),
            PrimaryPhone    = NormalisePhone(s.MobileNumber),
            Email           = NormaliseEmail(s.EmailId),
            AadharNumber     = NormaliseString(s.AadharNo),
            PassportNumber   = NormaliseString(s.PassportNo),
            RationCardNumber = NormaliseString(s.RationCardNo),
            PenNumber        = NormaliseString(s.PENNumber),
            // SR/GR number stored in EnrollmentNumber as fallback
            EnrollmentNumber = NormaliseString(s.SRNumber) ?? NormaliseString(s.GRNumber),
            Allergies        = NormaliseString(s.Allergies),
            SpecialNeeds     = NormaliseString(s.SpecialNeeds),
            EmergencyContact = NormaliseString(s.EmergencyContact),
            EmergencyPhone   = NormalisePhone(s.EmergencyContactNo),
            TransportRequired = s.TransportRequired,
            HostelRequired   = s.HostelRequired,
            // BusRoute/BusStop stored as extra-curricular remarks (no dedicated field in v2)
            ExtraCurricularActivities = BuildBusInfo(s.BusRoute, s.BusStop),
            PreviousSchool   = NormaliseString(s.PreviousSchool),
            PreviousClass    = NormaliseString(s.PreviousClass),
            TransferReason   = NormaliseString(s.TCReason),
            Status          = MapStudentStatus(s),
            // Legacy guardian fields — service will create GuardianEntity from these.
            // Callers should use MapGuardian() for each V1Guardian to add real guardian records.
            GuardianName    = "See Guardians",
            GuardianPhone   = "0000000000",
        };

        private static string? BuildBusInfo(string? route, string? stop)
        {
            if (string.IsNullOrWhiteSpace(route) && string.IsNullOrWhiteSpace(stop)) return null;
            return $"Bus Route: {route ?? "N/A"}, Bus Stop: {stop ?? "N/A"}";
        }

        // ── Field normalisers ────────────────────────────────────────────────

        private static string NormaliseAdmissionNumber(string? admNo, string? grNo, int fallbackId)
        {
            if (!string.IsNullOrWhiteSpace(admNo)) return admNo.Trim();
            if (!string.IsNullOrWhiteSpace(grNo))  return $"GR-{grNo.Trim()}";
            return $"V1-MIGRATED-{fallbackId}";
        }

        private static string BuildFullName(string? first, string? middle, string? last)
        {
            var parts = new[] { first, middle, last }
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!.Trim());
            var name = string.Join(" ", parts);
            return string.IsNullOrWhiteSpace(name) ? "Unknown" : name;
        }

        private static string BuildFullAddress(string? address, string? city, string? state, string? pin)
        {
            var parts = new[] { address, city, state, pin }
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!.Trim());
            return string.Join(", ", parts);
        }

        private static string NormaliseGender(string? raw) =>
            raw != null && GenderMap.TryGetValue(raw.Trim(), out var g) ? g : "male";

        private static string? NormaliseBloodGroup(string? raw) =>
            raw != null && BloodGroupMap.TryGetValue(raw.Trim(), out var bg) ? bg : null;

        private static string? NormaliseCategory(string? raw) =>
            raw != null && CategoryMap.TryGetValue(raw.Trim(), out var c) ? c : null;

        private static string NormaliseRelation(string? raw) =>
            raw != null && RelationMap.TryGetValue(raw.Trim(), out var r) ? r : "guardian";

        private static string? NormaliseConductGrade(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            return raw.Trim().ToLowerInvariant() switch
            {
                "e" or "excellent" => "Excellent",
                "vg" or "very good" or "verygood" => "Very Good",
                "g" or "good" => "Good",
                "s" or "satisfactory" => "Satisfactory",
                _ => raw.Trim(),
            };
        }

        private static string? NormalisePhone(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var digits = new string(raw.Where(char.IsDigit).ToArray());
            // Strip country code if 11+ digits starting with 91
            if (digits.Length == 12 && digits.StartsWith("91"))
                digits = digits[2..];
            return digits.Length >= 10 ? digits[..10] : null;
        }

        private static string? NormaliseEmail(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var trimmed = raw.Trim().ToLowerInvariant();
            return trimmed.Contains('@') ? trimmed : null;
        }

        private static string? NormaliseString(string? raw) =>
            string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();

        private static string MapStudentStatus(V1Student s)
        {
            if (s.IsLeft)   return "transferred";
            if (!s.IsActive) return "inactive";
            return "active";
        }
    }

    // ─── Migration Result ────────────────────────────────────────────────────

    public sealed class MigrationResult
    {
        public int TotalProcessed   { get; set; }
        public int SuccessCount     { get; set; }
        public int FailureCount     { get; set; }
        public int SkippedCount     { get; set; }
        public List<string> Errors  { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public List<Guid>   MigratedIds { get; set; } = new();

        public bool IsFullSuccess => FailureCount == 0 && SkippedCount == 0;
    }
}

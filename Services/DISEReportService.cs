using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using System.Text;

namespace SmsApi.Services
{
    // ═══════════════════════════════════════════════════════════════════
    // DTOs for DISE Report
    // ═══════════════════════════════════════════════════════════════════

    public class DISEStudentRecord
    {
        public Guid StudentId { get; set; }
        public string? PenNumber { get; set; }
        public string? UDISENumber { get; set; }
        public string? AadharNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsMinority { get; set; }
        public bool IsBPL { get; set; }
        public bool IsDifferentlyAbled { get; set; }
        public string? DifferentlyAbledType { get; set; }
        public decimal? DifferentlyAbledPercentage { get; set; }
        public string? Religion { get; set; }
        public string? BoardRollNumber { get; set; }
        public string? Address { get; set; }
    }

    public class DISEClassSummary
    {
        public string ClassName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int Boys { get; set; }
        public int Girls { get; set; }
        public int GeneralCategory { get; set; }
        public int OBCCategory { get; set; }
        public int SCCategory { get; set; }
        public int STCategory { get; set; }
        public int MinorityStudents { get; set; }
        public int BPLStudents { get; set; }
        public int DifferentlyAbledStudents { get; set; }
    }

    public class DISESchoolSummary
    {
        public Guid SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string? UDISECode { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int TotalBoys { get; set; }
        public int TotalGirls { get; set; }
        public int GeneralCategory { get; set; }
        public int OBCCategory { get; set; }
        public int SCCategory { get; set; }
        public int STCategory { get; set; }
        public int MinorityStudents { get; set; }
        public int BPLStudents { get; set; }
        public int DifferentlyAbledStudents { get; set; }
        public int StudentsWithPEN { get; set; }
        public int StudentsWithAadhar { get; set; }
        public List<DISEClassSummary> ClassBreakdown { get; set; } = new();
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    public interface IDISEReportService
    {
        Task<DISESchoolSummary> GetSummaryAsync(Guid schoolId, string academicYear);
        Task<List<DISEStudentRecord>> GetStudentRecordsAsync(Guid schoolId, string academicYear, string? className = null);
        Task<byte[]> ExportCsvAsync(Guid schoolId, string academicYear, string? className = null);
    }

    public class DISEReportService : IDISEReportService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<DISEReportService> _logger;

        public DISEReportService(AppDbContext db, ILogger<DISEReportService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<DISESchoolSummary> GetSummaryAsync(Guid schoolId, string academicYear)
        {
            var students = await GetStudentRecordsAsync(schoolId, academicYear);

            // Get school info
            var school = await _db.Schools
                .FirstOrDefaultAsync(s => s.Id == schoolId);

            var udiseSetting = await _db.SchoolSettings
                .FirstOrDefaultAsync(ss => ss.SchoolId == schoolId && ss.SettingKey == "udise_code");

            var classSummaries = students
                .GroupBy(s => s.ClassName)
                .OrderBy(g => g.Key)
                .Select(g => new DISEClassSummary
                {
                    ClassName = g.Key,
                    TotalStudents = g.Count(),
                    Boys = g.Count(s => s.Gender?.ToLower() is "male" or "m"),
                    Girls = g.Count(s => s.Gender?.ToLower() is "female" or "f"),
                    GeneralCategory = g.Count(s => s.Category?.ToUpper() == "GENERAL" || s.Category == null),
                    OBCCategory = g.Count(s => s.Category?.ToUpper() == "OBC"),
                    SCCategory = g.Count(s => s.Category?.ToUpper() == "SC"),
                    STCategory = g.Count(s => s.Category?.ToUpper() == "ST"),
                    MinorityStudents = g.Count(s => s.IsMinority),
                    BPLStudents = g.Count(s => s.IsBPL),
                    DifferentlyAbledStudents = g.Count(s => s.IsDifferentlyAbled)
                })
                .ToList();

            return new DISESchoolSummary
            {
                SchoolId = schoolId,
                SchoolName = school?.Name ?? string.Empty,
                UDISECode = udiseSetting?.SettingValue,
                AcademicYear = academicYear,
                TotalStudents = students.Count,
                TotalBoys = students.Count(s => s.Gender?.ToLower() is "male" or "m"),
                TotalGirls = students.Count(s => s.Gender?.ToLower() is "female" or "f"),
                GeneralCategory = students.Count(s => s.Category?.ToUpper() == "GENERAL" || s.Category == null),
                OBCCategory = students.Count(s => s.Category?.ToUpper() == "OBC"),
                SCCategory = students.Count(s => s.Category?.ToUpper() == "SC"),
                STCategory = students.Count(s => s.Category?.ToUpper() == "ST"),
                MinorityStudents = students.Count(s => s.IsMinority),
                BPLStudents = students.Count(s => s.IsBPL),
                DifferentlyAbledStudents = students.Count(s => s.IsDifferentlyAbled),
                StudentsWithPEN = students.Count(s => !string.IsNullOrWhiteSpace(s.PenNumber)),
                StudentsWithAadhar = students.Count(s => !string.IsNullOrWhiteSpace(s.AadharNumber)),
                ClassBreakdown = classSummaries,
                GeneratedAt = DateTime.UtcNow
            };
        }

        public async Task<List<DISEStudentRecord>> GetStudentRecordsAsync(Guid schoolId, string academicYear, string? className = null)
        {
            // Query active students, optionally filter by class name
            var query = _db.Students
                .Where(s => s.SchoolId == schoolId && s.Status == "active");

            if (!string.IsNullOrWhiteSpace(className))
                query = query.Where(s => s.Class == className);

            var students = await query
                .OrderBy(s => s.Class)
                .ThenBy(s => s.Section)
                .ThenBy(s => s.FirstName)
                .ToListAsync();

            return students.Select(s => new DISEStudentRecord
            {
                StudentId = s.Id,
                PenNumber = s.PenNumber,
                UDISENumber = s.UDISENumber,
                AadharNumber = s.AadharNumber,
                Name = !string.IsNullOrWhiteSpace(s.FirstName)
                    ? $"{s.FirstName} {s.LastName}".Trim()
                    : s.Name,
                FirstName = s.FirstName,
                LastName = s.LastName,
                FatherName = s.GuardianName,
                MotherName = null,
                DateOfBirth = s.DateOfBirth,
                Gender = s.Gender,
                ClassName = s.Class ?? string.Empty,
                SectionName = s.Section ?? string.Empty,
                Category = s.Category,
                IsMinority = s.IsMinority,
                IsBPL = s.IsBPL,
                IsDifferentlyAbled = s.IsDifferentlyAbled,
                DifferentlyAbledType = s.DifferentlyAbledType,
                DifferentlyAbledPercentage = decimal.TryParse(s.DifferentlyAbledPercentage, out var dap) ? dap : null,
                Religion = s.Religion,
                BoardRollNumber = s.BoardRollNumber,
                Address = s.Address
            }).ToList();
        }

        public async Task<byte[]> ExportCsvAsync(Guid schoolId, string academicYear, string? className = null)
        {
            var records = await GetStudentRecordsAsync(schoolId, academicYear, className);

            var sb = new StringBuilder();

            // DCF-1 style header (DISE Data Capture Format)
            sb.AppendLine("SNo,PEN,UDISE_Student_Code,Aadhar,Name,Father_Name,Mother_Name," +
                          "DOB,Gender,Class,Section,Category,Minority,BPL," +
                          "Differently_Abled,Disability_Type,Disability_%,Religion,Board_Roll,Address");

            int sno = 1;
            foreach (var r in records)
            {
                sb.AppendLine(string.Join(",",
                    sno++,
                    Escape(r.PenNumber),
                    Escape(r.UDISENumber),
                    Escape(r.AadharNumber),
                    Escape(r.Name),
                    Escape(r.FatherName),
                    Escape(r.MotherName),
                    r.DateOfBirth?.ToString("dd/MM/yyyy") ?? string.Empty,
                    Escape(r.Gender),
                    Escape(r.ClassName),
                    Escape(r.SectionName),
                    Escape(r.Category),
                    r.IsMinority ? "Yes" : "No",
                    r.IsBPL ? "Yes" : "No",
                    r.IsDifferentlyAbled ? "Yes" : "No",
                    Escape(r.DifferentlyAbledType),
                    r.DifferentlyAbledPercentage?.ToString("F1") ?? string.Empty,
                    Escape(r.Religion),
                    Escape(r.BoardRollNumber),
                    Escape(r.Address)
                ));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        private static string Escape(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            // RFC 4180 CSV escaping: wrap in quotes if value contains comma, quote, or newline
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }
    }
}

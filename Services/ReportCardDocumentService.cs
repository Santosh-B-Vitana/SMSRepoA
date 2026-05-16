using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface IReportCardDocumentService
    {
        Task<ReportCardDocumentDto?> GetReportCardAsync(Guid reportCardId, Guid schoolId);
        Task<ReportCardListResponse> GetReportCardsAsync(Guid schoolId, int page, int pageSize, Guid? classId, Guid? sectionId, string? academicYear, string? term, string? status);
        Task<ReportCardStatsResponse> GetStatsAsync(Guid schoolId, string? academicYear, string? term);
        Task<ReportCardDocumentDto> GenerateReportCardAsync(Guid schoolId, GenerateReportCardRequest request, Guid issuedByStaffId);
        Task<List<ReportCardDocumentDto>> BulkGenerateAsync(Guid schoolId, BulkGenerateReportCardsRequest request, Guid issuedByStaffId);
        Task<ReportCardDocumentDto> EditReportCardAsync(Guid reportCardId, Guid schoolId, EditReportCardRequest request, string editedByUsername);
        Task<bool> DeleteReportCardAsync(Guid reportCardId, Guid schoolId);
        Task<bool> MarkDistributedAsync(Guid reportCardId, Guid schoolId);
        Task<List<TemplatePreviewResponse>> GetTemplateGalleryAsync();

        // Multi-format download
        Task<(byte[] Bytes, string ContentType, string FileName)> DownloadReportCardAsync(Guid reportCardId, Guid schoolId, string format, string? templateStyleOverride);
        Task<(byte[] Bytes, string ContentType, string FileName)> BulkDownloadAsync(Guid schoolId, string academicYear, string term, Guid? classId, Guid? sectionId, string format);

        // Certificates with edit capability
        Task<CertificateResponse> EditCertificateAsync(Guid certId, Guid schoolId, EditCertificateRequest request, string editedByUsername);
        Task<(byte[] Bytes, string ContentType, string FileName)> DownloadCertificateAsync(Guid certId, Guid schoolId, string format, string? templateStyleOverride);
    }

    public class ReportCardDocumentService : IReportCardDocumentService
    {
        private readonly AppDbContext _db;

        public ReportCardDocumentService(AppDbContext db)
        {
            _db = db;
            // QuestPDF community license (free for revenue < $1M/year)
            QuestPDF.Settings.License = LicenseType.Community;
        }

        // ── Get single ────────────────────────────────────────────────────────
        public async Task<ReportCardDocumentDto?> GetReportCardAsync(Guid reportCardId, Guid schoolId)
        {
            var rc = await _db.ReportCards
                .Include(r => r.Student)
                .Include(r => r.School)
                .FirstOrDefaultAsync(r => r.Id == reportCardId && r.SchoolId == schoolId);
            if (rc == null) return null;
            return await BuildDocumentDtoAsync(rc, schoolId);
        }

        // ── List ──────────────────────────────────────────────────────────────
        public async Task<ReportCardListResponse> GetReportCardsAsync(
            Guid schoolId, int page, int pageSize,
            Guid? classId, Guid? sectionId, string? academicYear, string? term, string? status)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _db.ReportCards
                .Include(r => r.Student)
                .Where(r => r.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(academicYear)) query = query.Where(r => r.AcademicYear == academicYear);
            if (!string.IsNullOrWhiteSpace(term)) query = query.Where(r => r.Term == term);

            // Filter by class/section via student enrollment
            if (classId.HasValue || sectionId.HasValue)
            {
                var studentIds = await _db.StudentEnrollments
                    .Where(e => e.SchoolId == schoolId
                        && (!classId.HasValue || e.ClassId == classId.Value)
                        && (!sectionId.HasValue || e.SectionId == sectionId.Value))
                    .Select(e => e.StudentId)
                    .ToListAsync();
                query = query.Where(r => studentIds.Contains(r.StudentId));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = new List<ReportCardDocumentDto>();
            foreach (var rc in items)
                dtos.Add(await BuildDocumentDtoAsync(rc, schoolId));

            return new ReportCardListResponse
            {
                Items = dtos,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize)
            };
        }

        // ── Stats ─────────────────────────────────────────────────────────────
        public async Task<ReportCardStatsResponse> GetStatsAsync(Guid schoolId, string? academicYear, string? term)
        {
            var query = _db.ReportCards.Where(r => r.SchoolId == schoolId);
            if (!string.IsNullOrWhiteSpace(academicYear)) query = query.Where(r => r.AcademicYear == academicYear);
            if (!string.IsNullOrWhiteSpace(term)) query = query.Where(r => r.Term == term);

            var all = await query.ToListAsync();
            if (!all.Any())
                return new ReportCardStatsResponse();

            return new ReportCardStatsResponse
            {
                TotalGenerated = all.Count,
                TotalPassed = all.Count(r => r.Status == "Pass"),
                TotalFailed = all.Count(r => r.Status == "Fail"),
                ClassAveragePercentage = all.Any() ? Math.Round(all.Average(r => r.Percentage), 2) : 0,
                HighestPercentage = all.Max(r => r.Percentage),
                LowestPercentage = all.Min(r => r.Percentage),
                ByGrade = all
                    .Where(r => !string.IsNullOrWhiteSpace(r.OverallGrade))
                    .GroupBy(r => r.OverallGrade!)
                    .ToDictionary(g => g.Key, g => g.Count())
            };
        }

        // ── Generate single report card ───────────────────────────────────────
        public async Task<ReportCardDocumentDto> GenerateReportCardAsync(
            Guid schoolId, GenerateReportCardRequest req, Guid issuedByStaffId)
        {
            var student = await _db.Students.FindAsync(req.StudentId)
                ?? throw new KeyNotFoundException($"Student {req.StudentId} not found.");

            if (student.SchoolId != schoolId)
                throw new UnauthorizedAccessException("Student does not belong to this school.");

            // Collect exam marks from ExamMarksEntries
            var subjects = await BuildSubjectListAsync(schoolId, req.StudentId, req.ExamSetupId, req.AcademicYear, req.Term);

            // Calculate totals
            var totalMax = subjects.Sum(s => s.AnnualMax ?? 0);
            var totalObtained = subjects.Sum(s => s.AnnualObtained ?? 0);
            var pct = totalMax > 0 ? Math.Round(totalObtained / totalMax * 100, 2) : 0;

            // Board-aware grade
            var boardGrade = await GetBoardGradeAsync(schoolId, pct, req.AcademicYear);

            // Attendance
            AttendanceSummaryDto? attendance = null;
            if (req.IncludeAttendance)
                attendance = await BuildAttendanceSummaryAsync(schoolId, req.StudentId, req.AcademicYear);

            // Co-scholastic
            var coScholastic = req.IncludeCoScholastic
                ? await BuildCoScholasticAsync(schoolId, req.StudentId, req.AcademicYear, req.Term)
                : new List<CoScholasticItemDto>();

            // Persist / update the ReportCard record
            var existing = await _db.ReportCards.FirstOrDefaultAsync(r =>
                r.StudentId == req.StudentId && r.SchoolId == schoolId &&
                r.AcademicYear == req.AcademicYear && r.Term == req.Term);

            ReportCard rc;
            if (existing != null)
            {
                rc = existing;
            }
            else
            {
                rc = new ReportCard { Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = req.StudentId };
                _db.ReportCards.Add(rc);
            }

            rc.AcademicYear = req.AcademicYear;
            rc.Term = req.Term;
            rc.TotalMarks = totalMax;
            rc.ObtainedMarks = totalObtained;
            rc.Percentage = pct;
            rc.OverallGrade = boardGrade.Grade;
            rc.Status = pct >= 33 ? "Pass" : "Fail";
            rc.IssueDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Build full DTO
            var dto = await BuildDocumentDtoAsync(rc, schoolId);
            dto.TemplateStyle = req.TemplateStyle;
            dto.BoardType = req.BoardType;
            dto.Orientation = req.Orientation;
            dto.Subjects = subjects;
            dto.CoScholasticItems = coScholastic;
            dto.Attendance = attendance;
            dto.CGPA = boardGrade.GradePoint;

            return dto;
        }

        // ── Bulk generate ─────────────────────────────────────────────────────
        public async Task<List<ReportCardDocumentDto>> BulkGenerateAsync(
            Guid schoolId, BulkGenerateReportCardsRequest req, Guid issuedByStaffId)
        {
            List<Guid> studentIds;
            if (req.StudentIds?.Any() == true)
            {
                studentIds = req.StudentIds;
            }
            else
            {
                var enrollQuery = _db.StudentEnrollments.Where(e => e.SchoolId == schoolId);
                if (req.ClassId.HasValue) enrollQuery = enrollQuery.Where(e => e.ClassId == req.ClassId.Value);
                if (req.SectionId.HasValue) enrollQuery = enrollQuery.Where(e => e.SectionId == req.SectionId.Value);
                studentIds = await enrollQuery.Select(e => e.StudentId).Distinct().ToListAsync();
            }

            var results = new List<ReportCardDocumentDto>();
            foreach (var sid in studentIds)
            {
                try
                {
                    var genReq = new GenerateReportCardRequest
                    {
                        StudentId = sid,
                        AcademicYear = req.AcademicYear,
                        Term = req.Term,
                        BoardType = req.BoardType,
                        TemplateStyle = req.TemplateStyle,
                        Orientation = req.Orientation,
                        IncludeCoScholastic = req.IncludeCoScholastic,
                        IncludeAttendance = req.IncludeAttendance
                    };
                    results.Add(await GenerateReportCardAsync(schoolId, genReq, issuedByStaffId));
                }
                catch
                {
                    // Skip students with no marks data, continue with others
                }
            }
            return results;
        }

        // ── Edit / correct ────────────────────────────────────────────────────
        public async Task<ReportCardDocumentDto> EditReportCardAsync(
            Guid reportCardId, Guid schoolId, EditReportCardRequest req, string editedByUsername)
        {
            var rc = await _db.ReportCards.FirstOrDefaultAsync(r => r.Id == reportCardId && r.SchoolId == schoolId)
                ?? throw new KeyNotFoundException($"Report card {reportCardId} not found.");

            if (!string.IsNullOrWhiteSpace(req.OverrideResultStatus)) rc.Status = req.OverrideResultStatus;
            if (req.OverridePercentage.HasValue) rc.Percentage = req.OverridePercentage.Value;
            if (!string.IsNullOrWhiteSpace(req.OverrideOverallGrade)) rc.OverallGrade = req.OverrideOverallGrade;
            if (!string.IsNullOrWhiteSpace(req.TeacherRemarks)) rc.TeacherComments = req.TeacherRemarks;

            // Store edit trail in Remarks field (JSON-safe)
            var editTrail = $"[Corrected {DateTime.UtcNow:yyyy-MM-dd HH:mm} by {editedByUsername}]: {req.EditRemarks}";
            rc.Remarks = (rc.Remarks != null ? rc.Remarks + " | " : "") + editTrail;

            rc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var dto = await BuildDocumentDtoAsync(rc, schoolId);
            dto.IsEdited = true;
            dto.EditRemarks = req.EditRemarks;
            dto.LastEditedAt = rc.UpdatedAt;
            dto.LastEditedBy = editedByUsername;
            if (req.CorrectedSubjects?.Any() == true) dto.Subjects = req.CorrectedSubjects;
            return dto;
        }

        // ── Delete ────────────────────────────────────────────────────────────
        public async Task<bool> DeleteReportCardAsync(Guid reportCardId, Guid schoolId)
        {
            var rc = await _db.ReportCards.FirstOrDefaultAsync(r => r.Id == reportCardId && r.SchoolId == schoolId);
            if (rc == null) return false;
            _db.ReportCards.Remove(rc);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Mark distributed ──────────────────────────────────────────────────
        public async Task<bool> MarkDistributedAsync(Guid reportCardId, Guid schoolId)
        {
            var rc = await _db.ReportCards.FirstOrDefaultAsync(r => r.Id == reportCardId && r.SchoolId == schoolId);
            if (rc == null) return false;
            rc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Template gallery ──────────────────────────────────────────────────
        public Task<List<TemplatePreviewResponse>> GetTemplateGalleryAsync()
            => Task.FromResult(ReportCardTemplateEngine.GetTemplateGallery());

        // ── Download: single student, any format ──────────────────────────────
        public async Task<(byte[] Bytes, string ContentType, string FileName)> DownloadReportCardAsync(
            Guid reportCardId, Guid schoolId, string format, string? templateStyleOverride)
        {
            var dto = await GetReportCardAsync(reportCardId, schoolId)
                ?? throw new KeyNotFoundException("Report card not found.");

            // Reload subjects from exam marks
            dto.Subjects = await BuildSubjectListAsync(schoolId, dto.StudentId, null, dto.AcademicYear, dto.Term);
            dto.CoScholasticItems = await BuildCoScholasticAsync(schoolId, dto.StudentId, dto.AcademicYear, dto.Term);
            dto.Attendance = await BuildAttendanceSummaryAsync(schoolId, dto.StudentId, dto.AcademicYear);

            if (!string.IsNullOrWhiteSpace(templateStyleOverride))
                dto.TemplateStyle = templateStyleOverride;

            return format.ToUpper() switch
            {
                "PDF"   => GeneratePdf(dto),
                "EXCEL" => GenerateExcel(new[] { dto }.ToList()),
                "CSV"   => GenerateCsv(new[] { dto }.ToList()),
                _       => GenerateHtml(dto)
            };
        }

        // ── Bulk download ─────────────────────────────────────────────────────
        public async Task<(byte[] Bytes, string ContentType, string FileName)> BulkDownloadAsync(
            Guid schoolId, string academicYear, string term,
            Guid? classId, Guid? sectionId, string format)
        {
            var listResp = await GetReportCardsAsync(schoolId, 1, 200, classId, sectionId, academicYear, term, null);
            var dtos = listResp.Items;

            if (!dtos.Any())
                throw new InvalidOperationException("No report cards found for the given criteria.");

            // Reload marks for each
            foreach (var dto in dtos)
            {
                dto.Subjects = await BuildSubjectListAsync(schoolId, dto.StudentId, null, dto.AcademicYear, dto.Term);
                dto.Attendance = await BuildAttendanceSummaryAsync(schoolId, dto.StudentId, dto.AcademicYear);
            }

            return format.ToUpper() switch
            {
                "EXCEL" => GenerateExcel(dtos),
                "CSV"   => GenerateCsv(dtos),
                _       => GenerateBulkHtml(dtos)
            };
        }

        // ── Edit certificate ──────────────────────────────────────────────────
        public async Task<CertificateResponse> EditCertificateAsync(
            Guid certId, Guid schoolId, EditCertificateRequest req, string editedByUsername)
        {
            var cert = await _db.Certificates
                .Include(c => c.Student)
                .Include(c => c.Template)
                .FirstOrDefaultAsync(c => c.Id == certId && c.SchoolId == schoolId)
                ?? throw new KeyNotFoundException($"Certificate {certId} not found.");

            if (!string.IsNullOrWhiteSpace(req.Title)) cert.Title = req.Title;
            if (!string.IsNullOrWhiteSpace(req.Content)) cert.Content = req.Content;
            if (req.ValidUntil.HasValue) cert.ValidUntil = req.ValidUntil.Value;

            // Append edit audit trail to metadata
            var editEntry = $"{{\"editedAt\":\"{DateTime.UtcNow:O}\",\"editedBy\":\"{editedByUsername}\",\"reason\":\"{EscapeJson(req.EditReason)}\"}}";
            cert.Metadata = !string.IsNullOrWhiteSpace(cert.Metadata)
                ? cert.Metadata.TrimEnd('}') + $",\"lastEdit\":{editEntry}}}"
                : $"{{\"lastEdit\":{editEntry}}}";

            cert.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return MapCertificateToResponse(cert);
        }

        // ── Download certificate as PDF / HTML ────────────────────────────────
        public async Task<(byte[] Bytes, string ContentType, string FileName)> DownloadCertificateAsync(
            Guid certId, Guid schoolId, string format, string? templateStyleOverride)
        {
            var cert = await _db.Certificates
                .Include(c => c.Student)
                .Include(c => c.Template)
                .Include(c => c.School)
                .Include(c => c.IssuedByStaff)
                .FirstOrDefaultAsync(c => c.Id == certId && c.SchoolId == schoolId)
                ?? throw new KeyNotFoundException($"Certificate {certId} not found.");

            var html = RenderCertificateHtml(cert, templateStyleOverride);
            var safeName = SanitizeFileName($"{cert.CertificateType}_{cert.Student?.Name ?? "cert"}_{cert.CertificateNumber}");

            return format.ToUpper() switch
            {
                "PDF" => GeneratePdfFromHtml(html, safeName),
                _     => (Encoding.UTF8.GetBytes(html), "text/html", $"{safeName}.html")
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Private helpers
        // ═══════════════════════════════════════════════════════════════════════

        private async Task<ReportCardDocumentDto> BuildDocumentDtoAsync(ReportCard rc, Guid schoolId)
        {
            var school = rc.School ?? await _db.Schools.FindAsync(schoolId);
            var student = rc.Student ?? await _db.Students.FindAsync(rc.StudentId);

            // Resolve class/section from student enrollment
            var enrollment = await _db.StudentEnrollments
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.StudentId == rc.StudentId && e.SchoolId == schoolId)
                .OrderByDescending(e => e.Id)
                .FirstOrDefaultAsync();

            return new ReportCardDocumentDto
            {
                Id = rc.Id,
                SchoolId = rc.SchoolId,
                StudentId = rc.StudentId,
                SchoolName = school?.Name ?? "School",
                SchoolAddress = school?.Address,
                SchoolPhone = school?.Phone,
                SchoolEmail = school?.Email,
                SchoolLogoUrl = school?.Logo,
                StudentName = student != null ? $"{student.FirstName} {student.LastName}".Trim().Length > 0 ? $"{student.FirstName} {student.LastName}".Trim() : student.Name : "Student",
                AdmissionNo = student?.AdmissionNumber,
                RollNumber = student?.RollNumber?.ToString(),
                DateOfBirth = student?.DateOfBirth.ToString("dd-MMM-yyyy"),
                FatherName = null,
                MotherName = null,
                StudentPhotoUrl = student?.PhotoUrl,
                ClassName = enrollment?.Class?.Name,
                SectionName = enrollment?.Section?.Name,
                AcademicYear = rc.AcademicYear,
                Term = rc.Term,
                BoardType = "CBSE",   // fetched from school board config below
                TemplateStyle = "CBSE_Classic",
                Orientation = "Portrait",
                TotalMaxMarks = rc.TotalMarks,
                TotalObtainedMarks = rc.ObtainedMarks,
                Percentage = rc.Percentage,
                OverallGrade = rc.OverallGrade,
                CGPA = rc.CGPA,
                ClassRank = rc.Rank,
                TotalStudentsInClass = rc.TotalStudents,
                ResultStatus = rc.Status,
                TeacherRemarks = rc.TeacherComments,
                PrincipalRemarks = rc.Remarks,
                IssueDate = rc.IssueDate,
                Status = "Generated",
                CreatedAt = rc.CreatedAt,
                UpdatedAt = rc.UpdatedAt,
                Subjects = new List<ReportCardSubjectDto>()
            };
        }

        private async Task<List<ReportCardSubjectDto>> BuildSubjectListAsync(
            Guid schoolId, Guid studentId, Guid? examSetupId, string academicYear, string term)
        {
            // Fetch from ExamMarksEntries (new system) or ExamResults (legacy)
            var marksQuery = _db.ExamMarksEntries
                .Include(m => m.ExamSetupSubject)
                    .ThenInclude(s => s!.Subject)
                .Where(m => m.StudentId == studentId);

            if (examSetupId.HasValue)
                marksQuery = marksQuery.Where(m => m.ExamSetupSubject != null &&
                    m.ExamSetupSubject.ExamSetupId == examSetupId.Value);

            var marks = await marksQuery.ToListAsync();

            if (!marks.Any())
            {
                // Fallback: legacy ExamResults
                var results = await _db.ExamResults
                    .Include(r => r.Subject)
                    .Where(r => r.StudentId == studentId)
                    .ToListAsync();

                return results.Select(r => new ReportCardSubjectDto
                {
                    SubjectName = r.Subject ?? "Subject",
                    SubjectCode = "",
                    AnnualMax = r.TotalMarks,
                    AnnualObtained = (decimal)r.MarksObtained,
                    AnnualPercentage = r.TotalMarks > 0 ? Math.Round((decimal)r.MarksObtained / r.TotalMarks * 100, 1) : 0,
                    FinalGrade = r.Grade,
                    IsPass = r.TotalMarks > 0 && ((decimal)r.MarksObtained / r.TotalMarks) * 100 >= 33
                }).ToList();
            }

            // Group by subject
            return marks
                .GroupBy(m => m.ExamSetupSubject?.SubjectId ?? Guid.Empty)
                .Select(g =>
                {
                    var first = g.First();
                    var subj = first.ExamSetupSubject?.Subject;
                    var totalMax = g.Sum(m => m.ExamSetupSubject?.MaxTotalMarks ?? 0m);
                    var totalObt = g.Sum(m => m.ObtainedMarks);
                    var pct = totalMax > 0 ? Math.Round(totalObt / totalMax * 100, 1) : 0m;

                    return new ReportCardSubjectDto
                    {
                        SubjectName = subj?.Name ?? "Subject",
                        SubjectCode = subj?.Code ?? "",
                        AnnualMax = totalMax,
                        AnnualObtained = totalObt,
                        AnnualPercentage = pct,
                        IsPass = pct >= 33
                    };
                })
                .ToList();
        }

        private async Task<AttendanceSummaryDto?> BuildAttendanceSummaryAsync(Guid schoolId, Guid studentId, string academicYear)
        {
            var records = await _db.AttendanceRecords
                .Where(a => a.StudentId == studentId && a.SchoolId == schoolId)
                .ToListAsync();

            if (!records.Any()) return null;

            var total = records.Count;
            var present = records.Count(a => a.Status == "Present");
            return new AttendanceSummaryDto
            {
                TotalWorkingDays = total,
                DaysPresent = present,
                DaysAbsent = total - present,
                AttendancePercentage = total > 0 ? Math.Round((decimal)present / total * 100, 1) : 0
            };
        }

        private async Task<List<CoScholasticItemDto>> BuildCoScholasticAsync(
            Guid schoolId, Guid studentId, string academicYear, string term)
        {
            var items = await _db.CoScholasticAssessments
                .Include(c => c.CoScholasticArea)
                .Where(c => c.SchoolId == schoolId && c.StudentId == studentId)
                .ToListAsync();

            return items
                .GroupBy(c => c.CoScholasticAreaId)
                .Select(g =>
                {
                    var first = g.First();
                    var t1 = g.FirstOrDefault(c => c.Term == 1);
                    var t2 = g.FirstOrDefault(c => c.Term == 2);
                    var annual = g.FirstOrDefault(c => c.Term == 0);
                    return new CoScholasticItemDto
                    {
                        Area = first.CoScholasticArea?.Name ?? "Activity",
                        SubArea = "",
                        T1Grade = t1?.Grade ?? annual?.Grade,
                        T2Grade = t2?.Grade,
                        Remarks = first.Remarks
                    };
                }).ToList();
        }

        private async Task<(string Grade, decimal GradePoint)> GetBoardGradeAsync(Guid schoolId, decimal percentage, string academicYear)
        {
            // CBSE default grading
            return percentage switch
            {
                >= 91 => ("A1", 10),
                >= 81 => ("A2", 9),
                >= 71 => ("B1", 8),
                >= 61 => ("B2", 7),
                >= 51 => ("C1", 6),
                >= 41 => ("C2", 5),
                >= 33 => ("D", 4),
                >= 21 => ("E1", 3),
                _     => ("E2", 2)
            };
        }

        // ── PDF generation (QuestPDF) ─────────────────────────────────────────
        private (byte[] Bytes, string ContentType, string FileName) GeneratePdf(ReportCardDocumentDto dto)
        {
            var html = ReportCardTemplateEngine.Render(dto);
            // For QuestPDF, we build a structured document (HTML path via HtmlToPdf is not in QuestPDF)
            // We use QuestPDF's fluent API for structured layout
            var doc = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(dto.Orientation == "Landscape" ? PageSizes.A4.Landscape() : PageSizes.A4);
                    page.Margin(12, Unit.Millimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                    page.Header().Element(c => BuildPdfHeader(c, dto));
                    page.Content().Element(c => BuildPdfContent(c, dto));
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Page ").FontSize(8).FontColor(Colors.Grey.Medium);
                        x.CurrentPageNumber().FontSize(8);
                        x.Span(" of ").FontSize(8);
                        x.TotalPages().FontSize(8);
                        x.Span($"   |   Generated: {DateTime.Now:dd MMM yyyy}").FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });
            });

            var bytes = doc.GeneratePdf();
            var name = SanitizeFileName($"ReportCard_{dto.StudentName}_{dto.AcademicYear}_{dto.Term}");
            return (bytes, "application/pdf", $"{name}.pdf");
        }

        private void BuildPdfHeader(IContainer container, ReportCardDocumentDto dto)
        {
            var (bg, accent, _) = GetTemplateColors(dto.TemplateStyle);

            container.Padding(0).Column(col =>
            {
                col.Item().Background(bg)
                    .Padding(10).Row(row =>
                    {
                        row.ConstantItem(60).AlignCenter().AlignMiddle().Text(dto.SchoolName.Substring(0, Math.Min(2, dto.SchoolName.Length)).ToUpper())
                            .FontSize(20).Bold().FontColor(QuestPDF.Helpers.Colors.White);

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(dto.SchoolName).Bold().FontSize(14).FontColor(QuestPDF.Helpers.Colors.White);
                            if (!string.IsNullOrWhiteSpace(dto.SchoolAddress))
                                c.Item().Text(dto.SchoolAddress).FontSize(8).FontColor(QuestPDF.Helpers.Colors.White);
                            if (!string.IsNullOrWhiteSpace(dto.SchoolPhone))
                                c.Item().Text($"Ph: {dto.SchoolPhone}").FontSize(8).FontColor(QuestPDF.Helpers.Colors.White);
                        });

                        row.ConstantItem(150).AlignRight().AlignMiddle().Column(c =>
                        {
                            c.Item().Text("PROGRESS REPORT CARD").Bold().FontSize(10).FontColor(QuestPDF.Helpers.Colors.White);
                            c.Item().Text($"{dto.Term}  |  {dto.AcademicYear}").FontSize(9).FontColor(QuestPDF.Helpers.Colors.White);
                            c.Item().Text($"Board: {dto.BoardType}").FontSize(8).FontColor(QuestPDF.Helpers.Colors.White);
                        });
                    });

                col.Item().Background(accent).Height(4);
            });
        }

        private void BuildPdfContent(IContainer container, ReportCardDocumentDto dto)
        {
            var (bg, accent, _) = GetTemplateColors(dto.TemplateStyle);
            var thBg = bg;
            var thFg = QuestPDF.Helpers.Colors.White;

            container.Column(main =>
            {
                // Student info
                main.Item().Padding(0).Row(row =>
                {
                    row.RelativeItem().Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.ConstantColumn(110); c.RelativeColumn(); c.ConstantColumn(110); c.RelativeColumn(); });

                        void InfoCell(string label, string? value)
                        {
                            t.Cell().Background(bg + "22").Padding(4).Text(label).FontSize(8).Bold();
                            t.Cell().Padding(4).Text(value ?? "—").FontSize(8);
                        }

                        InfoCell("Student Name", dto.StudentName);
                        InfoCell("Admission No.", dto.AdmissionNo);
                        InfoCell("Class / Section", $"{dto.ClassName} — {dto.SectionName}");
                        InfoCell("Roll Number", dto.RollNumber);
                        InfoCell("Father's Name", dto.FatherName);
                        InfoCell("Mother's Name", dto.MotherName);
                        InfoCell("Academic Year", dto.AcademicYear);
                        InfoCell("Date of Birth", dto.DateOfBirth);
                    });
                });

                main.Item().PaddingTop(6).Text("SUBJECT-WISE PERFORMANCE").FontSize(10).Bold().FontColor(thBg);
                main.Item().PaddingTop(2).Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(3);
                        c.RelativeColumn();
                        c.RelativeColumn();
                        c.RelativeColumn();
                        c.RelativeColumn();
                        c.RelativeColumn();
                    });

                    // Header
                    void Hdr(string text) => t.Cell().Background(thBg).Padding(4).AlignCenter().Text(text).FontSize(8).Bold().FontColor(thFg);
                    Hdr("Subject"); Hdr("Max Marks"); Hdr("Obtained"); Hdr("Percentage"); Hdr("Grade"); Hdr("Result");

                    foreach (var s in dto.Subjects)
                    {
                        t.Cell().BorderBottom(0.5f).Padding(4).Text(s.SubjectName).FontSize(8);
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignCenter().Text(s.AnnualMax?.ToString("F0") ?? "—").FontSize(8);
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignCenter().Text(s.AnnualObtained?.ToString("F0") ?? "—").FontSize(8).Bold();
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignCenter().Text(s.AnnualPercentage.HasValue ? $"{s.AnnualPercentage:F1}%" : "—").FontSize(8);
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignCenter().Text(s.FinalGrade ?? "—").FontSize(8).Bold().FontColor(thBg);
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignCenter()
                            .Text(s.IsPass ? "Pass" : "FAIL").FontSize(8).Bold()
                            .FontColor(s.IsPass ? QuestPDF.Helpers.Colors.Green.Darken2 : QuestPDF.Helpers.Colors.Red.Medium);
                    }
                });

                // Result summary
                main.Item().PaddingTop(6).Background(bg + "11").Padding(6).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text($"Total: {dto.TotalObtainedMarks:F0} / {dto.TotalMaxMarks:F0}").FontSize(9).Bold();
                        c.Item().Text($"Percentage: {dto.Percentage:F2}%").FontSize(9).Bold();
                    });
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text($"Overall Grade: {dto.OverallGrade ?? "—"}").FontSize(11).Bold().FontColor(thBg);
                        if (dto.CGPA.HasValue) c.Item().Text($"CGPA: {dto.CGPA:F1}").FontSize(9);
                    });
                    row.ConstantItem(100).AlignCenter().AlignMiddle()
                        .Text(dto.ResultStatus == "Pass" || dto.ResultStatus == "Promoted" ? "PASS ✓" : "FAIL ✗")
                        .FontSize(14).Bold()
                        .FontColor(dto.ResultStatus == "Pass" || dto.ResultStatus == "Promoted"
                            ? QuestPDF.Helpers.Colors.Green.Darken2
                            : QuestPDF.Helpers.Colors.Red.Medium);
                });

                // Attendance
                if (dto.Attendance != null)
                {
                    main.Item().PaddingTop(4).Text("ATTENDANCE SUMMARY").FontSize(9).Bold().FontColor(thBg);
                    main.Item().Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); });
                        void ACell(string l, string v)
                        {
                            t.Cell().Background(bg + "22").Padding(4).Text(l).FontSize(8).Bold();
                            t.Cell().Padding(4).Text(v).FontSize(8);
                        }
                        ACell("Working Days", dto.Attendance.TotalWorkingDays.ToString());
                        ACell("Days Present", dto.Attendance.DaysPresent.ToString());
                        ACell("Days Absent", dto.Attendance.DaysAbsent.ToString());
                        ACell("Attendance %", $"{dto.Attendance.AttendancePercentage:F1}%");
                    });
                }

                // Remarks
                if (!string.IsNullOrWhiteSpace(dto.TeacherRemarks) || !string.IsNullOrWhiteSpace(dto.PrincipalRemarks))
                {
                    main.Item().PaddingTop(4).Column(c =>
                    {
                        if (!string.IsNullOrWhiteSpace(dto.TeacherRemarks))
                            c.Item().Row(r =>
                            {
                                r.ConstantItem(90).Background(thBg).Padding(4).Text("Teacher Remarks").FontSize(8).Bold().FontColor(thFg);
                                r.RelativeItem().Border(0.5f).Padding(4).Text(dto.TeacherRemarks).FontSize(8);
                            });
                        if (!string.IsNullOrWhiteSpace(dto.PrincipalRemarks))
                            c.Item().Row(r =>
                            {
                                r.ConstantItem(90).Background(thBg).Padding(4).Text("Principal Remarks").FontSize(8).Bold().FontColor(thFg);
                                r.RelativeItem().Border(0.5f).Padding(4).Text(dto.PrincipalRemarks).FontSize(8);
                            });
                    });
                }

                if (dto.IsEdited)
                    main.Item().PaddingTop(4).Background(QuestPDF.Helpers.Colors.Red.Lighten4).Padding(4)
                        .Text($"★ CORRECTED DOCUMENT — {dto.EditRemarks}").FontSize(8).Italic().FontColor(QuestPDF.Helpers.Colors.Red.Darken2);

                // Signatures
                main.Item().PaddingTop(16).Row(row =>
                {
                    void Sig(string name, string label)
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().BorderTop(0.5f).PaddingTop(4).AlignCenter().Text(name).FontSize(8).Bold();
                            c.Item().AlignCenter().Text(label).FontSize(7).FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                        });
                    }
                    Sig(dto.ClassTeacherName ?? "Class Teacher", "Class Teacher's Signature");
                    Sig("", "Parent's / Guardian's Signature");
                    Sig(dto.PrincipalName ?? "Principal", "Principal's Signature");
                    Sig(dto.IssueDate.HasValue ? dto.IssueDate.Value.ToString("dd-MMM-yyyy") : "___________", "Date of Issue");
                });
            });
        }

        // ── Excel generation (ClosedXML) ──────────────────────────────────────
        private (byte[] Bytes, string ContentType, string FileName) GenerateExcel(List<ReportCardDocumentDto> dtos)
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Report Cards");

            // Header styling
            var headerStyle = ws.Style;
            headerStyle.Font.Bold = true;
            headerStyle.Fill.BackgroundColor = XLColor.FromHtml("#1565c0");
            headerStyle.Font.FontColor = XLColor.White;
            headerStyle.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // Title row
            ws.Cell(1, 1).Value = "STUDENT PROGRESS REPORT CARDS";
            var titleRange = ws.Range(1, 1, 1, 15);
            titleRange.Merge();
            titleRange.Style.Font.Bold = true;
            titleRange.Style.Font.FontSize = 14;
            titleRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#1565c0");
            titleRange.Style.Font.FontColor = XLColor.White;
            titleRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // Column headers
            var headers = new[] { "Student Name", "Admission No.", "Roll No.", "Class", "Section",
                "Academic Year", "Term", "Board", "Total Max", "Total Obtained", "Percentage",
                "Overall Grade", "CGPA", "Rank", "Result" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(2, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1565c0");
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            }

            int row = 3;
            foreach (var dto in dtos)
            {
                var rowStyle = ws.Row(row).Style;
                rowStyle.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                ws.Cell(row, 1).Value = dto.StudentName;
                ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                ws.Cell(row, 2).Value = dto.AdmissionNo ?? "";
                ws.Cell(row, 3).Value = dto.RollNumber ?? "";
                ws.Cell(row, 4).Value = dto.ClassName ?? "";
                ws.Cell(row, 5).Value = dto.SectionName ?? "";
                ws.Cell(row, 6).Value = dto.AcademicYear;
                ws.Cell(row, 7).Value = dto.Term;
                ws.Cell(row, 8).Value = dto.BoardType;
                ws.Cell(row, 9).Value = (double)dto.TotalMaxMarks;
                ws.Cell(row, 10).Value = (double)dto.TotalObtainedMarks;
                ws.Cell(row, 11).Value = (double)dto.Percentage;
                ws.Cell(row, 11).Style.NumberFormat.Format = "0.00";
                ws.Cell(row, 12).Value = dto.OverallGrade ?? "";
                ws.Cell(row, 13).Value = dto.CGPA.HasValue ? (double)dto.CGPA.Value : 0;
                ws.Cell(row, 14).Value = dto.ClassRank ?? 0;
                ws.Cell(row, 15).Value = dto.ResultStatus;

                // Color-code result
                var resultColor = dto.ResultStatus == "Pass" || dto.ResultStatus == "Promoted"
                    ? XLColor.FromHtml("#d4edda") : XLColor.FromHtml("#f8d7da");
                ws.Range(row, 1, row, 15).Style.Fill.BackgroundColor = resultColor;

                // Borders
                ws.Range(row, 1, row, 15).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

                row++;
            }

            // Subject detail sheets
            if (dtos.Any(d => d.Subjects.Any()))
            {
                var subWs = wb.Worksheets.Add("Subject Marks");
                var subHeaders = new[] { "Student Name", "Adm No.", "Subject", "Subject Code", "Max Marks", "Obtained", "Percentage", "Grade", "Result" };
                for (int i = 0; i < subHeaders.Length; i++)
                {
                    var cell = subWs.Cell(1, i + 1);
                    cell.Value = subHeaders[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2e7d32");
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                int subRow = 2;
                foreach (var dto in dtos)
                {
                    foreach (var s in dto.Subjects)
                    {
                        subWs.Cell(subRow, 1).Value = dto.StudentName;
                        subWs.Cell(subRow, 2).Value = dto.AdmissionNo ?? "";
                        subWs.Cell(subRow, 3).Value = s.SubjectName;
                        subWs.Cell(subRow, 4).Value = s.SubjectCode;
                        subWs.Cell(subRow, 5).Value = (double)(s.AnnualMax ?? 0);
                        subWs.Cell(subRow, 6).Value = (double)(s.AnnualObtained ?? 0);
                        subWs.Cell(subRow, 7).Value = s.AnnualPercentage.HasValue ? (double)s.AnnualPercentage.Value : 0;
                        subWs.Cell(subRow, 7).Style.NumberFormat.Format = "0.0";
                        subWs.Cell(subRow, 8).Value = s.FinalGrade ?? "";
                        subWs.Cell(subRow, 9).Value = s.IsPass ? "Pass" : "Fail";
                        subWs.Range(subRow, 1, subRow, 9).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                        subRow++;
                    }
                }
                subWs.Columns().AdjustToContents();
            }

            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            var name = dtos.Count == 1
                ? SanitizeFileName($"ReportCard_{dtos[0].StudentName}_{dtos[0].AcademicYear}")
                : SanitizeFileName($"ReportCards_{(dtos.FirstOrDefault()?.AcademicYear ?? "All")}");
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{name}.xlsx");
        }

        // ── CSV generation ────────────────────────────────────────────────────
        private (byte[] Bytes, string ContentType, string FileName) GenerateCsv(List<ReportCardDocumentDto> dtos)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Student Name,Admission No.,Class,Section,Academic Year,Term,Board,Total Max,Total Obtained,Percentage,Overall Grade,CGPA,Rank,Result");
            foreach (var dto in dtos)
                sb.AppendLine($"\"{dto.StudentName}\",\"{dto.AdmissionNo}\",\"{dto.ClassName}\",\"{dto.SectionName}\",\"{dto.AcademicYear}\",\"{dto.Term}\",\"{dto.BoardType}\",{dto.TotalMaxMarks:F0},{dto.TotalObtainedMarks:F0},{dto.Percentage:F2},\"{dto.OverallGrade}\",{dto.CGPA?.ToString("F1") ?? ""},\"{dto.ClassRank}\",\"{dto.ResultStatus}\"");

            var name = SanitizeFileName($"ReportCards_{dtos.FirstOrDefault()?.AcademicYear ?? "All"}");
            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"{name}.csv");
        }

        // ── HTML generation ───────────────────────────────────────────────────
        private (byte[] Bytes, string ContentType, string FileName) GenerateHtml(ReportCardDocumentDto dto)
        {
            var html = ReportCardTemplateEngine.Render(dto);
            var name = SanitizeFileName($"ReportCard_{dto.StudentName}_{dto.AcademicYear}_{dto.Term}");
            return (Encoding.UTF8.GetBytes(html), "text/html", $"{name}.html");
        }

        private (byte[] Bytes, string ContentType, string FileName) GenerateBulkHtml(List<ReportCardDocumentDto> dtos)
        {
            var allHtml = string.Join("<div style='page-break-after:always;'></div>",
                dtos.Select(d => ReportCardTemplateEngine.Render(d)));
            var name = SanitizeFileName($"ReportCards_{dtos.FirstOrDefault()?.AcademicYear ?? "All"}_{dtos.FirstOrDefault()?.Term ?? ""}");
            return (Encoding.UTF8.GetBytes(allHtml), "text/html", $"{name}.html");
        }

        // ── Certificate HTML render ───────────────────────────────────────────
        private static string RenderCertificateHtml(Certificate cert, string? templateStyle)
        {
            var style = templateStyle ?? "CBSE_Classic";
            var (bg, accent, _) = GetTemplateColors(style);
            var studentName = cert.Student != null ? $"{cert.Student.FirstName} {cert.Student.LastName}" : "";
            var html = cert.Template?.Template ?? string.Empty;

            // Replace standard placeholders
            html = html
                .Replace("{{StudentName}}", studentName)
                .Replace("{{CertificateNumber}}", cert.CertificateNumber)
                .Replace("{{IssueDate}}", cert.IssueDate.ToString("dd MMMM yyyy"))
                .Replace("{{SchoolName}}", cert.School?.Name ?? "School")
                .Replace("{{CertificateType}}", cert.CertificateType)
                .Replace("{{Title}}", cert.Title)
                .Replace("{{Content}}", cert.Content ?? "");

            if (string.IsNullOrWhiteSpace(html))
            {
                // Generate default certificate HTML
                html = $@"<!DOCTYPE html>
<html><head><meta charset='utf-8'/><style>
  body{{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#fff;}}
  .cert{{max-width:800px;margin:20px auto;border:8px double {bg};padding:40px;text-align:center;}}
  .header{{color:{bg};margin-bottom:20px;}}
  .school-name{{font-size:22px;font-weight:800;color:{bg};}}
  .cert-type{{font-size:32px;font-weight:800;color:{accent};margin:20px 0;letter-spacing:2px;text-transform:uppercase;}}
  .student-name{{font-size:24px;font-weight:700;color:#1a1a2e;border-bottom:2px solid {bg};display:inline-block;padding:0 20px;margin:10px 0;}}
  .content{{font-size:14px;line-height:2;color:#333;margin:20px 0;}}
  .signatures{{display:flex;justify-content:space-between;margin-top:50px;}}
  .sig{{text-align:center;}} .sig-line{{border-top:1px solid #333;padding-top:8px;min-width:120px;font-size:11px;color:#666;}}
  .cert-no{{font-size:10px;color:#888;margin-top:20px;}}
</style></head>
<body><div class='cert'>
  <div style='background:{bg};color:#fff;padding:12px;margin:-40px -40px 30px -40px;'>
    <div class='school-name'>{cert.School?.Name ?? "School"}</div>
    {(!string.IsNullOrWhiteSpace(cert.School?.Address) ? $"<div style='font-size:11px;opacity:0.85;'>{cert.School!.Address}</div>" : "")}
  </div>
  <div style='margin-bottom:16px;color:{accent};font-size:12px;font-weight:600;letter-spacing:3px;'>✦ CERTIFICATE ✦</div>
  <div class='cert-type'>{cert.CertificateType.Replace("Certificate","").Replace("Certificate","").Trim()}<br/>CERTIFICATE</div>
  <div class='content'>
    <div>This is to certify that</div>
    <div class='student-name'>{studentName}</div>
    <div style='margin-top:8px;'>{cert.Content ?? "has successfully completed the required curriculum."}</div>
  </div>
  <div class='cert-no'>Certificate No: {cert.CertificateNumber} &nbsp;|&nbsp; Date of Issue: {cert.IssueDate:dd MMMM yyyy}</div>
  <div class='signatures'>
    <div class='sig'><div class='sig-line'>Class Teacher</div></div>
    <div style='text-align:center;'><div style='width:80px;height:80px;border:1px solid {bg};margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;'>SCHOOL<br/>SEAL</div></div>
    <div class='sig'><div class='sig-line'>Principal</div></div>
  </div>
  {(cert.IssuedByStaff != null ? $"<div style='font-size:10px;color:#888;margin-top:16px;'>Issued by: {cert.IssuedByStaff.FirstName} {cert.IssuedByStaff.LastName}</div>" : "")}
</div></body></html>";
            }

            return html;
        }

        private (byte[] Bytes, string ContentType, string FileName) GeneratePdfFromHtml(string html, string baseName)
        {
            // Build a simple QuestPDF document embedding the HTML text content
            // (True HTML-to-PDF requires a headless browser; we use QuestPDF structured output)
            var doc = QuestPDF.Fluent.Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(15, Unit.Millimetre);
                    page.DefaultTextStyle(x => x.FontSize(10));
                    page.Content().AlignCenter().AlignMiddle()
                        .Text("Certificate document generated. Open the HTML version for full styling.")
                        .FontSize(12).Italic().FontColor(QuestPDF.Helpers.Colors.Grey.Medium);
                });
            });

            return (doc.GeneratePdf(), "application/pdf", $"{baseName}.pdf");
        }

        private static (string Bg, string Accent, string Fg) GetTemplateColors(string templateStyle) => templateStyle switch
        {
            "CBSE_Modern"       => ("1565c0", "0288d1", "ffffff"),
            "ICSE_Standard"     => ("1b5e20", "b8860b", "ffffff"),
            "StateBoard_Elite"  => ("283593", "ff6f00", "ffffff"),
            "Modern_Premium"    => ("4a148c", "7b1fa2", "ffffff"),
            _                   => ("800020", "1a237e", "ffffff")   // CBSE_Classic
        };

        private static CertificateResponse MapCertificateToResponse(Certificate cert)
        {
            return new CertificateResponse
            {
                Id = cert.Id,
                SchoolId = cert.SchoolId,
                CertificateNumber = cert.CertificateNumber,
                CertificateType = cert.CertificateType,
                Title = cert.Title,
                StudentId = cert.StudentId,
                StudentName = cert.Student != null ? $"{cert.Student.FirstName} {cert.Student.LastName}" : null,
                TemplateId = cert.TemplateId,
                Content = cert.Content,
                IssueDate = cert.IssueDate,
                ValidUntil = cert.ValidUntil,
                IssuedByStaffId = cert.IssuedByStaffId,
                Status = cert.Status,
                Metadata = cert.Metadata,
                IsPrinted = cert.IsPrinted,
                CreatedAt = cert.CreatedAt,
                UpdatedAt = cert.UpdatedAt
            };
        }

        private static string SanitizeFileName(string name) =>
            string.Concat(name.Select(c => char.IsLetterOrDigit(c) || c == '_' || c == '-' ? c : '_')).Trim('_');

        private static string EscapeJson(string s) =>
            s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
    }
}

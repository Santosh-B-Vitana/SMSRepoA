using Microsoft.EntityFrameworkCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SmsApi.Data;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public record HallTicketStudentDto(
        Guid EnrollmentId,
        Guid StudentId,
        string StudentName,
        string AdmissionNo,
        string RollNo,
        string HallTicketNo,
        string ClassName,
        string? SectionName
    );

    public interface IHallTicketService
    {
        Task<List<HallTicketStudentDto>> GetStudentsForHallTicketsAsync(Guid schoolId, Guid examSetupId);
        Task<(byte[] Bytes, string FileName)> GenerateHallTicketsPdfAsync(Guid schoolId, Guid examSetupId);
        Task<(byte[] Bytes, string FileName)> GenerateSingleHallTicketPdfAsync(Guid schoolId, Guid examSetupId, Guid enrollmentId);
    }

    public class HallTicketService : IHallTicketService
    {
        private readonly AppDbContext _db;
        private readonly IFileStorageService _files;
        private readonly Microsoft.Extensions.Logging.ILogger<HallTicketService> _log;

        public HallTicketService(AppDbContext db, IFileStorageService files,
            IHttpClientFactory http,
            Microsoft.Extensions.Logging.ILogger<HallTicketService> log)
        {
            _db = db;
            _files = files;
            _log = log;
        }

        // -- student list (for dialog) -----------------------------------------
        public async Task<List<HallTicketStudentDto>> GetStudentsForHallTicketsAsync(Guid schoolId, Guid examSetupId)
        {
            var examSetup = await _db.ExamSetups
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .FirstOrDefaultAsync(e => e.Id == examSetupId && e.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Exam setup not found.");

            var enrollQuery = _db.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.SchoolId == schoolId
                         && e.ClassId == examSetup.ClassId
                         && e.Status == "active");

            if (examSetup.SectionId.HasValue)
                enrollQuery = enrollQuery.Where(e => e.SectionId == examSetup.SectionId.Value);

            var enrollments = await enrollQuery
                .OrderBy(e => e.RollNumber)
                .ThenBy(e => e.Student!.Name)
                .ToListAsync();

            return enrollments.Select((enr, idx) => new HallTicketStudentDto(
                EnrollmentId:  enr.Id,
                StudentId:     enr.StudentId,
                StudentName:   BuildStudentName(enr.Student!),
                AdmissionNo:   enr.Student!.AdmissionNumber ?? "-",
                RollNo:        enr.RollNumber ?? enr.Student.RollNumber ?? "-",
                HallTicketNo:  BuildHallTicketNo(examSetup, idx + 1),
                ClassName:     enr.Class?.Name ?? examSetup.ClassRef?.Name ?? "-",
                SectionName:   enr.Section?.Name ?? examSetup.SectionRef?.Name
            )).ToList();
        }

        // -- single student PDF ------------------------------------------------
        public async Task<(byte[] Bytes, string FileName)> GenerateSingleHallTicketPdfAsync(
            Guid schoolId, Guid examSetupId, Guid enrollmentId)
        {
            var (examSetup, school) = await LoadExamAndSchool(schoolId, examSetupId);

            var enrollQuery = _db.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.SchoolId == schoolId && e.ClassId == examSetup.ClassId && e.Status == "active");
            if (examSetup.SectionId.HasValue)
                enrollQuery = enrollQuery.Where(e => e.SectionId == examSetup.SectionId.Value);

            var allEnrollments = await enrollQuery
                .OrderBy(e => e.RollNumber).ThenBy(e => e.Student!.Name).ToListAsync();

            var enrWithIdx = allEnrollments
                .Select((e, i) => (Enrollment: e, Index: i + 1))
                .FirstOrDefault(x => x.Enrollment.Id == enrollmentId);

            if (enrWithIdx.Enrollment == null)
                throw new KeyNotFoundException("Student enrollment not found for this exam.");

            var logoBytes  = await TryGetBytes(school.Logo);
            var photoBytes = await TryGetBytes(enrWithIdx.Enrollment.Student!.PhotoUrl);

            var ticket = BuildModel(enrWithIdx.Enrollment, enrWithIdx.Index, examSetup, photoBytes);
            var pdfBytes = await BuildPdfAsync(school, examSetup, new List<HallTicketModel> { ticket }, logoBytes);
            var safeName = SanitizeFileName($"HallTicket_{ticket.HallTicketNo}_{ticket.StudentName}");
            return (pdfBytes, $"{safeName}.pdf");
        }

        // -- all students PDF --------------------------------------------------
        public async Task<(byte[] Bytes, string FileName)> GenerateHallTicketsPdfAsync(
            Guid schoolId, Guid examSetupId)
        {
            var (examSetup, school) = await LoadExamAndSchool(schoolId, examSetupId);

            var enrollQuery = _db.StudentEnrollments
                .Include(e => e.Student)
                .Include(e => e.Class)
                .Include(e => e.Section)
                .Where(e => e.SchoolId == schoolId && e.ClassId == examSetup.ClassId && e.Status == "active");
            if (examSetup.SectionId.HasValue)
                enrollQuery = enrollQuery.Where(e => e.SectionId == examSetup.SectionId.Value);

            var enrollments = await enrollQuery
                .OrderBy(e => e.RollNumber).ThenBy(e => e.Student!.Name).ToListAsync();

            if (enrollments.Count == 0)
                throw new InvalidOperationException("No active students found for this class/section.");

            var logoBytes = await TryGetBytes(school.Logo);

            // Load all photos in parallel
            var photoTasks = enrollments.Select(e => TryGetBytes(e.Student!.PhotoUrl)).ToList();
            var photos = await Task.WhenAll(photoTasks);

            var tickets = enrollments.Select((enr, idx) => BuildModel(enr, idx + 1, examSetup, photos[idx])).ToList();

            var pdfBytes = await BuildPdfAsync(school, examSetup, tickets, logoBytes);
            var safeName = SanitizeFileName($"HallTickets_{examSetup.Name}_{examSetup.AcademicYear}");
            return (pdfBytes, $"{safeName}.pdf");
        }

        // -- shared helpers ----------------------------------------------------

        private async Task<(ExamSetup, School)> LoadExamAndSchool(Guid schoolId, Guid examSetupId)
        {
            var examSetup = await _db.ExamSetups
                .Include(e => e.ExamTypeRef)
                .Include(e => e.ClassRef)
                .Include(e => e.SectionRef)
                .Include(e => e.Subjects.OrderBy(s => s.SubjectOrder))
                    .ThenInclude(s => s.Subject)
                .FirstOrDefaultAsync(e => e.Id == examSetupId && e.SchoolId == schoolId)
                ?? throw new KeyNotFoundException("Exam setup not found.");

            var school = await _db.Schools.FindAsync(schoolId)
                ?? throw new KeyNotFoundException("School not found.");

            return (examSetup, school);
        }

        private async Task<byte[]?> TryGetBytes(string? key)
        {
            if (string.IsNullOrWhiteSpace(key)) return null;
            // Skip data URIs and known UI placeholder paths (e.g. "/placeholder.svg")
            if (key.StartsWith("data:")) return null;
            if (key.Contains("placeholder", StringComparison.OrdinalIgnoreCase) && !key.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return null;
            try
            {
                // Use _files.GetAsync for everything — it handles full S3 URLs via ExtractKeyFromUrl
                // and local "/files/..." paths via LocalFileStorageService
                return await _files.GetAsync(key);
            }
            catch { return null; }
        }

        private static HallTicketModel BuildModel(
            StudentEnrollment enr, int idx, ExamSetup examSetup, byte[]? photoBytes)
        {
            return new HallTicketModel
            {
                SerialNo      = idx,
                HallTicketNo  = BuildHallTicketNo(examSetup, idx),
                StudentName   = BuildStudentName(enr.Student!),
                AdmissionNo   = enr.Student!.AdmissionNumber ?? "-",
                RollNo        = enr.RollNumber ?? enr.Student.RollNumber ?? "-",
                ClassName     = enr.Class?.Name ?? examSetup.ClassRef?.Name ?? "-",
                SectionName   = enr.Section?.Name ?? examSetup.SectionRef?.Name,
                DateOfBirth   = enr.Student.DateOfBirth.ToString("dd-MMM-yyyy"),
                ExamName      = examSetup.Name,
                AcademicYear  = examSetup.AcademicYear,
                PhotoBytes    = photoBytes,
                Subjects      = examSetup.Subjects.Select(s => new HallTicketSubjectRow
                {
                    SubjectName = s.Subject?.Name ?? "-",
                    SubjectCode = s.Subject?.Code,
                    ExamDate    = s.ExamDate,
                    StartTime   = s.StartTime,
                    EndTime     = s.EndTime,
                    Venue       = s.Venue,
                    MaxMarks    = s.MaxTotalMarks,
                }).ToList(),
            };
        }

        // ----------------------------------------------------------------------
        // PDF RENDERING  (1 ticket per A4 page  -  full-page, industry-grade)
        // ----------------------------------------------------------------------

        private static double Mm(double mm) => mm * 2.8346;
        private static XColor Rgb(int r, int g, int b) => XColor.FromArgb(r, g, b);
        private static XColor Rgba(int r, int g, int b, int a) => XColor.FromArgb(a, r, g, b);

        // Brand palette
        private static readonly XColor ColPrimary   = XColor.FromArgb(21, 52, 112);   // deep navy
        private static readonly XColor ColAccent    = XColor.FromArgb(220, 38, 38);   // crimson
        private static readonly XColor ColGold      = XColor.FromArgb(202, 138, 4);   // gold
        private static readonly XColor ColLightBlue = XColor.FromArgb(239, 246, 255); // pale blue
        private static readonly XColor ColBorder    = XColor.FromArgb(186, 202, 224); // slate border
        private static readonly XColor ColText      = XColor.FromArgb(17, 24, 39);
        private static readonly XColor ColMuted     = XColor.FromArgb(107, 114, 128);
        private static readonly XColor ColWhite     = XColors.White;

        private async Task<byte[]> BuildPdfAsync(
            School school, ExamSetup examSetup, List<HallTicketModel> tickets, byte[]? logoBytes)
        {
            var document = new PdfDocument();
            document.Info.Title   = $"Hall Tickets - {Px(examSetup.Name)}";
            document.Info.Creator = school.Name;

            foreach (var ticket in tickets)
                DrawPage(document, school, examSetup, ticket, logoBytes);

            using var ms = new MemoryStream();
            document.Save(ms, false);
            return ms.ToArray();
        }

        private void DrawPage(PdfDocument doc, School school, ExamSetup examSetup,
            HallTicketModel t, byte[]? logoBytes)
        {
            var page = doc.AddPage();
            page.Size = PdfSharpCore.PageSize.A4;
            double W = page.Width.Point;   // 595.28
            double H = page.Height.Point;  // 841.89

            using var gfx = XGraphics.FromPdfPage(page);

            double mg = Mm(14);          // outer margin
            double iW = W - 2 * mg;      // inner width  = 567.28 - 28 â‰ˆ 539
            double y  = mg;              // running Y cursor

            // -- Outer card border ---------------------------------------------
            var outerPen = new XPen(ColPrimary, 1.5);
            gfx.DrawRectangle(outerPen, mg, y, iW, H - 2 * mg);

            // -- TOP DOUBLE RULE -----------------------------------------------
            gfx.DrawRectangle(new XSolidBrush(ColPrimary), mg, y, iW, 5);
            gfx.DrawRectangle(new XSolidBrush(ColGold),    mg, y + 5, iW, 2.5);
            y += 7.5;

            // -- HEADER: logo + school name + "HALL TICKET" badge --------------
            double headerH = Mm(24);
            gfx.DrawRectangle(new XSolidBrush(ColPrimary), mg, y, iW, headerH);

            double hPad = Mm(4);
            double logoSz = headerH - Mm(6);
            double logoX  = mg + hPad;
            double logoY  = y + (headerH - logoSz) / 2;

            // School logo
            if (logoBytes != null)
            {
                try
                {
                    byte[] pngLogoBytes;
                    using (var imgSharp = SixLabors.ImageSharp.Image.Load(logoBytes))
                    using (var pngStream = new MemoryStream())
                    {
                        imgSharp.SaveAsPng(pngStream);
                        pngLogoBytes = pngStream.ToArray();
                    }
                    var logoImg = XImage.FromStream(() => new MemoryStream(pngLogoBytes));
                    // Fit logo proportionally in logoSz Ã- logoSz square
                    double aspect = logoImg.PixelWidth > 0
                        ? (double)logoImg.PixelHeight / logoImg.PixelWidth : 1;
                    double lW = aspect <= 1 ? logoSz : logoSz / aspect;
                    double lH = aspect <= 1 ? logoSz * aspect : logoSz;
                    gfx.DrawImage(logoImg, logoX, logoY + (logoSz - lH) / 2, lW, lH);
                    logoX += lW + Mm(3);
                }
                catch (Exception ex) { _log.LogError(ex, "[HallTicket] Logo render failed"); logoX += Mm(2); }
            }
            else
            {
                // Circular placeholder
                gfx.DrawEllipse(new XSolidBrush(XColor.FromArgb(60, 255, 255, 255)),
                    logoX, logoY, logoSz, logoSz);
                gfx.DrawString(school.Name.Length > 0 ? school.Name[0].ToString() : "S",
                    new XFont("Arial", 14, XFontStyle.Bold), XBrushes.White,
                    new XRect(logoX, logoY, logoSz, logoSz), XStringFormats.Center);
                logoX += logoSz + Mm(3);
            }

            // School name & details (left side of header)
            double textAreaW = iW - (logoX - mg) - Mm(36);
            var fontSchoolName = new XFont("Arial", 13, XFontStyle.Bold);
            var fontSchoolSub  = new XFont("Arial", 7.5);
            gfx.DrawString(Px(school.Name).ToUpperInvariant(), fontSchoolName, XBrushes.White,
                new XRect(logoX, y + Mm(4), textAreaW, Mm(7)), XStringFormats.TopLeft);

            double subY = y + Mm(11);
            if (!string.IsNullOrWhiteSpace(school.Address))
            {
                gfx.DrawString(Px(school.Address), fontSchoolSub,
                    new XSolidBrush(Rgb(203, 213, 225)),
                    new XRect(logoX, subY, textAreaW, Mm(4)), XStringFormats.TopLeft);
                subY += Mm(4);
            }
            string contactLine = string.Join("   |   ",
                new[] {
                    string.IsNullOrWhiteSpace(school.Phone) ? null : $"Ph: {school.Phone}",
                    string.IsNullOrWhiteSpace(school.Email) ? null : school.Email
                }.Where(s => s != null));
            if (!string.IsNullOrWhiteSpace(contactLine))
                gfx.DrawString(Px(contactLine), fontSchoolSub, new XSolidBrush(Rgb(148, 163, 184)),
                    new XRect(logoX, subY, textAreaW, Mm(4)), XStringFormats.TopLeft);

            // "HALL TICKET" badge (right side of header)
            double badgeW = Mm(34), badgeH = Mm(10);
            double badgeX = mg + iW - badgeW - Mm(4);
            double badgeY = y + (headerH - badgeH) / 2;
            gfx.DrawRectangle(new XSolidBrush(ColAccent), badgeX, badgeY, badgeW, badgeH);
            gfx.DrawString("HALL TICKET", new XFont("Arial", 9, XFontStyle.Bold),
                XBrushes.White,
                new XRect(badgeX, badgeY, badgeW, badgeH), XStringFormats.Center);

            y += headerH;

            // Gold accent line below header
            gfx.DrawRectangle(new XSolidBrush(ColGold), mg, y, iW, 2);
            y += 2;

            // -- EXAM INFO STRIPE ----------------------------------------------
            double stripeH = Mm(9);
            gfx.DrawRectangle(new XSolidBrush(ColLightBlue), mg, y, iW, stripeH);

            var fontExamBold = new XFont("Arial", 9.5, XFontStyle.Bold);
            var fontExamSub  = new XFont("Arial", 8);
            string classLabel = Px(t.ClassName) + (string.IsNullOrWhiteSpace(t.SectionName) ? "" : $"  -  {Px(t.SectionName)}");
            gfx.DrawString(Px(t.ExamName), fontExamBold, new XSolidBrush(ColPrimary),
                new XRect(mg + Mm(4), y + 3, iW * 0.55, stripeH - 4), XStringFormats.TopLeft);
            gfx.DrawString($"Class: {classLabel}   |   Academic Year: {Px(t.AcademicYear)}", fontExamSub,
                new XSolidBrush(ColMuted),
                new XRect(mg + iW * 0.55, y + 4, iW * 0.42, stripeH - 6), XStringFormats.TopRight);

            // thin border top/bottom
            gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y, mg + iW, y);
            gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y + stripeH, mg + iW, y + stripeH);
            y += stripeH;

            // -- STUDENT DETAILS + PHOTO BLOCK ---------------------------------
            double detBlockH = Mm(46);
            double photoW    = Mm(28);
            double photoH    = Mm(36);
            double photoX    = mg + iW - photoW - Mm(5);
            double photoY    = y + (detBlockH - photoH) / 2;
            double detW      = iW - photoW - Mm(14);

            // Light background for student area
            gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(252, 253, 255)),
                mg, y, iW, detBlockH);

            // Photo box
            bool photoDrawn = false;
            if (t.PhotoBytes != null)
            {
                try
                {
                    // Convert to PNG via ImageSharp to handle any input format (JPEG, WebP, HEIC, etc.)
                    byte[] pngBytes;
                    using (var imgSharp = SixLabors.ImageSharp.Image.Load(t.PhotoBytes))
                    using (var pngStream = new MemoryStream())
                    {
                        imgSharp.SaveAsPng(pngStream);
                        pngBytes = pngStream.ToArray();
                    }
                    var photoImg = XImage.FromStream(() => new MemoryStream(pngBytes));
                    // crop to fit aspect-ratio inside box
                    double aspect = photoImg.PixelWidth > 0
                        ? (double)photoImg.PixelHeight / photoImg.PixelWidth : 1.25;
                    double pW, pH;
                    if (aspect >= photoH / photoW)
                    { pW = photoH / aspect; pH = photoH; }
                    else
                    { pW = photoW; pH = photoW * aspect; }
                    double pX = photoX + (photoW - pW) / 2;
                    double pY = photoY + (photoH - pH) / 2;
                    // white background behind photo
                    gfx.DrawRectangle(XBrushes.White, photoX, photoY, photoW, photoH);
                    gfx.DrawImage(photoImg, pX, pY, pW, pH);
                    photoDrawn = true;
                }
                catch (Exception ex) { _log.LogError(ex, "[HallTicket] Photo render failed for {Name}", t.StudentName); }
            }
            if (!photoDrawn)
            {
                // Initials-based placeholder: light blue-grey background with student's initials
                gfx.DrawRectangle(new XSolidBrush(Rgb(219, 228, 242)), photoX, photoY, photoW, photoH);
                var parts    = t.StudentName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var initials = parts.Length >= 2
                    ? $"{parts[0][0]}{parts[^1][0]}"
                    : (parts.Length == 1 ? parts[0][0].ToString() : "?");
                var fontInit = new XFont("Arial", photoW * 0.38, XFontStyle.Bold);
                gfx.DrawString(initials.ToUpperInvariant(), fontInit, new XSolidBrush(Rgb(59, 93, 147)),
                    new XRect(photoX, photoY, photoW, photoH), XStringFormats.Center);
            }
            // Photo border
            gfx.DrawRectangle(new XPen(ColBorder, 0.75), photoX, photoY, photoW, photoH);

            // Student detail fields (left side)
            var fontLabel = new XFont("Arial", 7.5);
            var fontValue = new XFont("Arial", 8.5, XFontStyle.Bold);
            var fontValueNorm = new XFont("Arial", 8);

            double dX   = mg + Mm(5);
            double dY   = y + Mm(5);
            double rowH = Mm(7);

            void Field(string label, string value, bool bold = false, double? extraWidth = null)
            {
                double fW = extraWidth ?? detW;
                gfx.DrawString(label.ToUpperInvariant(), fontLabel,
                    new XSolidBrush(ColMuted), new XRect(dX, dY, 80, Mm(4)), XStringFormats.TopLeft);
                gfx.DrawString(value, bold ? fontValue : fontValueNorm,
                    new XSolidBrush(ColText), new XRect(dX, dY + Mm(3.5), fW, Mm(5)), XStringFormats.TopLeft);
                // underline
                gfx.DrawLine(new XPen(ColBorder, 0.4), dX, dY + rowH - 1, dX + fW * 0.9, dY + rowH - 1);
                dY += rowH + Mm(1);
            }

            // Hall ticket no - large highlight box
            double htBoxH = Mm(9);
            gfx.DrawRectangle(new XSolidBrush(ColPrimary), dX, dY, detW * 0.55, htBoxH);
            gfx.DrawString("HALL TICKET NUMBER", new XFont("Arial", 6.5),
                new XSolidBrush(Rgb(148, 163, 184)), new XRect(dX + 5, dY + 2, detW * 0.55 - 6, Mm(4)),
                XStringFormats.TopLeft);
            gfx.DrawString(t.HallTicketNo, new XFont("Arial", 13, XFontStyle.Bold),
                XBrushes.White, new XRect(dX + 5, dY + Mm(3.5), detW * 0.55 - 6, Mm(6)),
                XStringFormats.TopLeft);
            dY += htBoxH + Mm(2.5);

            Field("Student Name",    Px(t.StudentName).ToUpperInvariant(), bold: true);
            Field("Date of Birth",   t.DateOfBirth);

            // Two-column row: Admission No & Roll No
            double half = detW * 0.45;
            gfx.DrawString("ADMISSION NO", fontLabel, new XSolidBrush(ColMuted),
                new XRect(dX, dY, 80, Mm(4)), XStringFormats.TopLeft);
            gfx.DrawString("ROLL NUMBER", fontLabel, new XSolidBrush(ColMuted),
                new XRect(dX + half + Mm(3), dY, 80, Mm(4)), XStringFormats.TopLeft);
            gfx.DrawString(t.AdmissionNo, fontValueNorm, new XSolidBrush(ColText),
                new XRect(dX, dY + Mm(3.5), half, Mm(5)), XStringFormats.TopLeft);
            gfx.DrawString(t.RollNo, fontValueNorm, new XSolidBrush(ColText),
                new XRect(dX + half + Mm(3), dY + Mm(3.5), half, Mm(5)), XStringFormats.TopLeft);
            gfx.DrawLine(new XPen(ColBorder, 0.4), dX, dY + rowH - 1, dX + half * 0.9, dY + rowH - 1);
            gfx.DrawLine(new XPen(ColBorder, 0.4), dX + half + Mm(3), dY + rowH - 1,
                dX + half + Mm(3) + half * 0.9, dY + rowH - 1);

            y += detBlockH;
            gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y, mg + iW, y);

            // -- SUBJECT SCHEDULE TABLE ----------------------------------------
            if (t.Subjects.Any())
            {
                // Section header
                double sHdrH = Mm(7);
                gfx.DrawRectangle(new XSolidBrush(Rgb(30, 58, 95)), mg, y, iW, sHdrH);
                gfx.DrawString("EXAMINATION SCHEDULE", new XFont("Arial", 8.5, XFontStyle.Bold),
                    XBrushes.White, new XRect(mg + Mm(4), y + 2, iW - Mm(8), sHdrH - 4),
                    XStringFormats.TopLeft);
                y += sHdrH;

                // Column widths
                double c1 = iW * 0.28, c2 = iW * 0.17, c3 = iW * 0.22,
                       c4 = iW * 0.20, c5 = iW * 0.13;
                double tRH = Mm(6.5);

                // Table header
                gfx.DrawRectangle(new XSolidBrush(Rgb(240, 244, 252)), mg, y, iW, tRH);
                var tHdrFont = new XFont("Arial", 7.5, XFontStyle.Bold);
                var hInk = new XSolidBrush(Rgb(30, 58, 95));
                double hx = mg + Mm(2);
                gfx.DrawString("SUBJECT",    tHdrFont, hInk, new XRect(hx, y + 2, c1 - 4, tRH - 2), XStringFormats.TopLeft);  hx += c1;
                gfx.DrawString("DATE",       tHdrFont, hInk, new XRect(hx, y + 2, c2,     tRH - 2), XStringFormats.TopCenter); hx += c2;
                gfx.DrawString("TIMINGS",    tHdrFont, hInk, new XRect(hx, y + 2, c3,     tRH - 2), XStringFormats.TopCenter); hx += c3;
                gfx.DrawString("VENUE",      tHdrFont, hInk, new XRect(hx, y + 2, c4,     tRH - 2), XStringFormats.TopCenter); hx += c4;
                gfx.DrawString("MAX MARKS",  tHdrFont, hInk, new XRect(hx, y + 2, c5 - 4, tRH - 2), XStringFormats.TopCenter);
                gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y + tRH, mg + iW, y + tRH);
                y += tRH;

                var tRowFont = new XFont("Arial", 8);
                var tRowBold = new XFont("Arial", 8, XFontStyle.Bold);
                for (int r = 0; r < t.Subjects.Count; r++)
                {
                    var s = t.Subjects[r];
                    XBrush bg = r % 2 == 0 ? XBrushes.White : new XSolidBrush(Rgb(248, 250, 255));
                    gfx.DrawRectangle(bg, mg, y, iW, tRH);

                    string subLabel = s.SubjectName;
                    if (!string.IsNullOrWhiteSpace(s.SubjectCode))
                        subLabel += $" ({s.SubjectCode})";

                    var rInk = new XSolidBrush(ColText);
                    double rx = mg + Mm(2);
                    gfx.DrawString(Px(subLabel), tRowBold, rInk, new XRect(rx, y + 2, c1 - 4, tRH - 2), XStringFormats.TopLeft);  rx += c1;
                    gfx.DrawString(FmtDate(s.ExamDate), tRowFont, rInk, new XRect(rx, y + 2, c2, tRH - 2), XStringFormats.TopCenter); rx += c2;
                    gfx.DrawString(FmtTimeRange(s.StartTime, s.EndTime), tRowFont, rInk, new XRect(rx, y + 2, c3, tRH - 2), XStringFormats.TopCenter); rx += c3;
                    gfx.DrawString(Px(s.Venue ?? "-"), tRowFont, rInk, new XRect(rx, y + 2, c4, tRH - 2), XStringFormats.TopCenter); rx += c4;
                    gfx.DrawString(s.MaxMarks > 0 ? s.MaxMarks.ToString("0") : "-",
                        tRowFont, rInk, new XRect(rx, y + 2, c5 - 4, tRH - 2), XStringFormats.TopCenter);
                    gfx.DrawLine(new XPen(ColBorder, 0.3), mg, y + tRH, mg + iW, y + tRH);
                    y += tRH;
                }
                gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y, mg + iW, y);
            }

            // -- INSTRUCTIONS --------------------------------------------------
            double insH = Mm(28);
            gfx.DrawRectangle(new XSolidBrush(Rgb(255, 252, 235)), mg, y, iW, insH);
            // amber left strip
            gfx.DrawRectangle(new XSolidBrush(Rgb(217, 119, 6)), mg, y, 4, insH);

            gfx.DrawString("IMPORTANT INSTRUCTIONS", new XFont("Arial", 7.5, XFontStyle.Bold),
                new XSolidBrush(Rgb(146, 64, 14)),
                new XRect(mg + 10, y + Mm(2), iW - 14, Mm(5)), XStringFormats.TopLeft);

            string[] instructions = {
                "1.  This Hall Ticket is the candidate's authorisation to appear in the examination. No candidate will be admitted without it.",
                "2.  Candidates must report to the Examination Hall at least 15 minutes before the commencement of each paper.",
                "3.  No electronic devices including mobile phones, smart watches or calculators are permitted unless specified.",
                "4.  Any damage to / loss of this Hall Ticket must be immediately reported to the school office.",
                "5.  This Hall Ticket is valid only for the examinations listed above and for the Academic Year " + t.AcademicYear + ".",
            };
            var insFont = new XFont("Arial", 7);
            double insY = y + Mm(7);
            foreach (var line in instructions)
            {
                gfx.DrawString(line, insFont, new XSolidBrush(Rgb(120, 53, 15)),
                    new XRect(mg + 10, insY, iW - 14, Mm(5)), XStringFormats.TopLeft);
                insY += Mm(4.5);
            }
            y += insH;
            gfx.DrawLine(new XPen(ColBorder, 0.5), mg, y, mg + iW, y);

            // -- SIGNATURE STRIP -----------------------------------------------
            double sigH = Mm(20);
            gfx.DrawRectangle(XBrushes.White, mg, y, iW, sigH);

            string[] sigLabels = { "Candidate's Signature", "Parent / Guardian Signature", "Principal's Signature" };
            double sigColW = iW / 3;
            var sigFont    = new XFont("Arial", 7);
            for (int s2 = 0; s2 < 3; s2++)
            {
                double sx = mg + s2 * sigColW;
                double lineY = y + Mm(13);
                double lineX1 = sx + Mm(4);
                double lineX2 = sx + sigColW - Mm(4);
                gfx.DrawLine(new XPen(ColBorder, 0.75), lineX1, lineY, lineX2, lineY);
                gfx.DrawString(sigLabels[s2], sigFont, new XSolidBrush(ColMuted),
                    new XRect(sx, lineY + 3, sigColW, Mm(5)), XStringFormats.TopCenter);
                if (s2 > 0)
                    gfx.DrawLine(new XPen(ColBorder, 0.4), sx, y + Mm(2), sx, y + sigH - Mm(2));
            }

            // -- BOTTOM RULE ---------------------------------------------------
            double botY = mg + (H - 2 * mg) - 7.5;
            gfx.DrawRectangle(new XSolidBrush(ColGold),    mg, botY, iW, 2.5);
            gfx.DrawRectangle(new XSolidBrush(ColPrimary), mg, botY + 2.5, iW, 5);

            // Footer text
            var footerFont = new XFont("Arial", 6.5);
            string footer  = $"{Px(school.Name)}   |   {Px(t.ExamName)}   |   {Px(t.AcademicYear)}   |   Generated on {DateTime.UtcNow:dd MMM yyyy}";
            gfx.DrawString(footer, footerFont, new XSolidBrush(Rgb(148, 163, 184)),
                new XRect(mg, botY - 10, iW, 9), XStringFormats.TopCenter);
        }

        // ----------------------------------------------------------------------
        // Helpers
        // ----------------------------------------------------------------------

        private static string BuildHallTicketNo(ExamSetup setup, int seq)
        {
            var classAbbr = (setup.ClassRef?.Name ?? "XX").Length <= 4
                ? (setup.ClassRef?.Name ?? "XX")
                : (setup.ClassRef?.Name ?? "XX")[..4];
            var sectionAbbr = setup.SectionRef?.Name?.Length > 0
                ? setup.SectionRef.Name[..1].ToUpperInvariant()
                : "";
            var examAbbr = (setup.ExamTypeRef?.Name ?? setup.CustomTypeName ?? "EX")
                .Split(' ').Select(w => w.Length > 0 ? w[..1].ToUpperInvariant() : "").Take(2).Aggregate("", string.Concat);
            return $"{examAbbr}{classAbbr}{sectionAbbr}-{seq:D3}";
        }

        private static string BuildStudentName(Student s)
        {
            var full = $"{s.FirstName} {s.MiddleName} {s.LastName}".Replace("  ", " ").Trim();
            return string.IsNullOrWhiteSpace(full) ? s.Name : full;
        }

        private static string FmtDate(DateTime? d)
        {
            if (!d.HasValue) return "-";
            return d.Value.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) + " " +
                   d.Value.ToString("ddd", CultureInfo.InvariantCulture).ToUpperInvariant();
        }

        private static string FmtTimeRange(string? start, string? end)
        {
            if (string.IsNullOrWhiteSpace(start)) return "-";
            string Fmt12(string t)
            {
                if (!TimeSpan.TryParse(t, out var ts)) return t;
                return DateTime.Today.Add(ts).ToString("h:mm tt", CultureInfo.InvariantCulture);
            }
            return string.IsNullOrWhiteSpace(end) ? Fmt12(start) : $"{Fmt12(start)} - {Fmt12(end)}";
        }

        private static string SanitizeFileName(string name) =>
            string.Concat(name.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));

        /// <summary>
        /// Sanitize a string for PDF rendering with Arial which only supports Latin-1.
        /// Replaces common Unicode punctuation with ASCII equivalents and strips the rest.
        /// </summary>
        private static string Px(string? s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new System.Text.StringBuilder(s.Length);
            foreach (char c in s)
            {
                switch (c)
                {
                    case '\u2013': case '\u2014': case '\u2012': case '\u2011': case '\u2010':
                        sb.Append('-'); break;
                    case '\u2018': case '\u2019':
                        sb.Append('\''); break;
                    case '\u201C': case '\u201D':
                        sb.Append('"'); break;
                    case '\u00A0': case '\u202F': case '\u2009':
                        sb.Append(' '); break;
                    case '\u2022': case '\u2023':
                        sb.Append('*'); break;
                    case '\u2026':
                        sb.Append("..."); break;
                    default:
                        // Latin-1 range (0-255): Arial can handle it
                        if (c <= 255) sb.Append(c);
                        // else: strip — non-Latin chars render as boxes anyway
                        break;
                }
            }
            return sb.ToString();
        }
    }

    // -- Internal models -------------------------------------------------------

    internal class HallTicketModel
    {
        public int SerialNo { get; set; }
        public string HallTicketNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string? SectionName { get; set; }
        public string DateOfBirth { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public byte[]? PhotoBytes { get; set; }
        public List<HallTicketSubjectRow> Subjects { get; set; } = new();
    }

    internal class HallTicketSubjectRow
    {
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public DateTime? ExamDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? Venue { get; set; }
        public decimal MaxMarks { get; set; }
    }
}

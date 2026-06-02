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
        // PDF RENDERING  –  Ultra-professional "Board Exam" grade layout
        // One hall ticket per A4 page.
        // Inspired by CBSE / ICSE / university admit-card conventions.
        // ----------------------------------------------------------------------

        private static double Mm(double mm) => mm * 2.8346;
        private static XColor Rgb(int r, int g, int b) => XColor.FromArgb(r, g, b);
        private static XColor Rgba(int r, int g, int b, int a) => XColor.FromArgb(a, r, g, b);

        // ── Colour tokens ──────────────────────────────────────────────────────
        private static readonly XColor ColNavy      = XColor.FromArgb(10,  36,  99);   // deep navy
        private static readonly XColor ColNavyMid   = XColor.FromArgb(30,  64, 175);   // mid navy (accent)
        private static readonly XColor ColGold      = XColor.FromArgb(180, 130,  20);  // rich gold
        private static readonly XColor ColGoldLight = XColor.FromArgb(252, 243, 207);  // gold tint bg
        private static readonly XColor ColRed       = XColor.FromArgb(185,  28,  28);  // warning red
        private static readonly XColor ColBg        = XColor.FromArgb(249, 250, 255);  // near-white bg
        private static readonly XColor ColBorder    = XColor.FromArgb(191, 210, 235);  // steel border
        private static readonly XColor ColText      = XColor.FromArgb( 15,  23,  42);  // near-black
        private static readonly XColor ColMuted     = XColor.FromArgb( 71,  85, 105);  // slate muted
        private static readonly XColor ColTableEven = XColor.FromArgb(240, 246, 255);  // row stripe
        private static readonly XColor ColWhite     = XColors.White;

        private async Task<byte[]> BuildPdfAsync(
            School school, ExamSetup examSetup, List<HallTicketModel> tickets, byte[]? logoBytes)
        {
            var document = new PdfDocument();
            document.Info.Title   = $"Hall Tickets – {Px(examSetup.Name)}";
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
            double W = page.Width.Point;    // 595.28
            double H = page.Height.Point;   // 841.89

            using var gfx = XGraphics.FromPdfPage(page);

            // ── helpers ────────────────────────────────────────────────────────
            void HLine(double x, double yy, double w, XPen pen) =>
                gfx.DrawLine(pen, x, yy, x + w, yy);
            void VLine(double xx, double y1, double y2, XPen pen) =>
                gfx.DrawLine(pen, xx, y1, xx, y2);
            void FillRect(double x, double yy, double w, double h, XColor c) =>
                gfx.DrawRectangle(new XSolidBrush(c), x, yy, w, h);
            void StrokeRect(double x, double yy, double w, double h, XPen pen) =>
                gfx.DrawRectangle(pen, x, yy, w, h);
            void Txt(string text, XFont font, XColor ink, XRect rect,
                     XStringFormat fmt, bool clip = false) =>
                gfx.DrawString(text, font, new XSolidBrush(ink), rect, fmt);

            double mg  = Mm(12);          // outer margin
            double iW  = W - 2 * mg;      // content width ≈ 539 pt
            double cY  = mg;              // running Y cursor

            // ── PAGE BACKGROUND ────────────────────────────────────────────────
            FillRect(0, 0, W, H, Rgb(245, 248, 255));

            // ── DIAGONAL WATERMARK ─────────────────────────────────────────────
            {
                var wmState = gfx.Save();
                gfx.TranslateTransform(W / 2, H / 2);
                gfx.RotateTransform(-42);
                var wmFont = new XFont("Arial", 68, XFontStyle.Bold);
                gfx.DrawString("ADMIT CARD", wmFont,
                    new XSolidBrush(XColor.FromArgb(10, 30, 70, 160)),
                    new XRect(-300, -60, 600, 120), XStringFormats.Center);
                gfx.Restore(wmState);
            }

            // ── OUTER CARD BORDER (double-rule) ────────────────────────────────
            StrokeRect(mg - 4, mg - 4, iW + 8, H - 2 * mg + 8, new XPen(ColGold, 0.6));
            StrokeRect(mg - 2, mg - 2, iW + 4, H - 2 * mg + 4, new XPen(ColNavy, 1.8));

            // ── CORNER REGISTER MARKS ──────────────────────────────────────────
            {
                double cs = Mm(4.5);
                var cPen = new XPen(ColGold, 1.4);
                double[] xs = { mg, mg + iW };
                double[] ys = { mg, mg + (H - 2 * mg) };
                foreach (var cx in xs)
                {
                    foreach (var cy in ys)
                    {
                        int dx = cx == mg ? 1 : -1;
                        int dy = cy == mg ? 1 : -1;
                        gfx.DrawLine(cPen, cx, cy, cx + dx * cs, cy);
                        gfx.DrawLine(cPen, cx, cy, cx, cy + dy * cs);
                    }
                }
            }

            // ── HEADER BLOCK ───────────────────────────────────────────────────
            double hdrH = Mm(32);
            // background
            FillRect(mg, cY, iW, hdrH, ColNavy);
            // bottom gold accent on header
            FillRect(mg, cY + hdrH - Mm(1.2), iW, Mm(1.2), ColGold);

            // Logo
            double logoPad  = Mm(5);
            double logoSz   = hdrH - Mm(8);
            double logoX    = mg + logoPad;
            double logoY    = cY + (hdrH - logoSz) / 2;
            bool   logoOk   = false;

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
                    double asp = logoImg.PixelWidth > 0
                        ? (double)logoImg.PixelHeight / logoImg.PixelWidth : 1;
                    double lW = asp <= 1 ? logoSz : logoSz / asp;
                    double lH = asp <= 1 ? logoSz * asp : logoSz;
                    // white circle behind logo
                    gfx.DrawEllipse(XBrushes.White,
                        logoX - Mm(1), logoY + (logoSz - lH) / 2 - Mm(1),
                        lW + Mm(2), lH + Mm(2));
                    gfx.DrawImage(logoImg, logoX, logoY + (logoSz - lH) / 2, lW, lH);
                    logoX += lW + Mm(4);
                    logoOk = true;
                }
                catch (Exception ex) { _log.LogError(ex, "[HallTicket] Logo render failed"); }
            }

            if (!logoOk)
            {
                // circle placeholder with initial
                gfx.DrawEllipse(new XSolidBrush(XColor.FromArgb(80, 255, 255, 255)),
                    logoX, logoY, logoSz, logoSz);
                gfx.DrawEllipse(new XPen(ColGold, 1),
                    logoX, logoY, logoSz, logoSz);
                var initFont = new XFont("Arial", logoSz * 0.4, XFontStyle.Bold);
                gfx.DrawString(school.Name.Length > 0 ? school.Name[0].ToString().ToUpperInvariant() : "S",
                    initFont, XBrushes.White,
                    new XRect(logoX, logoY, logoSz, logoSz), XStringFormats.Center);
                logoX += logoSz + Mm(4);
            }

            // School name + sub-info
            double txtAreaW = iW - (logoX - mg) - Mm(38);
            var fSchoolBig  = new XFont("Arial", 14.5, XFontStyle.Bold);
            var fSchoolSub  = new XFont("Arial", 8);
            var fSchoolTiny = new XFont("Arial", 6.5);

            Txt(Px(school.Name).ToUpperInvariant(), fSchoolBig, ColWhite,
                new XRect(logoX, cY + Mm(6), txtAreaW, Mm(8)), XStringFormats.TopLeft);

            double si = cY + Mm(14);
            if (!string.IsNullOrWhiteSpace(school.Address))
            {
                Txt(Px(school.Address), fSchoolSub, Rgb(191, 219, 254),
                    new XRect(logoX, si, txtAreaW, Mm(4.5)), XStringFormats.TopLeft);
                si += Mm(4.5);
            }
            string contact = string.Join("   |   ", new[]
            {
                string.IsNullOrWhiteSpace(school.Phone) ? null : "Ph: " + school.Phone,
                string.IsNullOrWhiteSpace(school.Email) ? null : school.Email
            }.Where(s2 => s2 != null));
            if (!string.IsNullOrWhiteSpace(contact))
                Txt(Px(contact), fSchoolTiny, Rgb(148, 163, 184),
                    new XRect(logoX, si, txtAreaW, Mm(4)), XStringFormats.TopLeft);

            // "HALL TICKET / ADMIT CARD" pill badge
            double bdgW = Mm(36), bdgH = Mm(11.5);
            double bdgX = mg + iW - bdgW - Mm(4);
            double bdgY = cY + (hdrH - bdgH) / 2 - Mm(1);
            // outer gold ring
            gfx.DrawRectangle(new XPen(ColGold, 1.2), new XSolidBrush(ColGold),
                bdgX, bdgY, bdgW, bdgH);
            gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(220, 10, 36, 99)),
                bdgX + 2, bdgY + 2, bdgW - 4, bdgH - 4);
            Txt("HALL TICKET", new XFont("Arial", 7.5, XFontStyle.Bold), ColGold,
                new XRect(bdgX, bdgY + 2, bdgW, Mm(5)), XStringFormats.TopCenter);
            Txt("ADMIT CARD", new XFont("Arial", 6, XFontStyle.Regular), Rgb(148, 163, 184),
                new XRect(bdgX, bdgY + Mm(5.5), bdgW, Mm(4)), XStringFormats.TopCenter);

            cY += hdrH;

            // ── EXAM NAME BAND ─────────────────────────────────────────────────
            double ebH = Mm(9.5);
            FillRect(mg, cY, iW, ebH, Rgb(30, 58, 138));     // slightly lighter navy
            // left accent bar
            FillRect(mg, cY, Mm(2.5), ebH, ColGold);

            Txt(Px(t.ExamName).ToUpperInvariant(), new XFont("Arial", 9.5, XFontStyle.Bold), ColWhite,
                new XRect(mg + Mm(5), cY + 3, iW * 0.62, ebH - 4), XStringFormats.TopLeft);
            string classMeta = Px(t.ClassName)
                + (string.IsNullOrWhiteSpace(t.SectionName) ? "" : "  –  " + Px(t.SectionName))
                + "   |   A.Y. " + Px(t.AcademicYear);
            Txt(classMeta, new XFont("Arial", 8), Rgb(186, 214, 255),
                new XRect(mg + Mm(5), cY + ebH - Mm(5), iW - Mm(10), Mm(4.5)), XStringFormats.TopLeft);
            cY += ebH;

            // gold rule under exam band
            FillRect(mg, cY, iW, Mm(0.8), ColGold);
            cY += Mm(0.8);

            // ── STUDENT DETAILS + PHOTO ────────────────────────────────────────
            double detH  = Mm(54);
            double pW    = Mm(32);
            double pH    = Mm(42);
            double pX    = mg + iW - pW - Mm(5);
            double pY    = cY + (detH - pH) / 2;
            double dW    = iW - pW - Mm(14);

            FillRect(mg, cY, iW, detH, ColBg);

            // Photo
            bool photoDrawn = false;
            if (t.PhotoBytes != null)
            {
                try
                {
                    byte[] pngBytes;
                    using (var img2 = SixLabors.ImageSharp.Image.Load(t.PhotoBytes))
                    using (var ms2  = new MemoryStream())
                    {
                        img2.SaveAsPng(ms2);
                        pngBytes = ms2.ToArray();
                    }
                    var photoImg = XImage.FromStream(() => new MemoryStream(pngBytes));
                    double asp = photoImg.PixelWidth > 0
                        ? (double)photoImg.PixelHeight / photoImg.PixelWidth : 1.25;
                    double rW, rH;
                    if (asp >= pH / pW) { rW = pH / asp; rH = pH; }
                    else                { rW = pW; rH = pW * asp; }
                    FillRect(pX, pY, pW, pH, ColWhite);
                    gfx.DrawImage(photoImg, pX + (pW - rW) / 2, pY + (pH - rH) / 2, rW, rH);
                    photoDrawn = true;
                }
                catch (Exception ex) { _log.LogError(ex, "[HallTicket] Photo render failed for {Name}", t.StudentName); }
            }
            if (!photoDrawn)
            {
                FillRect(pX, pY, pW, pH, Rgb(219, 234, 254));
                var parts    = t.StudentName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var initials = parts.Length >= 2
                    ? $"{parts[0][0]}{parts[^1][0]}"
                    : (parts.Length == 1 ? parts[0][0].ToString() : "?");
                gfx.DrawString(initials.ToUpperInvariant(),
                    new XFont("Arial", pW * 0.35, XFontStyle.Bold),
                    new XSolidBrush(Rgb(37, 99, 235)),
                    new XRect(pX, pY, pW, pH), XStringFormats.Center);
            }
            // photo frame — double-border
            StrokeRect(pX - 1, pY - 1, pW + 2, pH + 2, new XPen(ColGold, 1));
            StrokeRect(pX,     pY,     pW,     pH,     new XPen(ColBorder, 0.6));
            // "AFFIX PHOTO" caption
            Txt("AFFIX PHOTO", new XFont("Arial", 5.5), ColMuted,
                new XRect(pX, pY + pH + 2, pW, Mm(4)), XStringFormats.TopCenter);

            // Fields
            var fLabel = new XFont("Arial", 6.8);
            var fVal   = new XFont("Arial", 9,   XFontStyle.Bold);
            var fValSm = new XFont("Arial", 8.5);

            double fx   = mg + Mm(5);
            double fy   = cY + Mm(5);
            double fRH  = Mm(8.5);

            void DrawField(string label, string value, XFont valFont, double? wOverride = null)
            {
                double fw = wOverride ?? dW;
                Txt(label.ToUpperInvariant(), fLabel, ColMuted,
                    new XRect(fx, fy, 110, Mm(4)), XStringFormats.TopLeft);
                Txt(value, valFont, ColText,
                    new XRect(fx, fy + Mm(3.5), fw, Mm(5)), XStringFormats.TopLeft);
                // underline
                HLine(fx, fy + fRH - 1, fw * 0.88, new XPen(ColBorder, 0.4));
                fy += fRH + Mm(0.8);
            }

            // Hall Ticket Number — prominent highlight box
            double htBxH = Mm(11);
            double htBxW = dW * 0.62;
            FillRect(fx, fy, htBxW, htBxH, ColNavy);
            // left gold stripe on box
            FillRect(fx, fy, Mm(2.5), htBxH, ColGold);
            Txt("HALL TICKET NUMBER", new XFont("Arial", 6, XFontStyle.Regular),
                Rgb(148, 163, 184),
                new XRect(fx + Mm(4), fy + 2, htBxW - Mm(5), Mm(4)), XStringFormats.TopLeft);
            Txt(t.HallTicketNo, new XFont("Arial", 15, XFontStyle.Bold),
                ColWhite,
                new XRect(fx + Mm(4), fy + Mm(4.5), htBxW - Mm(5), Mm(7)), XStringFormats.TopLeft);
            // serial on right side of box
            string serialStr = $"SL: {t.SerialNo:D4}";
            Txt(serialStr, new XFont("Arial", 6), Rgb(100, 130, 180),
                new XRect(fx + htBxW - Mm(14), fy + Mm(1), Mm(13), Mm(5)), XStringFormats.TopRight);
            fy += htBxH + Mm(3);

            DrawField("Student Name",  Px(t.StudentName).ToUpperInvariant(), fVal);
            DrawField("Date of Birth", t.DateOfBirth, fValSm);

            // Two-column: Admission No & Roll No
            {
                double half2 = dW * 0.46;
                Txt("ADMISSION NO.", fLabel, ColMuted,
                    new XRect(fx,              fy, 90, Mm(4)), XStringFormats.TopLeft);
                Txt("ROLL NUMBER", fLabel, ColMuted,
                    new XRect(fx + half2 + Mm(4), fy, 90, Mm(4)), XStringFormats.TopLeft);
                Txt(t.AdmissionNo, fValSm, ColText,
                    new XRect(fx,              fy + Mm(3.5), half2, Mm(5)), XStringFormats.TopLeft);
                Txt(t.RollNo, fValSm, ColText,
                    new XRect(fx + half2 + Mm(4), fy + Mm(3.5), half2, Mm(5)), XStringFormats.TopLeft);
                HLine(fx,              fy + fRH - 1, half2 * 0.9,  new XPen(ColBorder, 0.4));
                HLine(fx + half2 + Mm(4), fy + fRH - 1, half2 * 0.9, new XPen(ColBorder, 0.4));
                fy += fRH + Mm(0.8);
            }

            cY += detH;
            FillRect(mg, cY, iW, Mm(0.6), ColNavy);
            cY += Mm(0.6);

            // ── EXAMINATION SCHEDULE TABLE ─────────────────────────────────────
            if (t.Subjects.Any())
            {
                // Section header
                double sHdrH = Mm(7.5);
                FillRect(mg, cY, iW, sHdrH, ColNavy);
                FillRect(mg, cY, Mm(2.5), sHdrH, ColGold);
                Txt("EXAMINATION SCHEDULE", new XFont("Arial", 9, XFontStyle.Bold), ColWhite,
                    new XRect(mg + Mm(5), cY + 2, iW - Mm(10), sHdrH - 2), XStringFormats.TopLeft);
                cY += sHdrH;

                // Column proportions
                double c1 = iW * 0.27, c2 = iW * 0.17, c3 = iW * 0.23,
                       c4 = iW * 0.21, c5 = iW * 0.12;
                double tRH2 = Mm(7.5);

                // Table header row
                FillRect(mg, cY, iW, tRH2, Rgb(236, 245, 255));
                var fTH = new XFont("Arial", 7.5, XFontStyle.Bold);
                var cHdr = new XSolidBrush(ColNavy);
                double hx2 = mg + Mm(2);
                Txt("SUBJECT",   fTH, ColNavy, new XRect(hx2, cY + 2, c1 - 4, tRH2 - 2), XStringFormats.TopLeft);   hx2 += c1;
                Txt("DATE",      fTH, ColNavy, new XRect(hx2, cY + 2, c2,     tRH2 - 2), XStringFormats.TopCenter);  hx2 += c2;
                Txt("TIMINGS",   fTH, ColNavy, new XRect(hx2, cY + 2, c3,     tRH2 - 2), XStringFormats.TopCenter);  hx2 += c3;
                Txt("VENUE",     fTH, ColNavy, new XRect(hx2, cY + 2, c4,     tRH2 - 2), XStringFormats.TopCenter);  hx2 += c4;
                Txt("MAX MKS",   fTH, ColNavy, new XRect(hx2, cY + 2, c5 - 4, tRH2 - 2), XStringFormats.TopCenter);
                // gold underline on header
                HLine(mg, cY + tRH2 - 1, iW, new XPen(ColGold, 1));
                cY += tRH2;

                var fTR = new XFont("Arial", 8);
                var fTB = new XFont("Arial", 8, XFontStyle.Bold);
                for (int ri = 0; ri < t.Subjects.Count; ri++)
                {
                    var s3 = t.Subjects[ri];
                    bool even = ri % 2 == 0;
                    FillRect(mg, cY, iW, tRH2, even ? ColWhite : ColTableEven);

                    string subLabel2 = s3.SubjectName;
                    if (!string.IsNullOrWhiteSpace(s3.SubjectCode))
                        subLabel2 += $" ({s3.SubjectCode})";

                    double rx2 = mg + Mm(2);
                    Txt(Px(subLabel2),          fTB, ColText, new XRect(rx2, cY + 2, c1 - 4, tRH2 - 2), XStringFormats.TopLeft);    rx2 += c1;
                    Txt(FmtDate(s3.ExamDate),   fTR, ColText, new XRect(rx2, cY + 2, c2,     tRH2 - 2), XStringFormats.TopCenter);   rx2 += c2;
                    Txt(FmtTimeRange(s3.StartTime, s3.EndTime), fTR, ColText, new XRect(rx2, cY + 2, c3, tRH2 - 2), XStringFormats.TopCenter); rx2 += c3;
                    Txt(Px(s3.Venue ?? "–"),    fTR, ColText, new XRect(rx2, cY + 2, c4,     tRH2 - 2), XStringFormats.TopCenter);   rx2 += c4;
                    Txt(s3.MaxMarks > 0 ? s3.MaxMarks.ToString("0") : "–",
                                                fTR, ColText, new XRect(rx2, cY + 2, c5 - 4, tRH2 - 2), XStringFormats.TopCenter);
                    HLine(mg, cY + tRH2, iW, new XPen(ColBorder, 0.3));
                    cY += tRH2;
                }
                HLine(mg, cY, iW, new XPen(ColNavy, 0.8));
                cY += Mm(0.5);
            }

            // ── INSTRUCTIONS ──────────────────────────────────────────────────
            double insH2 = Mm(30);
            FillRect(mg, cY, iW, insH2, ColGoldLight);
            // left accent
            FillRect(mg, cY, Mm(2.5), insH2, ColGold);
            // top border
            HLine(mg, cY, iW, new XPen(ColGold, 0.8));

            Txt("IMPORTANT INSTRUCTIONS TO CANDIDATES",
                new XFont("Arial", 7.5, XFontStyle.Bold), Rgb(120, 60, 0),
                new XRect(mg + Mm(5), cY + Mm(2.5), iW - Mm(10), Mm(5)), XStringFormats.TopLeft);

            string[] instr = {
                "1.  This Hall Ticket must be produced on demand during every examination session. Admission will be denied without it.",
                "2.  Candidates must be seated 15 minutes before the commencement of each paper and must not leave before the examination ends.",
                "3.  Electronic devices (mobile phones, smart watches, programmable calculators etc.) are strictly prohibited in the exam hall.",
                "4.  Any tampering or damage to this Hall Ticket must be immediately reported to the Examination Controller.",
                "5.  This Hall Ticket is valid only for the examinations listed herein for the Academic Year " + t.AcademicYear + ".",
            };
            var insF = new XFont("Arial", 7);
            double insYY = cY + Mm(7.5);
            foreach (var line in instr)
            {
                Txt(line, insF, Rgb(101, 50, 0),
                    new XRect(mg + Mm(5), insYY, iW - Mm(8), Mm(5)), XStringFormats.TopLeft);
                insYY += Mm(4.6);
            }
            cY += insH2;
            HLine(mg, cY, iW, new XPen(ColGold, 0.8));
            cY += Mm(0.4);

            // ── SIGNATURE STRIP ───────────────────────────────────────────────
            double sigH2 = Mm(22);
            FillRect(mg, cY, iW, sigH2, ColWhite);
            string[] sigLabels2 = { "Candidate's Signature", "Parent / Guardian Signature", "Principal / Controller of Examinations" };
            double sCW = iW / 3;
            var fSig = new XFont("Arial", 7);
            for (int si2 = 0; si2 < 3; si2++)
            {
                double sx2 = mg + si2 * sCW;
                // vertical divider
                if (si2 > 0)
                    VLine(sx2, cY + Mm(2), cY + sigH2 - Mm(2), new XPen(ColBorder, 0.5));
                // signature line
                double lineY2 = cY + Mm(15);
                HLine(sx2 + Mm(4), lineY2, sCW - Mm(8), new XPen(ColNavy, 0.9));
                // label
                Txt(sigLabels2[si2], fSig, ColMuted,
                    new XRect(sx2, lineY2 + 3, sCW, Mm(5)), XStringFormats.TopCenter);
                // "Date:" sub-label
                Txt("Date: _____________", new XFont("Arial", 6), Rgb(160, 160, 160),
                    new XRect(sx2, lineY2 + Mm(5), sCW, Mm(4)), XStringFormats.TopCenter);
            }

            // Office Use Only box (right-most column)
            double ouBoxX = mg + 2 * sCW + Mm(4);
            double ouBoxY = cY + Mm(2);
            double ouBoxW = sCW - Mm(8);
            double ouBoxH = Mm(10);
            StrokeRect(ouBoxX, ouBoxY, ouBoxW, ouBoxH, new XPen(ColBorder, 0.6));
            Txt("For Office Use Only", new XFont("Arial", 5.5), ColMuted,
                new XRect(ouBoxX, ouBoxY + 2, ouBoxW, Mm(4)), XStringFormats.TopCenter);

            cY += sigH2;

            // ── FOOTER BAND ───────────────────────────────────────────────────
            double botY2 = mg + (H - 2 * mg) - Mm(7.5);
            FillRect(mg, botY2,           iW, Mm(1.0), ColGold);
            FillRect(mg, botY2 + Mm(1.0), iW, Mm(6.5), ColNavy);

            string footer2 = $"{Px(school.Name).ToUpperInvariant()}   |   {Px(t.ExamName)}   |   Academic Year: {Px(t.AcademicYear)}   |   Generated: {DateTime.UtcNow:dd MMM yyyy}";
            Txt(footer2, new XFont("Arial", 6.5), Rgb(148, 163, 184),
                new XRect(mg + Mm(3), botY2 + Mm(1.2), iW - Mm(6), Mm(6)), XStringFormats.TopLeft);

            // Hall ticket no + serial compact (bottom right)
            string htFooter = $"HT: {t.HallTicketNo}   |   SL: {t.SerialNo:D4}";
            Txt(htFooter, new XFont("Arial", 7, XFontStyle.Bold), Rgb(252, 211, 77),
                new XRect(mg + Mm(3), botY2 + Mm(1.2), iW - Mm(6), Mm(6)), XStringFormats.TopRight);
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

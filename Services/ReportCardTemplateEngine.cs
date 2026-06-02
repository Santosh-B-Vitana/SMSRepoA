using SmsApi.Models.DTOs;
using System.Text;

namespace SmsApi.Services
{
    /// <summary>
    /// Renders one of five industry-grade report card templates as complete HTML.
    /// Templates: CBSE_Classic | CBSE_Modern | ICSE_Standard | StateBoard_Elite | Modern_Premium
    /// </summary>
    public static class ReportCardTemplateEngine
    {
        // ─────────────────────────────────────────────────────────────────────
        // Entry point
        // ─────────────────────────────────────────────────────────────────────
        public static string Render(ReportCardDocumentDto data)
        {
            return data.TemplateStyle switch
            {
                "CBSE_Modern"       => RenderCbseModern(data),
                "ICSE_Standard"     => RenderIcseStandard(data),
                "StateBoard_Elite"  => RenderStateBoardElite(data),
                "Modern_Premium"    => RenderModernPremium(data),
                _                   => RenderCbseClassic(data),   // default: CBSE_Classic
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // Shared helpers
        // ─────────────────────────────────────────────────────────────────────
        private static string SchoolHeader(ReportCardDocumentDto d, string borderColor, string bgColor, string textColor = "#fff")
        {
            var logo = !string.IsNullOrWhiteSpace(d.SchoolLogoUrl)
                ? $"<img src='{d.SchoolLogoUrl}' alt='School Logo' style='height:70px;margin-bottom:4px;object-fit:contain;'/><br/>"
                : "<div style='width:70px;height:70px;background:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:4px;'>🎓</div><br/>";

            var affil = !string.IsNullOrWhiteSpace(d.BoardAffiliationNo)
                ? $"<div style='font-size:10px;opacity:0.85;'>Affiliation No: {d.BoardAffiliationNo}</div>"
                : "";

            return $@"
<div style='background:{bgColor};color:{textColor};padding:16px;text-align:center;border-bottom:4px solid {borderColor};'>
  {logo}
  <div style='font-size:22px;font-weight:800;letter-spacing:1px;'>{d.SchoolName}</div>
  {(!string.IsNullOrWhiteSpace(d.SchoolAddress) ? $"<div style='font-size:10px;opacity:0.85;margin-top:2px;'>{d.SchoolAddress}</div>" : "")}
  {(!string.IsNullOrWhiteSpace(d.SchoolPhone) ? $"<div style='font-size:10px;opacity:0.85;'>Ph: {d.SchoolPhone}{(!string.IsNullOrWhiteSpace(d.SchoolEmail) ? " | " + d.SchoolEmail : "")}</div>" : "")}
  {affil}
</div>";
        }

        private static string StudentInfoRow(ReportCardDocumentDto d, string thBg, string thFg)
        {
            var photo = !string.IsNullOrWhiteSpace(d.StudentPhotoUrl)
                ? $"<td rowspan='5' style='width:90px;text-align:center;padding:8px;vertical-align:middle;'><img src='{d.StudentPhotoUrl}' style='width:75px;height:90px;object-fit:cover;border:2px solid {thBg};border-radius:4px;'/></td>"
                : $"<td rowspan='5' style='width:90px;text-align:center;padding:8px;vertical-align:middle;'><div style='width:75px;height:90px;background:#e5e7eb;border:2px solid {thBg};border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;'>👤</div></td>";

            string Cell(string label, string? value) =>
                $"<tr><th style='background:{thBg};color:{thFg};padding:5px 10px;text-align:left;font-size:11px;width:130px;'>{label}</th><td style='padding:5px 10px;font-size:11px;'>{value ?? "—"}</td></tr>";

            return $@"
<table style='width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid #ddd;'>
  <tr>
    {photo}
    {Cell("Student Name", d.StudentName)}
  </tr>
  {Cell("Admission No.", d.AdmissionNo)}
  {Cell("Class / Section", $"{d.ClassName} — {d.SectionName}")}
  {Cell("Academic Year", d.AcademicYear)}
  {Cell("Date of Birth", d.DateOfBirth)}
</table>
<table style='width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid #ddd;'>
  {Cell("Father's Name", d.FatherName)}
  {Cell("Mother's Name", d.MotherName)}
  {Cell("Examination", d.ExamName ?? d.Term)}
  {Cell("Board", d.BoardType)}
  {(!string.IsNullOrWhiteSpace(d.RollNumber) ? Cell("Roll Number", d.RollNumber) : "")}
</table>";
        }

        private static string SubjectsTable(List<ReportCardSubjectDto> subjects, string thBg, string thFg, bool showTerms)
        {
            var sb = new StringBuilder();
            sb.AppendLine($@"<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;'>
  <thead>
    <tr style='background:{thBg};color:{thFg};'>
      <th style='padding:6px;border:1px solid #bbb;text-align:left;'>Subject</th>");

            if (showTerms)
            {
                sb.AppendLine(@"
      <th colspan='3' style='padding:6px;border:1px solid #bbb;text-align:center;'>Term I</th>
      <th colspan='3' style='padding:6px;border:1px solid #bbb;text-align:center;'>Term II</th>");
            }
            sb.AppendLine(@"
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>Max</th>
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>Obtained</th>
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>%</th>
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>Grade</th>
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>GP</th>
      <th style='padding:6px;border:1px solid #bbb;text-align:center;'>Result</th>
    </tr>
  </thead>
  <tbody>");

            foreach (var s in subjects)
            {
                var pct = s.AnnualMax.HasValue && s.AnnualMax > 0
                    ? $"{(s.AnnualObtained ?? 0) / s.AnnualMax.Value * 100:F1}%"
                    : (s.AnnualPercentage.HasValue ? $"{s.AnnualPercentage:F1}%" : "—");
                var passStyle = s.IsPass ? "color:#16a34a;" : "color:#dc2626;font-weight:bold;";

                sb.AppendLine($@"
    <tr style='border-bottom:1px solid #e5e7eb;'>
      <td style='padding:5px 8px;border:1px solid #ddd;font-weight:500;'>{s.SubjectName}{(!string.IsNullOrWhiteSpace(s.SubjectCode) ? $" <span style='color:#6b7280;font-size:9px;'>({s.SubjectCode})</span>" : "")}</td>");

                if (showTerms)
                {
                    sb.AppendLine($@"
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.T1TheoryObtained?.ToString("F0") ?? "—"}/{s.T1TheoryMax?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.T1PracticalObtained?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{s.T1Grade ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.T2TheoryObtained?.ToString("F0") ?? "—"}/{s.T2TheoryMax?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.T2PracticalObtained?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{s.T2Grade ?? "—"}</td>");
                }

                sb.AppendLine($@"
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.AnnualMax?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{s.AnnualObtained?.ToString("F0") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{pct}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;font-weight:bold;color:{thBg};'>{s.FinalGrade ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;'>{s.FinalGradePoint?.ToString("F1") ?? "—"}</td>
      <td style='padding:5px;border:1px solid #ddd;text-align:center;{passStyle}'>{(s.IsPass ? "Pass" : "FAIL")}</td>
    </tr>");
            }

            sb.AppendLine("  </tbody></table>");
            return sb.ToString();
        }

        private static string CoScholasticTable(List<CoScholasticItemDto> items, string thBg, string thFg)
        {
            if (items.Count == 0) return "";
            var sb = new StringBuilder();
            sb.AppendLine($@"<div style='margin-bottom:6px;font-weight:700;font-size:12px;color:{thBg};text-transform:uppercase;letter-spacing:0.5px;'>Co-Scholastic Assessment</div>
<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;'>
  <thead>
    <tr style='background:{thBg};color:{thFg};'>
      <th style='padding:5px 8px;border:1px solid #bbb;text-align:left;'>Area</th>
      <th style='padding:5px 8px;border:1px solid #bbb;text-align:left;'>Sub-Area</th>
      <th style='padding:5px 8px;border:1px solid #bbb;text-align:center;'>Term I Grade</th>
      <th style='padding:5px 8px;border:1px solid #bbb;text-align:center;'>Term II Grade</th>
      <th style='padding:5px 8px;border:1px solid #bbb;text-align:left;'>Remarks</th>
    </tr>
  </thead>
  <tbody>");
            foreach (var i in items)
            {
                sb.AppendLine($@"
    <tr style='border-bottom:1px solid #e5e7eb;'>
      <td style='padding:4px 8px;border:1px solid #ddd;'>{i.Area}</td>
      <td style='padding:4px 8px;border:1px solid #ddd;'>{i.SubArea}</td>
      <td style='padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{i.T1Grade ?? "—"}</td>
      <td style='padding:4px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{i.T2Grade ?? "—"}</td>
      <td style='padding:4px 8px;border:1px solid #ddd;color:#6b7280;'>{i.Remarks ?? ""}</td>
    </tr>");
            }
            sb.AppendLine("  </tbody></table>");
            return sb.ToString();
        }

        private static string ResultSummaryBar(ReportCardDocumentDto d, string thBg, string thFg)
        {
            var passColor = d.ResultStatus == "Pass" || d.ResultStatus == "Promoted" ? "#16a34a" : "#dc2626";
            var passLabel = d.ResultStatus == "Pass" ? "PASS" :
                            d.ResultStatus == "Promoted" ? "PROMOTED" :
                            d.ResultStatus == "Detained" ? "DETAINED" : "FAIL";

            return $@"
<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;background:#f8fafc;border:1px solid #ddd;'>
  <tr>
    <th style='background:{thBg};color:{thFg};padding:6px 12px;text-align:left;'>Total Marks</th>
    <td style='padding:6px 12px;font-weight:bold;'>{d.TotalObtainedMarks:F0} / {d.TotalMaxMarks:F0}</td>
    <th style='background:{thBg};color:{thFg};padding:6px 12px;text-align:left;'>Percentage</th>
    <td style='padding:6px 12px;font-weight:bold;'>{d.Percentage:F2}%</td>
    <th style='background:{thBg};color:{thFg};padding:6px 12px;text-align:left;'>Overall Grade</th>
    <td style='padding:6px 12px;font-weight:bold;color:{thBg};font-size:14px;'>{d.OverallGrade ?? "—"}</td>
    {(d.CGPA.HasValue ? $"<th style='background:{thBg};color:{thFg};padding:6px 12px;text-align:left;'>CGPA</th><td style='padding:6px 12px;font-weight:bold;'>{d.CGPA:F1}</td>" : "")}
    {(d.ClassRank.HasValue ? $"<th style='background:{thBg};color:{thFg};padding:6px 12px;'>Rank</th><td style='padding:6px 12px;font-weight:bold;'>{d.ClassRank} / {d.TotalStudentsInClass}</td>" : "")}
    <th style='background:{thBg};color:{thFg};padding:6px 12px;text-align:left;'>Result</th>
    <td style='padding:6px 12px;font-weight:800;font-size:15px;color:{passColor};'>{passLabel}</td>
  </tr>
</table>";
        }

        private static string AttendanceBar(AttendanceSummaryDto? att, string thBg, string thFg)
        {
            if (att == null) return "";
            return $@"
<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;background:#f8fafc;border:1px solid #ddd;'>
  <tr>
    <th style='background:{thBg};color:{thFg};padding:5px 12px;text-align:left;' colspan='8'>Attendance</th>
  </tr>
  <tr>
    <th style='background:{thBg}22;padding:5px 8px;border:1px solid #ddd;'>Working Days</th>
    <td style='padding:5px 8px;border:1px solid #ddd;font-weight:bold;'>{att.TotalWorkingDays}</td>
    <th style='background:{thBg}22;padding:5px 8px;border:1px solid #ddd;'>Days Present</th>
    <td style='padding:5px 8px;border:1px solid #ddd;font-weight:bold;'>{att.DaysPresent}</td>
    <th style='background:{thBg}22;padding:5px 8px;border:1px solid #ddd;'>Days Absent</th>
    <td style='padding:5px 8px;border:1px solid #ddd;font-weight:bold;'>{att.DaysAbsent}</td>
    <th style='background:{thBg}22;padding:5px 8px;border:1px solid #ddd;'>Attendance %</th>
    <td style='padding:5px 8px;border:1px solid #ddd;font-weight:bold;color:{(att.AttendancePercentage >= 75 ? "#16a34a" : "#dc2626")};'>{att.AttendancePercentage:F1}%</td>
  </tr>
</table>";
        }

        private static string SignatureRow(ReportCardDocumentDto d, string thBg)
        {
            return $@"
<table style='width:100%;border-collapse:collapse;font-size:11px;margin-top:20px;'>
  <tr>
    <td style='padding:8px;text-align:center;width:25%;border-top:1px solid #999;'>
      <div style='font-weight:600;'>{d.ClassTeacherName ?? "Class Teacher"}</div>
      <div style='color:#6b7280;font-size:10px;'>Class Teacher's Signature</div>
    </td>
    <td style='padding:8px;text-align:center;width:25%;border-top:1px solid #999;'>
      <div style='height:30px;'></div>
      <div style='color:#6b7280;font-size:10px;'>Parent's / Guardian's Signature</div>
    </td>
    <td style='padding:8px;text-align:center;width:25%;border-top:1px solid #999;'>
      <div style='font-weight:600;'>{d.PrincipalName ?? "Principal"}</div>
      <div style='color:#6b7280;font-size:10px;'>Principal's Signature</div>
    </td>
    <td style='padding:8px;text-align:center;width:25%;'>
      <div style='color:#6b7280;font-size:10px;'>Date of Issue</div>
      <div style='font-weight:600;'>{(d.IssueDate.HasValue ? d.IssueDate.Value.ToString("dd-MMM-yyyy") : "___________")}</div>
      {(d.IsEdited ? $"<div style='color:#dc2626;font-size:9px;margin-top:4px;'>★ Corrected Document</div>" : "")}
    </td>
  </tr>
</table>";
        }

        private static string RemarksSection(ReportCardDocumentDto d, string thBg, string thFg)
        {
            if (string.IsNullOrWhiteSpace(d.TeacherRemarks) && string.IsNullOrWhiteSpace(d.PrincipalRemarks)) return "";
            return $@"
<table style='width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;'>
  {(!string.IsNullOrWhiteSpace(d.TeacherRemarks) ? $"<tr><th style='background:{thBg};color:{thFg};padding:5px 10px;width:130px;text-align:left;'>Teacher Remarks</th><td style='padding:5px 10px;border:1px solid #ddd;'>{d.TeacherRemarks}</td></tr>" : "")}
  {(!string.IsNullOrWhiteSpace(d.PrincipalRemarks) ? $"<tr><th style='background:{thBg};color:{thFg};padding:5px 10px;text-align:left;'>Principal Remarks</th><td style='padding:5px 10px;border:1px solid #ddd;'>{d.PrincipalRemarks}</td></tr>" : "")}
</table>";
        }

        private static string GradeScale(string boardType, string thBg, string thFg)
        {
            // CBSE grading scale reference
            var rows = boardType switch
            {
                "ICSE" or "ISC" => new[] { ("A+", "91-100", "Outstanding"), ("A", "81-90", "Excellent"), ("B+", "71-80", "Very Good"), ("B", "61-70", "Good"), ("C+", "51-60", "Above Average"), ("C", "41-50", "Average"), ("D", "33-40", "Below Average"), ("E", "0-32", "Needs Improvement") },
                _ => new[] { ("A1", "91-100", "Outstanding"), ("A2", "81-90", "Excellent"), ("B1", "71-80", "Very Good"), ("B2", "61-70", "Good"), ("C1", "51-60", "Above Avg"), ("C2", "41-50", "Average"), ("D", "33-40", "Below Avg"), ("E", "0-32", "Needs Improvement") }
            };

            var sb = new StringBuilder();
            sb.Append($"<table style='font-size:9px;border-collapse:collapse;width:100%;margin-bottom:8px;'><tr style='background:{thBg};color:{thFg};'><th style='padding:3px 6px;border:1px solid #ccc;'>Grade</th><th style='padding:3px 6px;border:1px solid #ccc;'>Marks (%)</th><th style='padding:3px 6px;border:1px solid #ccc;'>Performance</th></tr>");
            foreach (var (g, m, p) in rows)
                sb.Append($"<tr><td style='padding:3px 6px;border:1px solid #ddd;text-align:center;font-weight:bold;'>{g}</td><td style='padding:3px 6px;border:1px solid #ddd;text-align:center;'>{m}</td><td style='padding:3px 6px;border:1px solid #ddd;'>{p}</td></tr>");
            sb.Append("</table>");
            return sb.ToString();
        }

        private static string BaseHtml(string title, string body, string? extraStyles = null)
        {
            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1'/>
  <title>{title}</title>
  <style>
    * {{ box-sizing:border-box; margin:0; padding:0; }}
    body {{ font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#1a1a2e; background:#fff; }}
    @media print {{
      body {{ margin:0; }}
      .no-print {{ display:none; }}
      @page {{ margin:10mm; }}
    }}
    {extraStyles}
  </style>
</head>
<body>
{body}
</body>
</html>";
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template 1: CBSE Classic  (maroon & dark navy)
        // ─────────────────────────────────────────────────────────────────────
        private static string RenderCbseClassic(ReportCardDocumentDto d)
        {
            const string primary = "#800020"; // Maroon
            const string secondary = "#1a237e"; // Dark navy
            const string fg = "#ffffff";

            var body = new StringBuilder();
            body.Append("<div style='max-width:800px;margin:0 auto;padding:0;border:3px double " + primary + ";'>");

            // Decorative top stripe
            body.Append($"<div style='height:8px;background:linear-gradient(90deg,{primary},{secondary},{primary});'></div>");

            body.Append(SchoolHeader(d, secondary, primary));

            // Report card title
            body.Append($@"<div style='text-align:center;padding:8px;background:{secondary};color:#fff;font-size:15px;font-weight:800;letter-spacing:2px;text-transform:uppercase;'>
  PROGRESS REPORT CARD — {d.Term.ToUpper()} &nbsp;|&nbsp; Academic Year: {d.AcademicYear}
</div>");

            body.Append("<div style='padding:12px;'>");
            body.Append(StudentInfoRow(d, primary, fg));
            body.Append($"<div style='font-weight:700;font-size:12px;color:{primary};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;'>Academic Performance</div>");
            body.Append(SubjectsTable(d.Subjects, primary, fg, showTerms: true));
            body.Append(ResultSummaryBar(d, secondary, fg));
            body.Append(AttendanceBar(d.Attendance, primary, fg));

            if (d.CoScholasticItems.Count > 0)
                body.Append(CoScholasticTable(d.CoScholasticItems, primary, fg));

            body.Append(RemarksSection(d, primary, fg));

            // Grading scale (collapsible footnote)
            body.Append($"<div style='margin-top:8px;font-weight:700;font-size:10px;color:{primary};text-transform:uppercase;'>Grading Scale</div>");
            body.Append(GradeScale(d.BoardType, primary, fg));
            body.Append(SignatureRow(d, primary));
            body.Append("</div>");

            // Bottom stripe + school motto
            body.Append($"<div style='height:8px;background:linear-gradient(90deg,{primary},{secondary},{primary});'></div>");
            body.Append($"<div style='text-align:center;padding:4px;font-size:9px;color:{secondary};font-style:italic;'>Affiliated to {d.BoardType} Board{(!string.IsNullOrWhiteSpace(d.BoardAffiliationNo) ? " | Affiliation No: " + d.BoardAffiliationNo : "")}</div>");
            body.Append("</div>");

            return BaseHtml($"Report Card — {d.StudentName} — {d.AcademicYear}", body.ToString());
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template 2: CBSE Modern  (blue gradient + white)
        // ─────────────────────────────────────────────────────────────────────
        private static string RenderCbseModern(ReportCardDocumentDto d)
        {
            const string primary = "#1565c0";   // Deep blue
            const string accent = "#0288d1";    // Sky blue
            const string fg = "#ffffff";

            var body = new StringBuilder();
            body.Append($"<div style='max-width:820px;margin:0 auto;padding:0;box-shadow:0 2px 20px rgba(0,0,0,0.12);'>");

            // Hero header with gradient
            body.Append($@"<div style='background:linear-gradient(135deg,{primary},{accent});color:#fff;padding:20px 24px;display:flex;align-items:center;gap:16px;'>
  {(!string.IsNullOrWhiteSpace(d.SchoolLogoUrl) ? $"<img src='{d.SchoolLogoUrl}' style='height:70px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;'/>" : "<div style='width:70px;height:70px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;'>🎓</div>")}
  <div>
    <div style='font-size:22px;font-weight:800;'>{d.SchoolName}</div>
    {(!string.IsNullOrWhiteSpace(d.SchoolAddress) ? $"<div style='font-size:10px;opacity:0.9;margin-top:2px;'>{d.SchoolAddress}</div>" : "")}
    {(!string.IsNullOrWhiteSpace(d.SchoolPhone) ? $"<div style='font-size:10px;opacity:0.9;'>📞 {d.SchoolPhone}</div>" : "")}
    <div style='margin-top:6px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:20px;display:inline-block;font-size:11px;font-weight:600;'>CBSE Affiliated — {(d.BoardAffiliationNo ?? "—")}</div>
  </div>
</div>");

            // Colored title band
            body.Append($@"<div style='background:{accent};color:#fff;padding:8px 24px;font-size:14px;font-weight:700;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;'>
  <span>📋 PROGRESS REPORT CARD</span>
  <span>{d.Term.ToUpper()} &nbsp;|&nbsp; {d.AcademicYear}</span>
</div>");

            body.Append("<div style='padding:16px 24px;'>");

            // Student info card
            body.Append($@"<div style='background:#f0f7ff;border-left:4px solid {primary};border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;'>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>STUDENT NAME</span><span style='font-weight:700;'>{d.StudentName}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>ADMISSION NO.</span><span style='font-weight:700;'>{d.AdmissionNo ?? "—"}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>ROLL NUMBER</span><span style='font-weight:700;'>{d.RollNumber ?? "—"}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>CLASS &amp; SECTION</span><span style='font-weight:700;'>{d.ClassName} — {d.SectionName}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>DATE OF BIRTH</span><span style='font-weight:700;'>{d.DateOfBirth ?? "—"}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>BOARD</span><span style='font-weight:700;'>{d.BoardType}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>FATHER'S NAME</span><span style='font-weight:700;'>{d.FatherName ?? "—"}</span></div>
  <div><span style='color:#6b7280;font-size:10px;display:block;'>MOTHER'S NAME</span><span style='font-weight:700;'>{d.MotherName ?? "—"}</span></div>
</div>");

            body.Append($"<div style='font-weight:700;font-size:13px;color:{primary};margin-bottom:6px;border-bottom:2px solid {primary};padding-bottom:4px;'>📚 Subject-wise Performance</div>");
            body.Append(SubjectsTable(d.Subjects, primary, fg, showTerms: true));
            body.Append(ResultSummaryBar(d, primary, fg));
            body.Append(AttendanceBar(d.Attendance, primary, fg));
            if (d.CoScholasticItems.Count > 0) body.Append(CoScholasticTable(d.CoScholasticItems, accent, fg));
            body.Append(RemarksSection(d, primary, fg));
            body.Append($"<div style='margin-top:6px;font-weight:700;font-size:10px;color:{primary};border-top:1px dashed {primary};padding-top:6px;'>Grading Reference</div>");
            body.Append(GradeScale(d.BoardType, primary, fg));
            body.Append(SignatureRow(d, primary));
            body.Append("</div>");

            body.Append($"<div style='background:{primary};color:#fff;padding:5px 24px;font-size:9px;text-align:center;opacity:0.8;'>Generated by School Management System &nbsp;|&nbsp; Digitally Verified</div>");
            body.Append("</div>");

            return BaseHtml($"Report Card — {d.StudentName}", body.ToString());
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template 3: ICSE Standard  (formal dark green + gold)
        // ─────────────────────────────────────────────────────────────────────
        private static string RenderIcseStandard(ReportCardDocumentDto d)
        {
            const string primary = "#1b5e20";   // Dark green
            const string gold = "#b8860b";       // Dark goldenrod
            const string fg = "#ffffff";

            var body = new StringBuilder();
            body.Append($"<div style='max-width:800px;margin:0 auto;padding:0;border:2px solid {gold};'>");
            body.Append($"<div style='height:6px;background:linear-gradient(90deg,{primary} 33%,{gold} 33%,{gold} 66%,{primary} 66%);'></div>");

            body.Append(SchoolHeader(d, gold, primary));

            body.Append($@"<div style='text-align:center;padding:6px;background:{gold};color:#fff;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;'>
  ANNUAL PROGRESS REPORT — {d.AcademicYear}
</div>
<div style='text-align:center;padding:4px;font-size:11px;color:{gold};border-bottom:1px solid {gold};font-style:italic;'>
  Council for the Indian School Certificate Examinations — Affiliated School
</div>");

            body.Append("<div style='padding:12px;'>");
            body.Append(StudentInfoRow(d, primary, fg));
            body.Append($"<div style='font-weight:700;font-size:12px;color:{primary};margin-bottom:4px;text-decoration:underline;text-underline-offset:3px;'>SCHOLASTIC PERFORMANCE</div>");
            body.Append(SubjectsTable(d.Subjects, primary, fg, showTerms: false));
            body.Append(ResultSummaryBar(d, primary, fg));
            body.Append(AttendanceBar(d.Attendance, primary, fg));
            if (d.CoScholasticItems.Count > 0) body.Append(CoScholasticTable(d.CoScholasticItems, primary, fg));
            body.Append(RemarksSection(d, primary, fg));
            body.Append($"<div style='margin-top:8px;font-size:10px;font-weight:700;color:{primary};'>GRADING SCALE</div>");
            body.Append(GradeScale(d.BoardType, primary, fg));
            body.Append(SignatureRow(d, primary));
            body.Append("</div>");
            body.Append($"<div style='height:6px;background:linear-gradient(90deg,{primary} 33%,{gold} 33%,{gold} 66%,{primary} 66%);'></div>");
            body.Append("</div>");

            return BaseHtml($"ICSE Report Card — {d.StudentName}", body.ToString());
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template 4: State Board Elite  (saffron + tricolor motif)
        // ─────────────────────────────────────────────────────────────────────
        private static string RenderStateBoardElite(ReportCardDocumentDto d)
        {
            const string saffron = "#ff6f00";  // Saffron
            const string deepGreen = "#2e7d32";
            const string navy = "#283593";
            const string fg = "#ffffff";

            var body = new StringBuilder();
            body.Append("<div style='max-width:800px;margin:0 auto;border:2px solid #bbb;'>");

            // Tricolor strip at top
            body.Append($"<div style='display:flex;height:10px;'><div style='flex:1;background:{saffron};'></div><div style='flex:1;background:#fff;border-top:1px solid #ccc;border-bottom:1px solid #ccc;'></div><div style='flex:1;background:{deepGreen};'></div></div>");

            body.Append(SchoolHeader(d, saffron, navy));

            body.Append($@"<div style='background:{saffron};color:#fff;text-align:center;padding:7px;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;'>
  Student Progress Report — {d.Term.ToUpper()}
</div>
<div style='background:{navy};color:#fff;text-align:center;padding:4px;font-size:11px;'>
  Academic Year: <strong>{d.AcademicYear}</strong> &nbsp;|&nbsp; Board: <strong>{d.BoardType}</strong>
  {(!string.IsNullOrWhiteSpace(d.BoardAffiliationNo) ? $"&nbsp;|&nbsp; Affiliation No: <strong>{d.BoardAffiliationNo}</strong>" : "")}
</div>");

            body.Append("<div style='padding:12px;'>");
            body.Append(StudentInfoRow(d, navy, fg));
            body.Append($"<div style='font-weight:700;font-size:12px;color:{navy};margin-bottom:4px;border-left:4px solid {saffron};padding-left:8px;text-transform:uppercase;'>Academic Report</div>");
            body.Append(SubjectsTable(d.Subjects, navy, fg, showTerms: false));
            body.Append(ResultSummaryBar(d, navy, fg));
            body.Append(AttendanceBar(d.Attendance, navy, fg));
            if (d.CoScholasticItems.Count > 0) body.Append(CoScholasticTable(d.CoScholasticItems, deepGreen, fg));
            body.Append(RemarksSection(d, navy, fg));
            body.Append($"<div style='margin-top:6px;font-size:10px;font-weight:700;color:{navy};border-left:4px solid {saffron};padding-left:8px;text-transform:uppercase;'>Grade Reference</div>");
            body.Append(GradeScale(d.BoardType, navy, fg));
            body.Append(SignatureRow(d, navy));
            body.Append("</div>");

            body.Append($"<div style='display:flex;height:10px;'><div style='flex:1;background:{saffron};'></div><div style='flex:1;background:#fff;border-top:1px solid #ccc;border-bottom:1px solid #ccc;'></div><div style='flex:1;background:{deepGreen};'></div></div>");
            body.Append("</div>");

            return BaseHtml($"State Board Report — {d.StudentName}", body.ToString());
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template 5: Modern Premium  (clean white + deep purple accent)
        // ─────────────────────────────────────────────────────────────────────
        private static string RenderModernPremium(ReportCardDocumentDto d)
        {
            const string primary = "#4a148c";   // Deep purple
            const string accent = "#7b1fa2";
            const string soft = "#f3e5f5";
            const string fg = "#ffffff";

            var body = new StringBuilder();
            body.Append($"<div style='max-width:820px;margin:0 auto;font-family:\"Segoe UI\",system-ui,sans-serif;'>");

            // Sidebar + header layout
            body.Append($@"<div style='display:flex;background:{primary};color:#fff;min-height:120px;'>
  <div style='flex:0 0 auto;padding:20px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:2px solid rgba(255,255,255,0.2);min-width:100px;'>
    {(!string.IsNullOrWhiteSpace(d.SchoolLogoUrl) ? $"<img src='{d.SchoolLogoUrl}' style='width:72px;height:72px;object-fit:contain;background:#fff;border-radius:50%;padding:4px;'/>" : "<div style='width:72px;height:72px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;'>🎓</div>")}
    <div style='font-size:8px;margin-top:6px;opacity:0.8;text-align:center;text-transform:uppercase;letter-spacing:0.5px;'>{d.BoardType}</div>
  </div>
  <div style='flex:1;padding:20px 24px;'>
    <div style='font-size:22px;font-weight:800;line-height:1.2;'>{d.SchoolName}</div>
    {(!string.IsNullOrWhiteSpace(d.SchoolAddress) ? $"<div style='font-size:10px;opacity:0.8;margin-top:4px;'>{d.SchoolAddress}</div>" : "")}
    {(!string.IsNullOrWhiteSpace(d.SchoolPhone) ? $"<div style='font-size:10px;opacity:0.8;'>Ph: {d.SchoolPhone}</div>" : "")}
    <div style='margin-top:8px;'>
      <span style='background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.4);padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;'>PROGRESS REPORT CARD</span>
      <span style='background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.4);padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-left:8px;'>{d.Term} | {d.AcademicYear}</span>
    </div>
  </div>
</div>");

            // Student profile strip
            var passColor = d.ResultStatus == "Pass" || d.ResultStatus == "Promoted" ? "#16a34a" : "#dc2626";
            body.Append($@"<div style='background:{soft};padding:12px 24px;display:flex;align-items:center;gap:16px;border-bottom:2px solid {primary};'>
  {(!string.IsNullOrWhiteSpace(d.StudentPhotoUrl) ? $"<img src='{d.StudentPhotoUrl}' style='width:64px;height:80px;object-fit:cover;border-radius:6px;border:2px solid {primary};'/>" : $"<div style='width:64px;height:80px;background:#e9d5ff;border-radius:6px;border:2px solid {primary};display:flex;align-items:center;justify-content:center;font-size:28px;'>👤</div>")}
  <div style='flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;'>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Student</div><div style='font-weight:700;font-size:13px;'>{d.StudentName}</div></div>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Adm. No</div><div style='font-weight:700;'>{d.AdmissionNo ?? "—"}</div></div>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Class</div><div style='font-weight:700;'>{d.ClassName} {d.SectionName}</div></div>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Father</div><div style='font-weight:600;'>{d.FatherName ?? "—"}</div></div>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Mother</div><div style='font-weight:600;'>{d.MotherName ?? "—"}</div></div>
    <div><div style='font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:600;'>Date of Birth</div><div style='font-weight:600;'>{d.DateOfBirth ?? "—"}</div></div>
  </div>
  <div style='text-align:center;padding:10px 20px;background:#fff;border-radius:10px;border:2px solid {(d.ResultStatus == "Pass" || d.ResultStatus == "Promoted" ? "#16a34a" : "#dc2626")};'>
    <div style='font-size:26px;font-weight:800;color:{primary};'>{d.Percentage:F1}%</div>
    <div style='font-size:18px;font-weight:800;color:{primary};'>{d.OverallGrade ?? "—"}</div>
    <div style='font-size:11px;font-weight:800;color:{passColor};'>{(d.ResultStatus == "Pass" ? "PASS ✓" : d.ResultStatus == "Promoted" ? "PROMOTED" : "FAIL")}</div>
    {(d.ClassRank.HasValue ? $"<div style='font-size:9px;color:#6b7280;'>Rank {d.ClassRank}/{d.TotalStudentsInClass}</div>" : "")}
  </div>
</div>");

            body.Append("<div style='padding:16px 24px;'>");
            body.Append($"<div style='font-weight:700;font-size:13px;color:{primary};margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid {soft};letter-spacing:0.5px;'>SUBJECT-WISE PERFORMANCE</div>");
            body.Append(SubjectsTable(d.Subjects, primary, fg, showTerms: true));
            body.Append(AttendanceBar(d.Attendance, primary, fg));
            if (d.CoScholasticItems.Count > 0) body.Append(CoScholasticTable(d.CoScholasticItems, accent, fg));
            body.Append(RemarksSection(d, primary, fg));
            body.Append($"<div style='margin-top:8px;font-size:10px;font-weight:700;color:{primary};padding-bottom:4px;border-bottom:1px solid {soft};'>GRADING SCALE REFERENCE</div>");
            body.Append(GradeScale(d.BoardType, primary, fg));
            body.Append(SignatureRow(d, primary));
            body.Append("</div>");

            body.Append($"<div style='background:{primary};color:#fff;padding:6px 24px;font-size:9px;display:flex;justify-content:space-between;'><span>Generated: {DateTime.Now:dd MMM yyyy}</span>{(d.IsEdited ? "<span style='color:#fbbf24;'>★ Corrected Document — " + d.EditRemarks + "</span>" : "")}<span>Digitally Verified | School Management System</span></div>");
            body.Append("</div>");

            return BaseHtml($"Report Card — {d.StudentName}", body.ToString());
        }

        // ─────────────────────────────────────────────────────────────────────
        // Template info for the frontend gallery
        // ─────────────────────────────────────────────────────────────────────
        public static List<TemplatePreviewResponse> GetTemplateGallery()
        {
            return new List<TemplatePreviewResponse>
            {
                new()
                {
                    TemplateStyle = "CBSE_Classic",
                    DisplayName = "CBSE Classic",
                    Description = "Traditional CBSE-style layout with maroon & navy theme. Trusted by thousands of CBSE schools across India.",
                    BoardCompatibility = "CBSE, All Boards",
                    PrimaryColor = "#800020",
                    SampleHtml = "<div style='padding:8px;border:2px solid #800020;font-family:Arial;'><div style='background:#800020;color:#fff;padding:4px 8px;font-weight:bold;font-size:11px;'>CBSE CLASSIC</div><div style='background:#1a237e;color:#fff;padding:2px 8px;font-size:9px;'>PROGRESS REPORT CARD</div><div style='padding:4px;font-size:9px;'>Maroon & Navy • Double Border • Traditional</div></div>"
                },
                new()
                {
                    TemplateStyle = "CBSE_Modern",
                    DisplayName = "CBSE Modern",
                    Description = "Contemporary CBSE layout with blue gradient design. Ideal for modern schools wanting a professional digital look.",
                    BoardCompatibility = "CBSE, IGCSE",
                    PrimaryColor = "#1565c0",
                    SampleHtml = "<div style='padding:8px;border-radius:4px;overflow:hidden;font-family:Arial;'><div style='background:linear-gradient(135deg,#1565c0,#0288d1);color:#fff;padding:6px 8px;font-weight:bold;font-size:11px;'>CBSE MODERN</div><div style='background:#f0f7ff;padding:4px;font-size:9px;'>Blue Gradient • Grid Info • Clean</div></div>"
                },
                new()
                {
                    TemplateStyle = "ICSE_Standard",
                    DisplayName = "ICSE Standard",
                    Description = "Formal ICSE/ISC layout with dark green & gold accents. Matches the style expected by ISC board school communities.",
                    BoardCompatibility = "ICSE, ISC",
                    PrimaryColor = "#1b5e20",
                    SampleHtml = "<div style='padding:8px;border:2px solid #b8860b;font-family:Arial;'><div style='background:#1b5e20;color:#fff;padding:4px 8px;font-weight:bold;font-size:11px;'>ICSE STANDARD</div><div style='background:#b8860b;color:#fff;padding:2px 8px;font-size:9px;'>ANNUAL PROGRESS REPORT</div><div style='padding:4px;font-size:9px;'>Forest Green & Gold • Formal • ISC Style</div></div>"
                },
                new()
                {
                    TemplateStyle = "StateBoard_Elite",
                    DisplayName = "State Board Elite",
                    Description = "Saffron & tricolor design representing state board pride. Compatible with Maharashtra, Karnataka, Tamil Nadu, and other state boards.",
                    BoardCompatibility = "StateBoard, All Regional Boards",
                    PrimaryColor = "#ff6f00",
                    SampleHtml = "<div style='padding:8px;border:1px solid #bbb;font-family:Arial;'><div style='display:flex;height:6px;'><div style='flex:1;background:#ff6f00;'></div><div style='flex:1;background:#fff;border-top:1px solid #ccc;'></div><div style='flex:1;background:#2e7d32;'></div></div><div style='background:#283593;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;'>STATE BOARD ELITE</div><div style='padding:4px;font-size:9px;'>Tricolor • Saffron • State Pride</div></div>"
                },
                new()
                {
                    TemplateStyle = "Modern_Premium",
                    DisplayName = "Modern Premium",
                    Description = "Industry-leading modern layout with deep purple accent used by top CBSE, IGCSE & IB schools. Features student photo prominently and circular result badge.",
                    BoardCompatibility = "CBSE, ICSE, IGCSE, IB, All Boards",
                    PrimaryColor = "#4a148c",
                    SampleHtml = "<div style='padding:8px;border-radius:6px;overflow:hidden;font-family:Arial;'><div style='background:#4a148c;color:#fff;padding:8px;font-weight:bold;font-size:11px;display:flex;justify-content:space-between;'><span>MODERN PREMIUM</span><span style='background:rgba(255,255,255,0.2);padding:1px 8px;border-radius:10px;font-size:9px;'>ALL BOARDS</span></div><div style='background:#f3e5f5;padding:4px 8px;font-size:9px;'>Deep Purple • Grade Badge • Photo Strip • Premium</div></div>"
                },
            };
        }
    }
}

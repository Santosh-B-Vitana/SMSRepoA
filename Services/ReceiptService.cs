using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using System.Text;

namespace SmsApi.Services;

public class ReceiptService : IReceiptService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ReceiptService(AppDbContext context, IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Converts a relative URL (e.g. /files/schools/.../logo.jpg) to an absolute URL
    /// so that &lt;img&gt; tags work in receipt popups opened from a different origin/port.
    /// </summary>
    private string ResolveUrl(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl)) return string.Empty;
        if (relativeUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            relativeUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            relativeUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return relativeUrl;

        // Try configured server URL first (overrides auto-detection in reverse-proxy scenarios)
        var configured = _configuration["App:ServerUrl"] ?? _configuration["ServerUrl"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.TrimEnd('/') + "/" + relativeUrl.TrimStart('/');

        // Fall back to current request origin
        var req = _httpContextAccessor.HttpContext?.Request;
        if (req != null)
            return $"{req.Scheme}://{req.Host}{(relativeUrl.StartsWith('/') ? relativeUrl : "/" + relativeUrl)}";

        return relativeUrl;
    }

    public async Task<byte[]> GeneratePaymentReceiptPdfAsync(Guid paymentId, Guid schoolId)
    {
        var payment = await _context.PaymentTransactions
            .Include(pt => pt.FeeRecord)
                .ThenInclude(fr => fr!.Student)
            .Include(pt => pt.FeeRecord)
                .ThenInclude(fr => fr!.FeeStructure)
            .FirstOrDefaultAsync(pt => pt.Id == paymentId && pt.SchoolId == schoolId);

        if (payment == null)
            throw new KeyNotFoundException($"Payment transaction with ID {paymentId} not found");

        var school = await _context.Schools.FindAsync(schoolId);
        var html = GenerateReceiptHtml(payment, school);
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<bool> SendReceiptEmailAsync(Guid paymentId, Guid schoolId, string recipientEmail)
    {
        var pdfBytes = await GeneratePaymentReceiptPdfAsync(paymentId, schoolId);
        try
        {
            var smtpHost = _configuration.GetValue<string>("Email:SmtpHost");
            var smtpPort = _configuration.GetValue<int?>("Email:SmtpPort") ?? 587;
            var smtpUsername = _configuration.GetValue<string>("Email:SmtpUsername");
            var smtpPassword = _configuration.GetValue<string>("Email:SmtpPassword");
            var fromEmail = _configuration.GetValue<string>("Email:FromEmail");
            var enableSsl = _configuration.GetValue<bool?>("Email:EnableSsl") ?? true;

            if (!string.IsNullOrEmpty(smtpHost) && !string.IsNullOrEmpty(fromEmail))
            {
                using var client = new System.Net.Mail.SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new System.Net.NetworkCredential(smtpUsername, smtpPassword),
                    EnableSsl = enableSsl
                };
                var mailMessage = new System.Net.Mail.MailMessage(fromEmail, recipientEmail,
                    "Fee Payment Receipt", "Please find your fee payment receipt attached.")
                { IsBodyHtml = false };
                var attachment = new System.Net.Mail.Attachment(
                    new MemoryStream(pdfBytes), $"receipt_{paymentId}.html", "text/html");
                mailMessage.Attachments.Add(attachment);
                await client.SendMailAsync(mailMessage);
                return true;
            }
        }
        catch { return false; }
        return false;
    }

    // ── Amount in Words (Indian numbering system) ──────────────────────────────
    private static string AmountInWords(decimal amount)
    {
        var intPart = (long)Math.Floor(amount);
        var decPart = (int)Math.Round((amount - intPart) * 100);
        var words = IntToWords(intPart) + " Rupees";
        if (decPart > 0) words += " and " + IntToWords(decPart) + " Paise";
        return words + " Only";
    }

    private static string IntToWords(long n)
    {
        if (n == 0) return "Zero";
        if (n < 0) return "Minus " + IntToWords(-n);
        string[] ones = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                          "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                          "Seventeen", "Eighteen", "Nineteen" };
        string[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };
        var w = "";
        if (n >= 10_000_000) { w += IntToWords(n / 10_000_000) + " Crore "; n %= 10_000_000; }
        if (n >= 100_000)    { w += IntToWords(n / 100_000)    + " Lakh ";  n %= 100_000; }
        if (n >= 1_000)      { w += IntToWords(n / 1_000)      + " Thousand "; n %= 1_000; }
        if (n >= 100)        { w += ones[n / 100] + " Hundred "; n %= 100; }
        if (n >= 20)         { w += tens[n / 10] + " "; n %= 10; }
        if (n > 0)           w += ones[n] + " ";
        return w.Trim();
    }

    // ── Format payment method for display ─────────────────────────────────────
    private static string FormatMethod(string method) => (method?.ToLower()) switch
    {
        "cash"     => "Cash",
        "cheque"   => "Cheque",
        "dd"       => "Demand Draft (DD)",
        "cashfree" => "Online (Cashfree)",
        "upi"      => "UPI",
        "neft"     => "NEFT",
        "rtgs"     => "RTGS",
        "card"     => "Card",
        _          => method ?? "—"
    };

    // ── Premium Receipt HTML ───────────────────────────────────────────────────
    private string GenerateReceiptHtml(PaymentTransaction payment, School? school)
    {
        var fr           = payment.FeeRecord;
        var student      = fr?.Student;
        var structure    = fr?.FeeStructure;
        var schoolName   = school?.Name   ?? "School Name";
        var schoolAddr   = school?.Address ?? "";
        var schoolPhone  = school?.Phone  ?? "";
        var schoolEmail  = school?.Email  ?? "";
        var schoolLogo   = ResolveUrl(school?.Logo);

        var studentName  = student?.Name             ?? "N/A";
        var admNo        = student?.AdmissionNumber  ?? "N/A";
        var className    = student?.Class            ?? "N/A";
        var section      = student?.Section         ?? "";
        var classSection = section.Length > 0 ? $"{className} – {section}" : className;

        var receiptNo    = payment.ReceiptNumber;
        var payDate      = payment.Date.ToString("dd MMMM yyyy");
        var academicYear = payment.AcademicYear ?? fr?.AcademicYear ?? "—";

        var methodStr    = FormatMethod(payment.Method);
        var refStr       = payment.GatewayRef ?? payment.ChequeNumber ?? payment.ReferenceNumber ?? "—";
        var bankStr      = payment.BankName ?? "";
        var cheqDate     = payment.ChequeDate.HasValue ? payment.ChequeDate.Value.ToString("dd MMM yyyy") : "";
        var processedBy  = payment.ProcessedBy ?? "—";

        var amtPaid        = payment.Amount;
        var totalFee       = fr?.TotalAmount    ?? 0m;
        var totalPaid      = fr?.PaidAmount     ?? 0m;
        var discount       = fr?.DiscountAmount ?? 0m;
        var lateFee        = fr?.LateFeeAmount  ?? 0m;
        var balance        = fr?.PendingAmount  ?? 0m;
        var isFullyPaid    = balance <= 0.01m;

        var amtWords       = AmountInWords(amtPaid);

        // School initials for logo placeholder
        var initials = string.Concat((schoolName.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                            .Take(2).Select(w => w[0])).ToUpper();

        // Fee head breakdown rows (only populated heads)
        var headRows = new StringBuilder();
        if (structure != null)
        {
            void AddRow(string label, decimal val)
            {
                if (val > 0)
                {
                    var discAmt = discount > 0 && totalFee > 0 ? Math.Round(val * discount / totalFee) : 0;
                    var net = val - discAmt;
                    headRows.Append($@"
                <tr>
                  <td>{label}</td>
                  <td class='num'>₹{val:N0}</td>
                  <td class='num disc'>{(discAmt > 0 ? $"−₹{discAmt:N0}" : "—")}</td>
                  <td class='num'>₹{net:N0}</td>
                </tr>");
                }
            }
            if (structure.TuitionFee   > 0) AddRow("Tuition Fee",        structure.TuitionFee);
            if (structure.ExamFee      > 0) AddRow("Examination Fee",    structure.ExamFee);
            if (structure.LibraryFee   > 0) AddRow("Library Fee",        structure.LibraryFee);
            if (structure.LabFee       > 0) AddRow("Science / Lab Fee",  structure.LabFee);
            if (structure.DevelopmentFee> 0) AddRow("Development Fund",  structure.DevelopmentFee);
            if (structure.SportsFee    > 0) AddRow("Sports / Activity",  structure.SportsFee);
            if (structure.AdmissionFee > 0) AddRow("Admission Fee",      structure.AdmissionFee);
            if (structure.TransportFee > 0) AddRow("Transport Fee",      structure.TransportFee);
            if (structure.HostelFee    > 0) AddRow("Hostel Fee",         structure.HostelFee);
            if (structure.UniformFee   > 0) AddRow("Uniform Fee",        structure.UniformFee);
            if (structure.BooksFee     > 0) AddRow("Books / Stationery", structure.BooksFee);
            if (structure.Miscellaneous> 0) AddRow("Miscellaneous",      structure.Miscellaneous);
        }
        // If extra charges were added (total > structure total), add a row
        var extraAmt = structure != null ? totalFee - structure.TotalAmount : 0m;
        if (extraAmt > 0)
        {
            headRows.Append($@"
                <tr class='extra-row'>
                  <td>Additional Charges</td>
                  <td class='num'>₹{extraAmt:N0}</td>
                  <td class='num disc'>—</td>
                  <td class='num'>₹{extraAmt:N0}</td>
                </tr>");
        }

        // Payment reference detail rows
        var refRows = new StringBuilder();
        if (payment.Method?.ToLower() is "cheque" or "dd")
        {
            refRows.Append($"<tr><td class='lbl'>Instrument No.</td><td>{payment.ChequeNumber ?? "—"}</td></tr>");
            if (cheqDate.Length > 0) refRows.Append($"<tr><td class='lbl'>Instrument Date</td><td>{cheqDate}</td></tr>");
            if (bankStr.Length > 0)  refRows.Append($"<tr><td class='lbl'>Drawee Bank</td><td>{bankStr}</td></tr>");
        }
        else if (payment.GatewayRef?.Length > 0)
        {
            refRows.Append($"<tr><td class='lbl'>Transaction Ref</td><td class='mono'>{payment.GatewayRef}</td></tr>");
        }

        var watermark = isFullyPaid
            ? @"<div class='watermark'>PAID</div>"
            : (balance > 0 && fr?.Status == "overdue" ? @"<div class='watermark overdue-wm'>OVERDUE</div>" : "");

        var footerMsg = _configuration.GetValue<string>("settings:receipt_footer")
                        ?? "Thank you for your prompt payment.";

        return $@"<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>Fee Receipt – {receiptNo}</title>
<link rel='preconnect' href='https://fonts.googleapis.com'>
<link href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap' rel='stylesheet'>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin:0; padding:0; }}
  body {{
    font-family: 'Inter', Arial, sans-serif;
    background: #f4f6f9;
    color: #1a1a2e;
    font-size: 13px;
    line-height: 1.5;
  }}
  .page {{
    max-width: 820px;
    margin: 30px auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.12);
    overflow: hidden;
    position: relative;
  }}
  /* ── Header band ── */
  .header {{
    background: linear-gradient(135deg, #0f2557 0%, #1a3a7a 60%, #1e4a9c 100%);
    padding: 28px 36px 22px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 22px;
  }}
  .school-logo {{
    width: 68px; height: 68px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 2.5px solid rgba(255,255,255,0.45);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700;
    color: #fff; letter-spacing: 1px; flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
  }}
  .school-logo img {{
    width: 100%; height: 100%;
    object-fit: contain;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    padding: 4px;
  }}
  .school-info {{ flex: 1; }}
  .school-name {{
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700;
    letter-spacing: 0.3px; line-height: 1.2;
  }}
  .school-meta {{
    margin-top: 4px; font-size: 11.5px;
    color: rgba(255,255,255,0.75);
    display: flex; flex-wrap: wrap; gap: 12px;
  }}
  .school-meta span::before {{ content: ''; }}
  .receipt-badge {{
    flex-shrink: 0; text-align: right;
  }}
  .receipt-badge .label {{
    font-size: 10px; font-weight: 600; letter-spacing: 2px;
    text-transform: uppercase; color: rgba(255,255,255,0.6);
  }}
  .receipt-badge .number {{
    font-size: 18px; font-weight: 700; color: #fff;
    font-variant-numeric: tabular-nums;
  }}
  .receipt-badge .date {{ font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }}

  /* ── Title strip ── */
  .title-strip {{
    background: #f0f4ff;
    border-top: 3px solid #c8d8ff;
    border-bottom: 1px solid #dde6f7;
    padding: 10px 36px;
    display: flex; align-items: center; justify-content: center;
    gap: 12px;
  }}
  .title-strip h1 {{
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 700;
    color: #0f2557; letter-spacing: 1.5px; text-transform: uppercase;
  }}
  .academic-pill {{
    font-size: 11px; font-weight: 600; color: #1a3a7a;
    background: #dde8ff; border-radius: 20px;
    padding: 3px 12px; border: 1px solid #b8caff;
  }}

  /* ── Body ── */
  .body {{ padding: 24px 36px; }}

  /* ── Student card ── */
  .student-card {{
    background: #fafbff;
    border: 1px solid #e2e8f5;
    border-radius: 8px;
    padding: 14px 18px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px 24px;
    margin-bottom: 20px;
  }}
  .field-group {{ display: flex; flex-direction: column; gap: 2px; }}
  .field-label {{ font-size: 10px; font-weight: 600; text-transform: uppercase;
                  letter-spacing: 0.8px; color: #7b8fb5; }}
  .field-value {{ font-size: 13px; font-weight: 600; color: #1a1a2e; }}
  .field-value.large {{ font-size: 15px; }}
  .field-value.mono {{ font-family: monospace; font-size: 12px; }}
  .field-value.green {{ color: #15803d; }}
  .field-value.red   {{ color: #b91c1c; }}

  /* ── Section heading ── */
  .section-heading {{
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.2px; color: #7b8fb5;
    margin-bottom: 8px; padding-bottom: 5px;
    border-bottom: 1px solid #e8edf7;
  }}

  /* ── Fee breakdown table ── */
  .fee-table {{ width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 20px; }}
  .fee-table thead tr {{ background: #0f2557; color: #fff; }}
  .fee-table thead th {{
    padding: 8px 12px; text-align: left; font-weight: 600;
    font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;
  }}
  .fee-table thead th.num {{ text-align: right; }}
  .fee-table tbody tr {{ border-bottom: 1px solid #eef1f8; }}
  .fee-table tbody tr:nth-child(even) {{ background: #f9fbff; }}
  .fee-table tbody tr:hover {{ background: #f0f4ff; }}
  .fee-table td {{ padding: 7px 12px; }}
  .fee-table td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .fee-table td.disc {{ color: #15803d; font-size: 11.5px; }}
  .fee-table tfoot tr {{ background: #0f2557; color: #fff; }}
  .fee-table tfoot td {{ padding: 9px 12px; font-weight: 600; }}
  .fee-table tfoot td.num {{ text-align:right; font-variant-numeric: tabular-nums; }}
  .fee-table .extra-row td {{ color: #c2410c; font-style: italic; }}

  /* ── Summary box ── */
  .summary-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }}
  .summary-box {{
    background: #fafbff;
    border: 1px solid #e2e8f5;
    border-radius: 8px;
    padding: 14px 18px;
  }}
  .summary-box.highlight {{
    background: #0f2557;
    border-color: #0f2557;
    color: #fff;
  }}
  .summary-row {{
    display: flex; justify-content: space-between;
    padding: 4px 0; font-size: 12.5px;
    border-bottom: 1px dashed #e2e8f5;
  }}
  .summary-box.highlight .summary-row {{ border-color: rgba(255,255,255,0.15); }}
  .summary-row:last-child {{ border-bottom: none; }}
  .summary-row .s-label {{ color: #6b7280; font-size: 12px; }}
  .summary-box.highlight .s-label {{ color: rgba(255,255,255,0.65); }}
  .summary-row .s-val {{ font-weight: 600; font-variant-numeric: tabular-nums; }}
  .summary-row.total-row .s-label {{ font-size: 13px; font-weight: 700; color: #0f2557; }}
  .summary-row.total-row .s-val {{ font-size: 17px; color: #0f2557; }}
  .summary-box.highlight .summary-row.total-row .s-label {{ color: #fff; }}
  .summary-box.highlight .summary-row.total-row .s-val {{ color: #a3f7d4; font-size: 20px; }}
  .paid-label {{ text-align:center; font-size: 10px; font-weight:700; letter-spacing:2px;
                  text-transform:uppercase; color: rgba(255,255,255,0.55); margin-bottom:4px; }}

  /* ── Amount in words ── */
  .words-box {{
    background: #fffbeb;
    border: 1px dashed #f59e0b;
    border-radius: 6px;
    padding: 10px 16px;
    font-size: 12.5px;
    color: #92400e;
    margin-bottom: 20px;
  }}
  .words-label {{ font-size: 10px; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 1px; color: #d97706; margin-bottom: 2px; }}

  /* ── Payment details table ── */
  .pay-table {{ width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 20px; }}
  .pay-table td {{ padding: 6px 0; border-bottom: 1px dashed #e8edf7; }}
  .pay-table td.lbl {{ width: 38%; color: #6b7280; font-weight: 500; }}
  .pay-table td.mono {{ font-family: monospace; font-size: 12px; }}
  .pay-table tr:last-child td {{ border-bottom: none; }}

  /* ── Signatures ── */
  .sig-section {{
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 20px; margin-top: 32px;
    border-top: 2px solid #e2e8f5; padding-top: 16px;
  }}
  .sig-box {{ text-align: center; }}
  .sig-line {{
    border-bottom: 1px solid #374151;
    height: 50px; margin-bottom: 6px;
  }}
  .sig-caption {{
    font-size: 10.5px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.8px; color: #6b7280;
  }}

  /* ── Footer ── */
  .footer {{
    background: #f4f6f9;
    border-top: 1px solid #e2e8f5;
    padding: 12px 36px;
    text-align: center;
    font-size: 11px; color: #9ca3af;
    line-height: 1.8;
  }}
  .footer strong {{ color: #6b7280; }}

  /* ── Watermark ── */
  .watermark {{
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-family: 'Playfair Display', serif;
    font-size: 110px; font-weight: 700;
    color: rgba(16, 185, 129, 0.06);
    pointer-events: none; user-select: none;
    letter-spacing: 20px; text-transform: uppercase;
    white-space: nowrap;
  }}
  .watermark.overdue-wm {{ color: rgba(220,38,38,0.05); }}

  /* ── Print optimisations ── */
  @media print {{
    body {{ background: #fff; }}
    .page {{ box-shadow: none; margin: 0; border-radius: 0; }}
    a {{ text-decoration: none; }}
  }}
</style>
</head>
<body>
<div class='page'>
  {watermark}

  <!-- ── HEADER ── -->
  <div class='header'>
    <div class='school-logo'>
      {(schoolLogo.Length > 0
        ? $"<img src='{System.Web.HttpUtility.HtmlAttributeEncode(schoolLogo)}' alt='{System.Web.HttpUtility.HtmlEncode(schoolName)} logo' loading='eager' />"
        : System.Web.HttpUtility.HtmlEncode(initials))}
    </div>
    <div class='school-info'>
      <div class='school-name'>{System.Web.HttpUtility.HtmlEncode(schoolName)}</div>
      <div class='school-meta'>
        {(schoolAddr.Length > 0 ? $"<span>{System.Web.HttpUtility.HtmlEncode(schoolAddr)}</span>" : "")}
        {(schoolPhone.Length > 0 ? $"<span>📞 {System.Web.HttpUtility.HtmlEncode(schoolPhone)}</span>" : "")}
        {(schoolEmail.Length > 0 ? $"<span>✉ {System.Web.HttpUtility.HtmlEncode(schoolEmail)}</span>" : "")}
      </div>
    </div>
    <div class='receipt-badge'>
      <div class='label'>Receipt</div>
      <div class='number'>#{System.Web.HttpUtility.HtmlEncode(receiptNo)}</div>
      <div class='date'>{payDate}</div>
    </div>
  </div>

  <!-- ── TITLE STRIP ── -->
  <div class='title-strip'>
    <h1>Official Fee Receipt</h1>
    <span class='academic-pill'>AY {System.Web.HttpUtility.HtmlEncode(academicYear)}</span>
  </div>

  <!-- ── BODY ── -->
  <div class='body'>

    <!-- Student info -->
    <div class='section-heading'>Student Details</div>
    <div class='student-card'>
      <div class='field-group'>
        <span class='field-label'>Student Name</span>
        <span class='field-value large'>{System.Web.HttpUtility.HtmlEncode(studentName)}</span>
      </div>
      <div class='field-group'>
        <span class='field-label'>Admission No.</span>
        <span class='field-value mono'>{System.Web.HttpUtility.HtmlEncode(admNo)}</span>
      </div>
      <div class='field-group'>
        <span class='field-label'>Class / Section</span>
        <span class='field-value'>{System.Web.HttpUtility.HtmlEncode(classSection)}</span>
      </div>
      {(structure != null ? $@"
      <div class='field-group'>
        <span class='field-label'>Fee Structure</span>
        <span class='field-value'>{System.Web.HttpUtility.HtmlEncode(structure.Name)}</span>
      </div>" : "")}
      <div class='field-group'>
        <span class='field-label'>Account Balance After</span>
        <span class='field-value {(isFullyPaid ? "green" : "red")}'>{(isFullyPaid ? "✓ Cleared" : $"₹{balance:N0} due")}</span>
      </div>
    </div>

    <!-- Fee breakdown (only if structure data available) -->
    {(headRows.Length > 0 ? $@"
    <div class='section-heading'>Fee Breakdown</div>
    <table class='fee-table'>
      <thead>
        <tr>
          <th>Description</th>
          <th class='num'>Amount</th>
          <th class='num'>Concession</th>
          <th class='num'>Payable</th>
        </tr>
      </thead>
      <tbody>{headRows}</tbody>
      <tfoot>
        <tr>
          <td>Annual Total</td>
          <td class='num'>₹{totalFee:N0}</td>
          <td class='num'>{(discount > 0 ? $"−₹{discount:N0}" : "—")}</td>
          <td class='num'>₹{(totalFee - discount):N0}</td>
        </tr>
      </tfoot>
    </table>" : "")}

    <!-- Summary + This payment -->
    <div class='summary-grid'>
      <div class='summary-box'>
        <div class='section-heading' style='margin-top:0'>Account Summary</div>
        <div class='summary-row'>
          <span class='s-label'>Total Assessed Fee</span>
          <span class='s-val'>₹{totalFee:N0}</span>
        </div>
        {(discount > 0 ? $@"<div class='summary-row'>
          <span class='s-label'>Concession Applied</span>
          <span class='s-val' style='color:#15803d'>−₹{discount:N0}</span>
        </div>" : "")}
        {(lateFee > 0 ? $@"<div class='summary-row'>
          <span class='s-label'>Late Fee Added</span>
          <span class='s-val' style='color:#b45309'>+₹{lateFee:N0}</span>
        </div>" : "")}
        <div class='summary-row'>
          <span class='s-label'>Previously Paid</span>
          <span class='s-val'>₹{(totalPaid - amtPaid):N0}</span>
        </div>
        <div class='summary-row total-row'>
          <span class='s-label'>Balance Due After This Payment</span>
          <span class='s-val {(isFullyPaid ? "" : "red")}'>{(isFullyPaid ? "₹0 ✓" : $"₹{balance:N0}")}</span>
        </div>
      </div>
      <div class='summary-box highlight'>
        <div class='paid-label'>Amount Received</div>
        <div class='summary-row total-row'>
          <span class='s-label'>Collected</span>
          <span class='s-val'>₹{amtPaid:N0}</span>
        </div>
        <div class='summary-row'>
          <span class='s-label'>Mode</span>
          <span class='s-val'>{System.Web.HttpUtility.HtmlEncode(methodStr)}</span>
        </div>
        <div class='summary-row'>
          <span class='s-label'>Date</span>
          <span class='s-val'>{payDate}</span>
        </div>
        <div class='summary-row'>
          <span class='s-label'>Received By</span>
          <span class='s-val'>{System.Web.HttpUtility.HtmlEncode(processedBy)}</span>
        </div>
      </div>
    </div>

    <!-- Amount in words -->
    <div class='words-box'>
      <div class='words-label'>Amount in Words</div>
      {System.Web.HttpUtility.HtmlEncode(amtWords)}
    </div>

    <!-- Payment reference details -->
    <div class='section-heading'>Payment Reference</div>
    <table class='pay-table'>
      <tr><td class='lbl'>Receipt No.</td><td class='mono'>{System.Web.HttpUtility.HtmlEncode(receiptNo)}</td></tr>
      <tr><td class='lbl'>Payment Method</td><td>{System.Web.HttpUtility.HtmlEncode(methodStr)}</td></tr>
      <tr><td class='lbl'>Transaction Date</td><td>{payDate}</td></tr>
      {refRows}
      <tr><td class='lbl'>Processed By</td><td>{System.Web.HttpUtility.HtmlEncode(processedBy)}</td></tr>
      {(payment.Remarks?.Length > 0 ? $"<tr><td class='lbl'>Remarks</td><td>{System.Web.HttpUtility.HtmlEncode(payment.Remarks)}</td></tr>" : "")}
    </table>

    <!-- Signatures -->
    <div class='sig-section'>
      <div class='sig-box'>
        <div class='sig-line'></div>
        <div class='sig-caption'>Parent / Guardian Signature</div>
      </div>
      <div class='sig-box'>
        <div class='sig-line'></div>
        <div class='sig-caption'>Student Signature</div>
      </div>
      <div class='sig-box'>
        <div class='sig-line'></div>
        <div class='sig-caption'>Authorised Signatory</div>
      </div>
    </div>

  </div><!-- /body -->

  <!-- ── FOOTER ── -->
  <div class='footer'>
    <strong>{System.Web.HttpUtility.HtmlEncode(footerMsg)}</strong><br>
    This is a computer-generated receipt. No signature is required for digital receipts.<br>
    Generated: {DateTime.UtcNow:dd MMM yyyy, HH:mm} UTC &nbsp;|&nbsp; Receipt ID: {payment.Id}
  </div>
</div>

<script>
  // Auto-trigger print when loaded standalone
  if (window.opener) {{
    window.addEventListener('load', () => {{ 
      setTimeout(() => {{ 
        window.focus();
        window.print(); 
      }}, 300); 
    }});
  }}
</script>
</body>
</html>";
    }
}

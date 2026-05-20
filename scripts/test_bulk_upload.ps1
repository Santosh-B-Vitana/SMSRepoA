<#
.SYNOPSIS
  Tests the bulk fee payment upload endpoint end-to-end.
  Queries the DB for real students with pending fees, creates a test CSV,
  forges a JWT using the development secret, and POSTs to /fees/payments/bulk-upload.
#>

param(
    [string]$ApiBase = "http://localhost:5092/api",
    [string]$ConnStr = "Server=sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com;Database=SMS_Sch3;User Id=sms_app_admin;Password=VitanaSMSApp1;TrustServerCertificate=True",
    [string]$JwtSecret = "dev-secret-key-at-least-32-characters-long-12345"
)

# ── 1. Get admin user & school from DB ──────────────────────────────────────
Write-Host "`n=== Step 1: Getting admin user & school info ===" -ForegroundColor Cyan
$conn = New-Object System.Data.SqlClient.SqlConnection $ConnStr
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 1 Id, SchoolId, Username, Email FROM UserLogins WHERE Username='admin' AND Status='active'"
$r = $cmd.ExecuteReader()
$adminId = $adminSchoolId = $adminEmail = $null
if ($r.Read()) {
    $adminId      = $r["Id"].ToString()
    $adminSchoolId = $r["SchoolId"].ToString()
    $adminEmail   = $r["Email"].ToString()
    Write-Host "  Admin ID   : $adminId"
    Write-Host "  School ID  : $adminSchoolId"
    Write-Host "  Email      : $adminEmail"
}
$r.Close()
if (!$adminId) { Write-Error "Admin user not found in DB"; exit 1 }

# ── 2. Get 3 students with pending fees ──────────────────────────────────────
Write-Host "`n=== Step 2: Getting students with pending fees ===" -ForegroundColor Cyan
$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = @"
SELECT TOP 3
    s.AdmissionNumber,
    s.Name,
    fr.PendingAmount
FROM FeeRecords fr
JOIN Students s ON fr.StudentId = s.Id
WHERE fr.Status != 'paid'
  AND fr.PendingAmount > 100
  AND fr.IsDeleted = 0
  AND s.IsDeleted = 0
  AND s.SchoolId = '$adminSchoolId'
ORDER BY fr.PendingAmount DESC
"@
$r2 = $cmd2.ExecuteReader()
$students = @()
while ($r2.Read()) {
    $students += [PSCustomObject]@{
        AdmissionNumber = $r2["AdmissionNumber"].ToString()
        Name            = $r2["Name"].ToString()
        PendingAmount   = [decimal]$r2["PendingAmount"]
    }
    Write-Host "  $($r2['AdmissionNumber']) | $($r2['Name']) | Pending: ₹$([decimal]$r2['PendingAmount'])"
}
$r2.Close()
$conn.Close()

if ($students.Count -eq 0) { Write-Error "No students with pending fees found"; exit 1 }

# ── 3. Forge a JWT ───────────────────────────────────────────────────────────
Write-Host "`n=== Step 3: Forging development JWT ===" -ForegroundColor Cyan
function ConvertTo-Base64Url([byte[]]$bytes) {
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$header  = '{"alg":"HS256","typ":"JWT"}'
$exp     = [DateTimeOffset]::UtcNow.AddHours(2).ToUnixTimeSeconds()
$iat     = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$payload = [Ordered]@{
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" = $adminId
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"  = $adminEmail
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"          = "Admin User"
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"        = "Admin"
    "SchoolId" = $adminSchoolId
    "jti"      = [Guid]::NewGuid().ToString()
    "iat"      = $iat
    "nbf"      = $iat
    "exp"      = $exp
    "iss"      = "SmsApi"
    "aud"      = "SmsApiClient"
} | ConvertTo-Json -Compress

$enc     = [System.Text.Encoding]::UTF8
$hB64    = ConvertTo-Base64Url $enc.GetBytes($header)
$pB64    = ConvertTo-Base64Url $enc.GetBytes($payload)
$sigIn   = "$hB64.$pB64"
$hmac    = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $enc.GetBytes($JwtSecret)
$sig     = ConvertTo-Base64Url ($hmac.ComputeHash($enc.GetBytes($sigIn)))
$jwt     = "$sigIn.$sig"
Write-Host "  JWT forged (first 60 chars): $($jwt.Substring(0,60))..."

# ── 4. Build test CSV rows ────────────────────────────────────────────────────
Write-Host "`n=== Step 4: Building test payload ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")
$rows = @()
$testPaymentMethods = @("cash", "upi", "online")
for ($i = 0; $i -lt $students.Count; $i++) {
    $s = $students[$i]
    # Pay exactly half the pending amount (safe — won't overpay)
    $payAmount = [Math]::Floor($s.PendingAmount / 2)
    if ($payAmount -lt 10) { $payAmount = 10 }
    $rows += [PSCustomObject]@{
        admissionNumber = $s.AdmissionNumber
        studentName     = $s.Name
        amountPaid      = $payAmount
        paymentDate     = $today
        paymentMethod   = $testPaymentMethods[$i % 3]
        receiptNumber   = "TEST-$(Get-Date -Format 'yyyyMMdd')-$($i+1)"
        remarks         = "Automated bulk-upload test"
    }
    Write-Host "  Row $($i+1): $($s.AdmissionNumber) | ₹$payAmount | $($testPaymentMethods[$i % 3])"
}

# ── 5. POST to API ─────────────────────────────────────────────────────────
Write-Host "`n=== Step 5: Sending to $ApiBase/fees/payments/bulk-upload ===" -ForegroundColor Cyan
$body = $rows | ConvertTo-Json -Depth 3
$headers = @{ Authorization = "Bearer $jwt"; "Content-Type" = "application/json" }
try {
    $resp = Invoke-RestMethod -Uri "$ApiBase/fees/payments/bulk-upload" `
        -Method POST -Headers $headers -Body $body -ErrorAction Stop
    $d = $resp.data
    Write-Host "`n=== RESULT ===" -ForegroundColor Green
    Write-Host "  Total   : $($d.totalRows)"
    Write-Host "  Success : $($d.successful)"
    Write-Host "  Failed  : $($d.failed)"
    if ($d.errors -and $d.errors.Count -gt 0) {
        Write-Host "  Partial caps / warnings:" -ForegroundColor Yellow
        $d.errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    }
} catch {
    Write-Host "`n=== API ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}

# ── 6. Verify overpayment guard: try to send > pending ───────────────────────
Write-Host "`n=== Step 6: Overpayment guard test (should fail/cap) ===" -ForegroundColor Cyan
$bigRow = [PSCustomObject]@{
    admissionNumber = $students[0].AdmissionNumber
    studentName     = $students[0].Name
    amountPaid      = 99999999   # Absurd amount — should be capped or rejected
    paymentDate     = $today
    paymentMethod   = "cash"
    receiptNumber   = "OVERPAY-TEST"
    remarks         = "Overpayment edge case test"
}
$body2 = ConvertTo-Json -Depth 3 -InputObject @($bigRow)
try {
    $resp2 = Invoke-RestMethod -Uri "$ApiBase/fees/payments/bulk-upload" `
        -Method POST -Headers $headers -Body $body2 -ErrorAction Stop
    $d2 = $resp2.data
    Write-Host "  Overpayment result:"
    Write-Host "  Success: $($d2.successful) | Failed: $($d2.failed)"
    if ($d2.errors) { $d2.errors | Where-Object { $_ } | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow } }
} catch {
    Write-Host "  Error (expected if amount > max): $($_.Exception.Message)" -ForegroundColor Yellow
}

# ── 7. Invalid payment method test ──────────────────────────────────────────
Write-Host "`n=== Step 7: Invalid payment method test (should fail) ===" -ForegroundColor Cyan
$badMethodRow = @([PSCustomObject]@{
    admissionNumber = $students[0].AdmissionNumber
    studentName     = $students[0].Name
    amountPaid      = 100
    paymentDate     = $today
    paymentMethod   = "bitcoin"
    receiptNumber   = "BAD-METHOD-TEST"
    remarks         = "Bad payment method test"
})
$body3 = ConvertTo-Json -Depth 3 -InputObject @($badMethodRow)
try {
    $resp3 = Invoke-RestMethod -Uri "$ApiBase/fees/payments/bulk-upload" `
        -Method POST -Headers $headers -Body $body3 -ErrorAction Stop
    $d3 = $resp3.data
    Write-Host "  Invalid method result:"
    Write-Host "  Success: $($d3.successful) | Failed: $($d3.failed)"
    if ($d3.errors) { $d3.errors | Where-Object { $_ } | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow } }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Step 8: Duplicate admission number in same batch ===" -ForegroundColor Cyan
# Send the same student twice — the second should be capped at remaining balance (not double-pay)
$dupRows = @(
    [PSCustomObject]@{ admissionNumber=$students[0].AdmissionNumber; studentName=$students[0].Name; amountPaid=50; paymentDate=$today; paymentMethod="cash"; receiptNumber="DUP-TEST-A"; remarks="Dup row 1" },
    [PSCustomObject]@{ admissionNumber=$students[0].AdmissionNumber; studentName=$students[0].Name; amountPaid=50; paymentDate=$today; paymentMethod="upi";  receiptNumber="DUP-TEST-B"; remarks="Dup row 2" }
)
$bodyDup = $dupRows | ConvertTo-Json -Depth 3
try {
    $respDup = Invoke-RestMethod -Uri "$ApiBase/fees/payments/bulk-upload" `
        -Method POST -Headers $headers -Body $bodyDup -ErrorAction Stop
    $dd = $respDup.data
    Write-Host "  Total: $($dd.totalRows) | Success: $($dd.successful) | Failed: $($dd.failed)"
    if ($dd.errors) { $dd.errors | Where-Object { $_ } | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow } }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green
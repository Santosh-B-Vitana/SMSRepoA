using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _dbContext;

        public StaffController(IStaffService staffService, ITenantContext tenant, AppDbContext dbContext)
        {
            _staffService = staffService;
            _tenant = tenant;
            _dbContext = dbContext;
        }

        /// <summary>
        /// Get all staff members for the authenticated user's school
        /// </summary>
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<StaffListResponse>> GetStaff(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? department = null,
            [FromQuery] string? designation = null,
            [FromQuery] string? employmentType = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortOrder = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.GetStaffMembersAsync(schoolId, page, pageSize, search, status,
                    department, designation, employmentType, sortBy, sortOrder);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching staff.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific staff member by ID
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipalStaff)]
        public async Task<ActionResult<StaffResponse>> GetStaff(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var staff = await _staffService.GetStaffByIdAsync(id, schoolId);
                
                if (staff == null)
                {
                    return NotFound(new { message = "Staff member not found." });
                }

                return Ok(staff);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching the staff member.", error = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<StaffResponse>> CreateStaff([FromBody] CreateStaffRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var staff = await _staffService.CreateStaffAsync(request);
                return CreatedAtAction(nameof(GetStaff), new { id = staff.Id }, staff);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while creating the staff member." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<StaffResponse>> UpdateStaff(
            Guid id,
            [FromBody] UpdateStaffRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var staff = await _staffService.UpdateStaffAsync(id, schoolId, request);
                
                if (staff == null)
                {
                    return NotFound(new { message = "Staff member not found." });
                }

                return Ok(staff);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating the staff member." });
            }
        }

        [HttpGet("stats")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<StaffStatsResponse>> GetStaffStats()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var stats = await _staffService.GetStaffStatsAsync(schoolId);
                return Ok(stats);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching staff statistics." });
            }
        }

        [HttpPost("{id}/documents")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<StaffDocumentDto>> UploadDocument(Guid id, [FromForm] string documentType, IFormFile file)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                if (file.Length > 10 * 1024 * 1024) // 10MB limit
                    return BadRequest(new { message = "File size exceeds 10MB limit." });

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileData = memoryStream.ToArray();

                var document = await _staffService.UploadDocumentAsync(id, schoolId, documentType, file.FileName, fileData);
                return Ok(document);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while uploading the document." });
            }
        }

        [HttpDelete("documents/{documentId}")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> DeleteDocument(Guid documentId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.DeleteDocumentAsync(documentId, schoolId);
                
                if (!result)
                {
                    return NotFound(new { message = "Document not found." });
                }

                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while deleting the document." });
            }
        }

        [HttpGet("departments")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<List<string>>> GetDepartments()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var departments = await _staffService.GetDepartmentsAsync(schoolId);
                return Ok(departments);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching departments." });
            }
        }

        [HttpGet("designations")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<List<string>>> GetDesignations()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var designations = await _staffService.GetDesignationsAsync(schoolId);
                return Ok(designations);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching designations." });
            }
        }

        [HttpGet("{id}/subordinates")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<List<StaffBasicResponse>>> GetSubordinates(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var subordinates = await _staffService.GetSubordinatesAsync(id, schoolId);
                return Ok(subordinates);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching subordinates." });
            }
        }

        [HttpPost("bulk-update-status")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<BulkOperationResult>> BulkUpdateStatus([FromBody] BulkUpdateStaffStatusRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.BulkUpdateStaffStatusAsync(schoolId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating staff status." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteStaff(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.DeleteStaffAsync(id, schoolId);
                
                if (!result)
                {
                    return NotFound(new { message = "Staff member not found." });
                }

                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while deleting the staff member." });
            }
        }

        // ===========================
        // Qualifications Management
        // ===========================

        /// <summary>
        /// Get all qualifications for a staff member
        /// </summary>
        [HttpGet("{id}/qualifications")]
        [Authorize(Roles = "Admin,Principal,HRManager,Staff")]
        public async Task<ActionResult<List<QualificationDto>>> GetQualifications(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var qualifications = await _staffService.GetQualificationsAsync(id, schoolId);
                return Ok(qualifications);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching qualifications." });
            }
        }

        /// <summary>
        /// Add a new qualification for a staff member
        /// </summary>
        [HttpPost("{id}/qualifications")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<QualificationDto>> AddQualification(Guid id, [FromBody] CreateQualificationDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
                var qualification = await _staffService.AddQualificationAsync(schoolId, id, dto, userId);
                return CreatedAtAction(nameof(GetQualifications), new { id }, qualification);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while adding qualification." });
            }
        }

        /// <summary>
        /// Update an existing qualification
        /// </summary>
        [HttpPut("qualifications/{qualificationId}")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<QualificationDto>> UpdateQualification(Guid qualificationId, [FromBody] UpdateQualificationDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var qualification = await _staffService.UpdateQualificationAsync(schoolId, qualificationId, dto);
                return Ok(qualification);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating qualification." });
            }
        }

        /// <summary>
        /// Delete a qualification
        /// </summary>
        [HttpDelete("qualifications/{qualificationId}")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> DeleteQualification(Guid qualificationId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.DeleteQualificationAsync(schoolId, qualificationId);
                if (!result)
                {
                    return NotFound(new { message = "Qualification not found." });
                }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while deleting qualification." });
            }
        }

        // ===========================
        // PF/ESI Management
        // ===========================

        /// <summary>
        /// Get PF/ESI details for a staff member
        /// </summary>
        [HttpGet("{id}/pfesi")]
        [Authorize(Roles = "Admin,Principal,HRManager,Finance,FinanceOfficer")]
        public async Task<ActionResult<PFESIDetailsDto>> GetPFESIDetails(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var details = await _staffService.GetPFESIDetailsAsync(id, schoolId);
                return Ok(details);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching PF/ESI details." });
            }
        }

        /// <summary>
        /// Update PF/ESI details for a staff member
        /// </summary>
        [HttpPut("{id}/pfesi")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<PFESIDetailsDto>> UpdatePFESIDetails(Guid id, [FromBody] UpdatePFESIDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var details = await _staffService.UpdatePFESIDetailsAsync(schoolId, id, dto);
                return Ok(details);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating PF/ESI details." });
            }
        }

        // ===========================
        // Bank Details
        // ===========================

        /// <summary>
        /// Get bank details for a staff member
        /// </summary>
        [HttpGet("{id}/bank")]
        [Authorize(Roles = "Admin,Principal,HRManager,Finance,FinanceOfficer")]
        public async Task<ActionResult<BankDetailsDto>> GetBankDetails(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var details = await _staffService.GetBankDetailsAsync(id, schoolId);
                return Ok(details);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching bank details." });
            }
        }

        /// <summary>
        /// Update bank details for a staff member
        /// </summary>
        [HttpPut("{id}/bank")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<BankDetailsDto>> UpdateBankDetails(Guid id, [FromBody] UpdateBankDetailsDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var details = await _staffService.UpdateBankDetailsAsync(schoolId, id, dto);
                return Ok(details);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating bank details." });
            }
        }

        // ===========================
        // Document Management
        // ===========================

        /// <summary>
        /// Get all documents for a staff member
        /// </summary>
        [HttpGet("{id}/documents")]
        [Authorize(Roles = "Admin,Principal,HRManager,Staff")]
        public async Task<ActionResult<List<StaffDocumentDto>>> GetDocuments(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var documents = await _staffService.GetStaffDocumentsAsync(id, schoolId);
                return Ok(documents);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching documents." });
            }
        }

        // ===========================
        // Performance Management
        // ===========================

        /// <summary>
        /// Get all performance reviews for a staff member
        /// </summary>
        [HttpGet("{id}/performance-reviews")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<List<PerformanceReviewDto>>> GetPerformanceReviews(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var reviews = await _staffService.GetPerformanceReviewsAsync(id, schoolId);
                return Ok(reviews);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching performance reviews." });
            }
        }

        /// <summary>
        /// Add a new performance review for a staff member
        /// </summary>
        [HttpPost("{id}/performance-reviews")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<PerformanceReviewDto>> AddPerformanceReview(Guid id, [FromBody] CreatePerformanceReviewDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
                var review = await _staffService.AddPerformanceReviewAsync(schoolId, id, dto, userId);
                return CreatedAtAction(nameof(GetPerformanceReviews), new { id }, review);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while adding performance review." });
            }
        }

        // ===========================
        // Leave Balance
        // ===========================

        /// <summary>
        /// Get leave balance for a staff member
        /// </summary>
        [HttpGet("{id}/leave-balance")]
        [Authorize(Roles = "Admin,Principal,HRManager,Staff")]
        public async Task<ActionResult<LeaveBalanceDto>> GetLeaveBalance(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var balance = await _staffService.GetStaffLeaveBalanceAsync(id, schoolId);
                return Ok(balance);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching leave balance." });
            }
        }

        /// <summary>
        /// Update leave balance for a staff member
        /// </summary>
        [HttpPut("{id}/leave-balance")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<LeaveBalanceDto>> UpdateLeaveBalance(Guid id, [FromBody] UpdateLeaveBalanceDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var balance = await _staffService.UpdateLeaveBalanceAsync(schoolId, id, dto);
                return Ok(balance);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while updating leave balance." });
            }
        }

        /// <summary>
        /// Get all active staff (for class teacher / subject teacher dropdowns).
        /// Returns all active staff regardless of designation — works the same for all schools.
        /// </summary>
        [HttpGet("teaching")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<StaffListResponse>> GetTeachingStaff()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.GetStaffMembersAsync(schoolId, 1, 500, null, "active");
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred while fetching staff." }); }
        }

        /// <summary>Bulk import staff from a JSON array of CreateStaffRequest records (max 500).</summary>
        [HttpPost("bulk-import")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<BulkOperationResult>> BulkImport([FromBody] List<CreateStaffRequest> requests)
        {
            try
            {
                if (requests == null || requests.Count == 0)
                    return BadRequest(new { message = "No records provided." });
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.BulkImportStaffAsync(schoolId, requests);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred during bulk import.", error = ex.Message }); }
        }

        /// <summary>Bulk import staff from a CSV file upload (max 500 rows).</summary>
        [HttpPost("bulk-import/csv")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult<BulkOperationResult>> BulkImportCsv(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });
                if (file.Length > 5 * 1024 * 1024)
                    return BadRequest(new { message = "File size exceeds 5MB limit." });
                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "Only .csv files are supported." });

                using var reader = new System.IO.StreamReader(file.OpenReadStream(), System.Text.Encoding.UTF8);
                var csv = await reader.ReadToEndAsync();
                var (requests, parseErrors) = ParseStaffCsv(csv);

                if (requests.Count == 0)
                    return BadRequest(new { message = "CSV has no valid data rows.", errors = parseErrors });

                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _staffService.BulkImportStaffAsync(schoolId, requests);

                if (parseErrors.Count > 0)
                {
                    result.Errors.AddRange(parseErrors);
                    result.FailureCount += parseErrors.Count;
                }

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred during CSV import.", error = ex.Message }); }
        }

        private static (List<CreateStaffRequest> Requests, List<string> Errors) ParseStaffCsv(string csv)
        {
            var requests = new List<CreateStaffRequest>();
            var errors = new List<string>();

            var lines = csv
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .ToList();

            if (lines.Count < 2)
                return (requests, new List<string> { "CSV must contain a header row and at least one data row." });

            for (int i = 1; i < lines.Count; i++)
            {
                var cols = SplitCsvLine(lines[i]);
                var rowNumber = i + 1;

                if (cols.Count < 11)
                {
                    errors.Add($"Row {rowNumber}: Expected at least 11 columns.");
                    continue;
                }

                if (!DateTime.TryParse(cols[4].Trim(), out var dob))
                {
                    errors.Add($"Row {rowNumber}: Invalid DateOfBirth '{cols[4]}'.");
                    continue;
                }

                if (!DateTime.TryParse(cols[10].Trim(), out var joiningDate))
                {
                    errors.Add($"Row {rowNumber}: Invalid JoiningDate '{cols[10]}'.");
                    continue;
                }

                int experience = 0;
                if (cols.Count > 11 && !string.IsNullOrWhiteSpace(cols[11]) && !int.TryParse(cols[11].Trim(), out experience))
                {
                    errors.Add($"Row {rowNumber}: Invalid Experience '{cols[11]}'.");
                    continue;
                }

                decimal salary = 0;
                if (cols.Count > 15 && !string.IsNullOrWhiteSpace(cols[15]) && !decimal.TryParse(cols[15].Trim(), out salary))
                {
                    errors.Add($"Row {rowNumber}: Invalid Salary '{cols[15]}'.");
                    continue;
                }

                requests.Add(new CreateStaffRequest
                {
                    EmployeeId = cols[0].Trim(),
                    FirstName = cols[1].Trim(),
                    LastName = cols[2].Trim(),
                    Gender = cols[3].Trim(),
                    DateOfBirth = dob,
                    Email = cols[5].Trim(),
                    Phone = cols[6].Trim(),
                    Department = cols[7].Trim(),
                    Designation = cols[8].Trim(),
                    EmploymentType = cols[9].Trim(),
                    JoiningDate = joiningDate,
                    Experience = experience,
                    Qualification = cols.Count > 12 ? cols[12].Trim() : null,
                    Address = cols.Count > 16 ? cols[16].Trim() : string.Empty,
                    City = cols.Count > 17 ? cols[17].Trim() : null,
                    State = cols.Count > 18 ? cols[18].Trim() : null,
                    Pincode = cols.Count > 19 ? cols[19].Trim() : null,
                    AadharNumber = cols.Count > 20 ? cols[20].Trim() : null,
                    PanNumber = cols.Count > 21 ? cols[21].Trim() : null,
                    BankName = cols.Count > 22 ? cols[22].Trim() : null,
                    BankAccountNumber = cols.Count > 23 ? cols[23].Trim() : null,
                    IfscCode = cols.Count > 24 ? cols[24].Trim() : null,
                    PfNumber = cols.Count > 25 ? cols[25].Trim() : null,
                    EsiNumber = cols.Count > 26 ? cols[26].Trim() : null,
                    UanNumber = cols.Count > 27 ? cols[27].Trim() : null,
                    EmergencyContactName = cols.Count > 28 ? cols[28].Trim() : null,
                    EmergencyContactPhone = cols.Count > 29 ? cols[29].Trim() : null,
                    EmergencyContactRelationship = cols.Count > 30 ? cols[30].Trim() : null,
                    Status = cols.Count > 14 ? cols[14].Trim() : "active",
                    Salary = salary
                });
            }

            return (requests, errors);
        }

        private static List<string> SplitCsvLine(string line)
        {
            var result = new List<string>();
            if (string.IsNullOrEmpty(line))
                return result;

            var sb = new System.Text.StringBuilder();
            var inQuotes = false;

            for (var i = 0; i < line.Length; i++)
            {
                var c = line[i];

                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(sb.ToString());
                    sb.Clear();
                }
                else
                {
                    sb.Append(c);
                }
            }

            result.Add(sb.ToString());
            return result;
        }

        /// <summary>Download a blank CSV template for bulk staff import.</summary>
        [HttpGet("bulk-import/template")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public IActionResult GetImportTemplate()
        {
            var csv = StaffService.GetImportTemplate();
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", "staff_import_template.csv");
        }

        /// <summary>Export all staff as CSV (optional department/status/designation filters).</summary>
        [HttpGet("export")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<IActionResult> ExportStaff(
            [FromQuery] string? department = null,
            [FromQuery] string? status = null,
            [FromQuery] string? designation = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var bytes = await _staffService.ExportStaffToCsvAsync(schoolId, department, status, designation);
                return File(bytes, "text/csv", $"staff_export_{DateTime.UtcNow:yyyyMMdd}.csv");
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred during export.", error = ex.Message }); }
        }

        /// <summary>
        /// Reset the login password for a staff member (Admin/Principal only).
        /// Links via the staff member's email to the UserLogin table.
        /// </summary>
        [HttpPost("{id}/reset-password")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> ResetStaffPassword(Guid id, [FromBody] ResetStaffPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
                    return BadRequest(new { message = "Password must be at least 8 characters." });

                var schoolId = _tenant.GetEffectiveSchoolId();
                var staff = await _staffService.GetStaffByIdAsync(id, schoolId);
                if (staff == null)
                    return NotFound(new { message = "Staff member not found." });

                // Find UserLogin by email
                var userLogin = await _dbContext.UserLogins
                    .FirstOrDefaultAsync(u => u.Email == staff.Email && u.SchoolId == schoolId && !u.IsDeleted);

                if (userLogin == null)
                    return NotFound(new { message = "No login account found for this staff member." });

                userLogin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
                userLogin.PasswordChangedAt = DateTime.UtcNow;
                userLogin.RefreshTokenHash = null; // Invalidate all sessions
                userLogin.FailedLoginAttempts = 0;
                userLogin.LockedUntil = null;
                userLogin.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return Ok(new { message = "Password reset successfully." });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while resetting password.", error = ex.Message }); }
        }

        // ── Staff Children (students whose parent is this staff member) ──────

        /// <summary>
        /// Returns students who have this staff member as their guardian/parent.
        /// Used to display "Children in School" in the staff profile.
        /// </summary>
        [HttpGet("{id:guid}/children")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetChildren(Guid id)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                // Verify staff exists
                var staffExists = await _dbContext.StaffMembers
                    .AnyAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (!staffExists) return NotFound(new { message = "Staff member not found." });

                var children = await _dbContext.Students
                    .Where(s => s.SchoolId == schoolId && s.GuardianStaffId == id && !s.IsDeleted)
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

                return Ok(children);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching children.", error = ex.Message });
            }
        }
    }
}

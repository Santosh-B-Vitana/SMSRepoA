using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Models.Constants;
using SmsApi.Services;
using SmsApi.Services.Migration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly ITenantContext _tenant;
        private readonly IParentAuthorizationService _parentAuth;

        public StudentsController(IStudentService studentService, ITenantContext tenant, IParentAuthorizationService parentAuth)
        {
            _studentService = studentService;
            _tenant = tenant;
            _parentAuth = parentAuth;
        }

        /// <summary>
        /// Get all students for the authenticated user's school. Respects X-Academic-Year header for year-scoped filtering.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<StudentListResponse>> GetStudents(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? classFilter = null,
            [FromQuery] string? sectionFilter = null,
            [FromQuery] string? status = null,
            [FromQuery] string? academicYear = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortOrder = null)
        {
            // Clamp pagination to safe bounds
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 2000);
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Resolve effective academic year from header or query param
                var headerYear = HttpContext.Items["AcademicYearHeaderValue"] as string;
                var effectiveYear = !string.IsNullOrWhiteSpace(academicYear) ? academicYear : headerYear;
                var result = await _studentService.GetStudentsAsync(schoolId, page, pageSize, search, classFilter, sectionFilter, status, effectiveYear, sortBy, sortOrder);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching students.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific student by ID
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult<StudentResponse>> GetStudent(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var student = await _studentService.GetStudentByIdAsync(id, schoolId);
                
                if (student == null)
                {
                    return NotFound(new { message = "Student not found." });
                }

                // Enforce data isolation: Parent/Student may only view their own linked record
                var role = _tenant.Role ?? string.Empty;
                if (role.Equals("Student", StringComparison.OrdinalIgnoreCase))
                {
                    // Student's email must match the student record
                    var callerEmail = _tenant.UserEmail;
                    if (!string.Equals(student.Email, callerEmail, StringComparison.OrdinalIgnoreCase))
                        return Forbid("Students can only access their own profile.");
                }
                else if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                {
                    // Parent must be listed as a guardian on the student record
                    var callerEmail = _tenant.UserEmail;
                    var guardians = await _studentService.GetGuardiansAsync(id, schoolId);
                    var isGuardian = guardians.Any(g =>
                        !string.IsNullOrEmpty(g.Email) &&
                        string.Equals(g.Email, callerEmail, StringComparison.OrdinalIgnoreCase));
                    if (!isGuardian)
                        return Forbid("Parents can only access their own child's profile.");
                }

                return Ok(student);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching the student.", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new student (Admin/Principal only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentResponse>> CreateStudent([FromBody] CreateStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                
                var student = await _studentService.CreateStudentAsync(request);
                return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, student);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while creating the student.", error = ex.Message });
            }
        }

        /// <summary>
        /// Update student (Admin/Principal only)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentResponse>> UpdateStudent(
            Guid id, 
            [FromBody] UpdateStudentRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var student = await _studentService.UpdateStudentAsync(id, schoolId, request);
                
                if (student == null)
                {
                    return NotFound(new { message = "Student not found." });
                }

                return Ok(student);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while updating the student.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student statistics (Admin/Principal only)
        /// </summary>
        [HttpGet("stats")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentStatsResponse>> GetStudentStats()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var stats = await _studentService.GetStudentStatsAsync(schoolId);
                return Ok(stats);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching student statistics.", error = ex.Message });
            }
        }

        /// <summary>
        /// Upload student photo (Admin/Principal/Staff only)
        /// </summary>
        [HttpPost("{id}/photo")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult> UploadPhoto(Guid id, IFormFile file, [FromServices] IFileValidationService fileValidationService)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                var (isValid, error) = await fileValidationService.ValidateAsync(file);
                if (!isValid)
                    return BadRequest(new { message = error });

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileData = memoryStream.ToArray();

                var photoUrl = await _studentService.UploadPhotoAsync(id, schoolId, file.FileName, fileData);
                return Ok(new { photoUrl });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while uploading the photo.", error = ex.Message });
            }
        }

        /// <summary>
        /// Upload student document (Admin/Principal/Staff only)
        /// </summary>
        [HttpPost("{id}/documents")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult<StudentDocumentDto>> UploadDocument(
            Guid id, 
            [FromForm] string documentType, 
            IFormFile file,
            [FromServices] IFileValidationService fileValidationService)
        {
            // Validate document type against allowed values
            var allowedDocumentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "birth_certificate", "aadhar", "passport", "transfer_certificate",
                "marksheet", "medical_certificate", "caste_certificate",
                "income_certificate", "address_proof", "photo", "other"
            };
            if (string.IsNullOrWhiteSpace(documentType) || !allowedDocumentTypes.Contains(documentType))
                return BadRequest(new { message = $"Invalid document type. Allowed: {string.Join(", ", allowedDocumentTypes)}" });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                var (isValid, error) = await fileValidationService.ValidateAsync(file);
                if (!isValid)
                    return BadRequest(new { message = error });

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileData = memoryStream.ToArray();

                var document = await _studentService.UploadDocumentAsync(id, schoolId, documentType, file.FileName, fileData);
                return CreatedAtAction(nameof(GetDocuments), new { id }, document);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while uploading the document.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get student documents (Staff and above)
        /// </summary>
        [HttpGet("{id}/documents")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult<List<StudentDocumentDto>>> GetDocuments(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Enforce data isolation for Parent/Student roles
                var role = _tenant.Role ?? string.Empty;
                if (role.Equals("Student", StringComparison.OrdinalIgnoreCase) ||
                    role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                {
                    var student = await _studentService.GetStudentByIdAsync(id, schoolId);
                    if (student == null) return NotFound(new { message = "Student not found." });

                    var callerEmail = _tenant.UserEmail;
                    if (role.Equals("Student", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(student.Email, callerEmail, StringComparison.OrdinalIgnoreCase))
                        return Forbid("Students can only access their own documents.");

                    if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                    {
                        var guardians = await _studentService.GetGuardiansAsync(id, schoolId);
                        if (!guardians.Any(g => string.Equals(g.Email, callerEmail, StringComparison.OrdinalIgnoreCase)))
                            return Forbid("Parents can only access their own child's documents.");
                    }
                }

                var documents = await _studentService.GetDocumentsAsync(id, schoolId);
                return Ok(documents);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching documents.", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete student document (Admin/Principal only)
        /// </summary>
        [HttpDelete("documents/{documentId}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult> DeleteDocument(Guid documentId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.DeleteDocumentAsync(documentId, schoolId);
                
                if (!result)
                {
                    return NotFound(new { message = "Document not found." });
                }

                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while deleting the document.", error = ex.Message });
            }
        }

        [HttpPost("bulk-promote")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<BulkOperationResult>> BulkPromote([FromBody] BulkPromoteRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Year now optional in BulkPromoteRequest - controllers accept year from header/query for future use
                var result = await _studentService.BulkPromoteStudentsAsync(schoolId, request);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while promoting students.", error = ex.Message });
            }
        }

        [HttpPost("bulk-update")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<BulkOperationResult>> BulkUpdate([FromBody] BulkUpdateRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.BulkUpdateStudentsAsync(schoolId, request);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while updating students.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult> DeleteStudent(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.DeleteStudentAsync(id, schoolId);
                
                if (!result)
                {
                    return NotFound(new { message = "Student not found." });
                }

                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while deleting the student.", error = ex.Message });
            }
        }

        // ===========================
        // Guardian Management
        // ===========================

        /// <summary>
        /// Get all guardians for a student
        /// </summary>
        [HttpGet("{id}/guardians")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<List<GuardianDto>>> GetGuardians(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var guardians = await _studentService.GetGuardiansAsync(id, schoolId);
                return Ok(guardians);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching guardians.", error = ex.Message });
            }
        }

        /// <summary>
        /// Add a new guardian for a student
        /// </summary>
        [HttpPost("{id}/guardians")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult<GuardianDto>> AddGuardian(Guid id, [FromBody] CreateGuardianDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                // Get userId from claims (you might need to adjust this based on your auth setup)
                var userId = _tenant.UserId;
                
                var guardian = await _studentService.AddGuardianAsync(schoolId, id, dto, userId);
                return CreatedAtAction(nameof(GetGuardians), new { id, schoolId }, guardian);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while adding guardian.", error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing guardian
        /// </summary>
        [HttpPut("guardians/{guardianId}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult<GuardianDto>> UpdateGuardian(Guid guardianId, [FromBody] UpdateGuardianDto dto)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var guardian = await _studentService.UpdateGuardianAsync(schoolId, guardianId, dto);
                return Ok(guardian);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while updating guardian.", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete a guardian
        /// </summary>
        [HttpDelete("guardians/{guardianId}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult> DeleteGuardian(Guid guardianId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.DeleteGuardianAsync(schoolId, guardianId);
                
                if (!result)
                {
                    return NotFound(new { message = "Guardian not found." });
                }

                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while deleting guardian.", error = ex.Message });
            }
        }

        // ===========================
        // Advanced Filtering
        // ===========================

        /// <summary>
        /// Get students by transport requirement
        /// </summary>
        [HttpGet("transport")]
        [Authorize(Roles = "Admin,Principal,Bursar")]
        public async Task<ActionResult<StudentListResponse>> GetByTransport(
            [FromQuery] bool required,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.GetStudentsByTransportAsync(schoolId, required, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching students.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get students by hostel requirement
        /// </summary>
        [HttpGet("hostel")]
        [Authorize(Roles = "Admin,Principal,Bursar")]
        public async Task<ActionResult<StudentListResponse>> GetByHostel(
            [FromQuery] bool required,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.GetStudentsByHostelAsync(schoolId, required, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching students.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get students by category (General, OBC, SC, ST, EWS)
        /// </summary>
        [HttpGet("category/{category}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult<StudentListResponse>> GetByCategory(
            string category,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.GetStudentsByCategoryAsync(schoolId, category, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching students.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get siblings of a student (legacy JSON-based lookup)
        /// </summary>
        [HttpGet("{id}/siblings-legacy")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<List<StudentBasicResponse>>> GetSiblingsLegacy(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var siblings = await _studentService.GetStudentSiblingsAsync(schoolId, id);
                return Ok(siblings);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while fetching siblings.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get children linked to the currently logged-in parent (matched by guardian email).
        /// </summary>
        [HttpGet("my-children")]
        [Authorize(Roles = "Parent")]
        public async Task<ActionResult<List<StudentBasicResponse>>> GetMyChildren()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var email = _tenant.UserEmail;
                if (string.IsNullOrEmpty(email))
                    return BadRequest(new { message = "Parent email not found in token." });
                var children = await _studentService.GetMyChildrenAsync(schoolId, email);
                return Ok(children);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching children.", error = ex.Message });
            }
        }

        /// <summary>
        /// Get aggregated cross-module profile summary for a student
        /// (fees, attendance, exams, transport, hostel, health, visitor history)
        /// </summary>
        [HttpGet("{id}/profile-summary")]
        [Authorize(Roles = StatusConstants.RoleGroups.StudentView)]
        public async Task<ActionResult<StudentProfileSummary>> GetProfileSummary(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                // Parent role: verify the student is their linked child (direct guardian or sibling)
                var role = _tenant.Role ?? string.Empty;
                if (role.Equals("Parent", StringComparison.OrdinalIgnoreCase))
                {
                    var parentEmail = _tenant.UserEmail ?? string.Empty;
                    var canAccess = await _parentAuth.CanAccessStudentAsync(schoolId, parentEmail, id);
                    if (!canAccess)
                        return StatusCode(403, new { message = "Parents can only access their own child's profile." });
                }
                var summary = await _studentService.GetStudentProfileSummaryAsync(id, schoolId);
                if (summary == null)
                    return NotFound(new { message = "Student not found." });
                return Ok(summary);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the student profile summary.", error = ex.Message });
            }
        }

        // ===========================
        // Student Promotion
        // ===========================

        /// <summary>
        /// Promote a single student to next class/section
        /// </summary>
        [HttpPut("{id}/promote")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentResponse>> PromoteStudent(
            Guid id,
            [FromBody] PromoteStudentRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.PromoteStudentAsync(id, schoolId, request);
                
                if (result == null)
                {
                    return NotFound(new { message = "Student not found" });
                }

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while promoting the student.", error = ex.Message });
            }
        }

        // ===========================
        // Bulk Operations
        // ===========================

        /// <summary>
        /// Bulk import students via JSON array (max 500 per batch).
        /// Validates all fields server-side; returns per-row errors.
        /// </summary>
        [HttpPost("bulk-import")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<BulkOperationResult>> BulkImport(
            [FromBody] List<CreateStudentRequest> students)
        {
            if (students == null || students.Count == 0)
                return BadRequest(new { message = "No student records provided." });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = _tenant.UserId;
                var result = await _studentService.BulkImportStudentsAsync(schoolId, students, userId);
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred during bulk import.", error = ex.Message });
            }
        }

        /// <summary>
        /// Bulk import students from a CSV file upload.
        /// The CSV must use the same column headers as the template.
        /// Max 500 rows per file.
        /// </summary>
        [HttpPost("bulk-import/csv")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<BulkOperationResult>> BulkImportCsv(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No CSV file uploaded." });

            var ext = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".csv")
                return BadRequest(new { message = "Only .csv files are supported. Use the template from GET /api/students/bulk-import/template" });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId = _tenant.UserId;

                // Parse CSV into CreateStudentRequest list
                List<CreateStudentRequest> requests;
                using var reader = new System.IO.StreamReader(file.OpenReadStream(), System.Text.Encoding.UTF8);
                requests = ParseStudentCsv(reader);

                if (requests.Count == 0)
                    return BadRequest(new { message = "CSV file has no data rows (only header found)." });

                var result = await _studentService.BulkImportStudentsAsync(schoolId, requests, userId);
                return Ok(result);
            }
            catch (FormatException ex)
            {
                return BadRequest(new { message = $"CSV parse error: {ex.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during CSV import.", error = ex.Message });
            }
        }

        /// <summary>
        /// Download a blank CSV import template with all supported columns and one example row.
        /// </summary>
        [HttpGet("bulk-import/template")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public IActionResult DownloadImportTemplate()
        {
            var bytes = StudentService.GetImportTemplate();
            return File(bytes, "text/csv", "students_import_template.csv");
        }

        /// <summary>
        /// Export all students (or filtered subset) as a CSV file.
        /// Supports classFilter, status, and academicYear query params.
        /// PII fields (Aadhar/PAN) are masked in the export.
        /// </summary>
        [HttpGet("export")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> ExportStudents(
            [FromQuery] string? classFilter = null,
            [FromQuery] string? status = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var headerYear = HttpContext.Items["AcademicYearHeaderValue"] as string;
                var effectiveYear = !string.IsNullOrWhiteSpace(academicYear) ? academicYear : headerYear;
                var csvBytes = await _studentService.ExportStudentsToCsvAsync(schoolId, classFilter, status, effectiveYear);
                var fileName = $"students_export_{DateTime.UtcNow:yyyyMMdd_HHmm}.csv";
                return File(csvBytes, "text/csv", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during export.", error = ex.Message });
            }
        }

        // ── CSV parsing helper ─────────────────────────────────────────────

        // ────────────────────────────────────────────────────────────────────
        // V1 → V2 MIGRATION  (POST /api/Students/migrate-v1)
        // ────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Accepts a batch of v1 (SQL Server / .NET Framework 4.x) student records
        /// exported as JSON and migrates them into the v2 database for the current school.
        ///
        /// All students are imported via the existing BulkImport pipeline (duplicate detection,
        /// validation, audit). Guardians and Transfer Certificates included in the batch are
        /// written after the main import succeeds so referential integrity is preserved.
        ///
        /// Batch limit: 500 students per request. Use multiple requests for larger datasets.
        /// </summary>
        [HttpPost("migrate-v1")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<MigrationResult>> MigrateFromV1(
            [FromBody] V1MigrationBatch batch,
            [FromServices] V1MigrationService migrationService)
        {
            if (batch?.Students == null || batch.Students.Count == 0)
                return BadRequest(new { message = "No student records provided in the migration batch." });

            if (batch.Students.Count > 500)
                return BadRequest(new { message = "Maximum 500 students per migration batch. Split into multiple requests." });

            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userId   = _tenant.UserId;
                var result   = await migrationService.MigrateStudentsAsync(schoolId, userId, batch);

                if (!result.IsFullSuccess && result.SuccessCount == 0)
                    return UnprocessableEntity(result);

                return result.IsFullSuccess ? Ok(result) : StatusCode(207, result); // 207 = partial success
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Migration failed.", error = ex.Message });
            }
        }

        private static List<CreateStudentRequest> ParseStudentCsv(System.IO.StreamReader reader)
        {
            var requests = new List<CreateStudentRequest>();
            var headerLine = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(headerLine))
                return requests;

            var headers = SplitCsvLine(headerLine)
                .Select((h, i) => (h.Trim().ToLowerInvariant(), i))
                .ToDictionary(x => x.Item1, x => x.i);

            int GetIdx(string name) => headers.TryGetValue(name.ToLowerInvariant(), out var i) ? i : -1;

            string? GetCol(string[] cols, string name)
            {
                var idx = GetIdx(name);
                return idx >= 0 && idx < cols.Length ? cols[idx].Trim() : null;
            }

            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var cols = SplitCsvLine(line);

                DateTime ParseDate(string? v, string field)
                {
                    if (string.IsNullOrWhiteSpace(v)) return default;
                    if (DateTime.TryParse(v, out var d)) return d;
                    throw new FormatException($"Cannot parse date '{v}' in column '{field}'. Use yyyy-MM-dd format.");
                }

                var req = new CreateStudentRequest
                {
                    AdmissionNumber   = GetCol(cols, "admissionnumber") ?? string.Empty,
                    Name              = GetCol(cols, "name") ?? string.Empty,
                    FirstName         = GetCol(cols, "firstname"),
                    MiddleName        = GetCol(cols, "middlename"),
                    LastName          = GetCol(cols, "lastname"),
                    Class             = GetCol(cols, "class") ?? string.Empty,
                    Section           = GetCol(cols, "section") ?? string.Empty,
                    RollNumber        = GetCol(cols, "rollnumber"),
                    DateOfBirth       = ParseDate(GetCol(cols, "dateofbirth"), "DateOfBirth"),
                    Gender            = GetCol(cols, "gender"),
                    Nationality       = GetCol(cols, "nationality"),
                    Religion          = GetCol(cols, "religion"),
                    Caste             = GetCol(cols, "caste"),
                    Category          = GetCol(cols, "category") ?? "General",
                    MotherTongue      = GetCol(cols, "mothertongue"),
                    AdmissionDate     = ParseDate(GetCol(cols, "admissiondate"), "AdmissionDate") is DateTime ad && ad != default ? ad : DateTime.UtcNow,
                    Status            = GetCol(cols, "status") ?? "active",
                    Email             = GetCol(cols, "email"),
                    PrimaryPhone      = GetCol(cols, "primaryphone"),
                    SecondaryPhone    = GetCol(cols, "secondaryphone"),
                    Address           = GetCol(cols, "address") ?? string.Empty,
                    PermanentAddress  = GetCol(cols, "permanentaddress"),
                    BloodGroup        = GetCol(cols, "bloodgroup"),
                    AadharNumber      = GetCol(cols, "aadharnumber"),
                    PanNumber         = GetCol(cols, "pannumber"),
                    PassportNumber    = GetCol(cols, "passportnumber"),
                    GuardianName      = GetCol(cols, "guardianname") ?? string.Empty,
                    GuardianPhone     = GetCol(cols, "guardianphone") ?? string.Empty,
                    EmergencyContact  = GetCol(cols, "emergencycontact"),
                    EmergencyPhone    = GetCol(cols, "emergencyphone"),
                    DoctorName        = GetCol(cols, "doctorname"),
                    DoctorPhone       = GetCol(cols, "doctorphone"),
                    Allergies         = GetCol(cols, "allergies"),
                    ChronicConditions = GetCol(cols, "chronicconditions"),
                    Medications       = GetCol(cols, "medications"),
                    SpecialNeeds      = GetCol(cols, "specialneeds"),
                    TransportRequired = string.Equals(GetCol(cols, "transportrequired"), "true", StringComparison.OrdinalIgnoreCase),
                    HostelRequired    = string.Equals(GetCol(cols, "hostelrequired"), "true", StringComparison.OrdinalIgnoreCase),
                    PreviousSchool    = GetCol(cols, "previousschool"),
                    PreviousClass     = GetCol(cols, "previousclass"),
                    PhotoUrl          = GetCol(cols, "photourl"),
                };
                requests.Add(req);
            }
            return requests;
        }

        private static string[] SplitCsvLine(string line)
        {
            var result = new List<string>();
            var sb = new System.Text.StringBuilder();
            bool inQuotes = false;
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else inQuotes = !inQuotes;
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(sb.ToString());
                    sb.Clear();
                }
                else sb.Append(c);
            }
            result.Add(sb.ToString());
            return result.ToArray();
        }

        // ── Sibling Management ───────────────────────────────────────────────

        [HttpGet("{studentId:guid}/siblings")]
        [Authorize(Roles = "Admin,Principal,Staff,Parent")]
        public async Task<IActionResult> GetSiblings(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var siblings = await _studentService.GetSiblingsAsync(schoolId, studentId);
            return Ok(siblings);
        }

        [HttpPost("{studentId:guid}/siblings")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> AddSibling(Guid studentId, [FromBody] AddSiblingRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _studentService.AddSiblingAsync(schoolId, studentId, request.SiblingStudentId);
            return Ok(new { message = "Sibling linked successfully." });
        }

        [HttpDelete("{studentId:guid}/siblings/{siblingId:guid}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> RemoveSibling(Guid studentId, Guid siblingId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _studentService.RemoveSiblingAsync(schoolId, studentId, siblingId);
            return Ok(new { message = "Sibling link removed." });
        }

        // ── Annual Health Records ─────────────────────────────────────────────

        [HttpGet("{studentId:guid}/annual-health")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetAnnualHealthRecords(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var records = await _studentService.GetAnnualHealthRecordsAsync(schoolId, studentId);
            return Ok(records);
        }

        [HttpPut("{studentId:guid}/annual-health")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> UpsertAnnualHealth(Guid studentId, [FromBody] UpsertAnnualHealthRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var result = await _studentService.UpsertAnnualHealthAsync(schoolId, studentId, request);
            return Ok(result);
        }

        // ── Hobby / Club Management ───────────────────────────────────────────

        [HttpGet("hobbies")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetHobbies()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var hobbies = await _studentService.GetHobbiesAsync(schoolId);
            return Ok(hobbies);
        }

        [HttpPost("hobbies")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> CreateHobby([FromBody] CreateHobbyRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var hobby = await _studentService.CreateHobbyAsync(schoolId, request);
            return CreatedAtAction(nameof(GetHobbies), hobby);
        }

        [HttpGet("{studentId:guid}/hobbies")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetStudentHobbies(Guid studentId, [FromQuery] string? academicYear)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var hobbies = await _studentService.GetStudentHobbiesAsync(schoolId, studentId, academicYear);
            return Ok(hobbies);
        }

        [HttpPost("{studentId:guid}/hobbies")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> EnrollHobby(Guid studentId, [FromBody] EnrollHobbyRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var enrollment = await _studentService.EnrollHobbyAsync(schoolId, studentId, request);
            return CreatedAtAction(nameof(GetStudentHobbies), new { studentId }, enrollment);
        }

        [HttpPost("{studentId:guid}/hobbies/bulk")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> BulkEnrollHobbies(Guid studentId, [FromBody] BulkEnrollHobbiesRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _studentService.BulkEnrollHobbiesAsync(schoolId, studentId, request);
            return Ok(new { message = "Hobbies enrolled successfully." });
        }

        [HttpDelete("{studentId:guid}/hobbies/{enrollmentId:guid}")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> RemoveHobbyEnrollment(Guid studentId, Guid enrollmentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _studentService.RemoveHobbyEnrollmentAsync(schoolId, enrollmentId);
            return Ok(new { message = "Hobby enrollment removed." });
        }

        // ── Permission Slips ──────────────────────────────────────────────────

        [HttpGet("{studentId:guid}/permission-slips")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetPermissionSlips(Guid studentId, [FromQuery] string? academicYear)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var slips = await _studentService.GetPermissionSlipsAsync(schoolId, studentId, academicYear);
            return Ok(slips);
        }

        /// <summary>All permission slips for a given date — for the daily gate register.</summary>
        [HttpGet("permission-slips")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetAllPermissionSlips(
            [FromQuery] DateTime? date,
            [FromQuery] string? academicYear)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var targetDate = date ?? DateTime.UtcNow.Date;
            var slips = await _studentService.GetAllPermissionSlipsAsync(schoolId, targetDate, academicYear);
            return Ok(slips);
        }

        [HttpPost("{studentId:guid}/permission-slips")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> CreatePermissionSlip(Guid studentId, [FromBody] CreatePermissionSlipRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var userId = GetCurrentUserId();
            var slip = await _studentService.CreatePermissionSlipAsync(schoolId, studentId, request, userId);
            return CreatedAtAction(nameof(GetPermissionSlips), new { studentId }, slip);
        }

        [HttpPut("permission-slips/{slipId:guid}/review")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> ReviewPermissionSlip(Guid slipId, [FromBody] ReviewPermissionSlipRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var userId = GetCurrentUserId();
            var slip = await _studentService.ReviewPermissionSlipAsync(schoolId, slipId, request, userId);
            return Ok(slip);
        }

        // ── Transfer Certificate ──────────────────────────────────────────────

        [HttpGet("{studentId:guid}/transfer-certificate")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetTransferCertificate(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var tc = await _studentService.GetTransferCertificateAsync(schoolId, studentId);
            if (tc == null) return NotFound(new { message = "No Transfer Certificate found for this student." });
            return Ok(tc);
        }

        [HttpPost("{studentId:guid}/transfer-certificate")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> CreateTransferCertificate(Guid studentId, [FromBody] CreateTransferCertificateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var userId = GetCurrentUserId();
            var tc = await _studentService.CreateTransferCertificateAsync(schoolId, studentId, request, userId);
            return CreatedAtAction(nameof(GetTransferCertificate), new { studentId }, tc);
        }

        [HttpPost("{studentId:guid}/transfer-certificate/issue")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> IssueTC(Guid studentId, [FromBody] IssueTCRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var userId = GetCurrentUserId();
            var tc = await _studentService.IssueTCAsync(schoolId, studentId, request, userId);
            return Ok(tc);
        }

        // ── Document Verification ─────────────────────────────────────────────

        [HttpPost("documents/{documentId:guid}/verify")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> VerifyDocument(Guid documentId, [FromBody] VerifyDocumentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            var userId = GetCurrentUserId();
            var doc = await _studentService.VerifyDocumentAsync(schoolId, documentId, request, userId);
            return Ok(doc);
        }

        // ── Roll Number Assignment ─────────────────────────────────────────────

        [HttpGet("roll-assignment")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetStudentsForRollAssignment(
            [FromQuery] string className,
            [FromQuery] string section)
        {
            if (string.IsNullOrWhiteSpace(className) || string.IsNullOrWhiteSpace(section))
                return BadRequest(new { message = "class and section query params are required." });
            var schoolId = _tenant.GetEffectiveSchoolId();
            var students = await _studentService.GetStudentsForRollAssignmentAsync(schoolId, className, section);
            return Ok(students);
        }

        [HttpPost("roll-assignment")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> BulkAssignRollNumbers([FromBody] RollNumberAssignmentRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var schoolId = _tenant.GetEffectiveSchoolId();
            await _studentService.BulkAssignRollNumbersAsync(schoolId, request);
            return Ok(new { message = "Roll numbers assigned successfully." });
        }

        // ── Guardian Staff Link ───────────────────────────────────────────────

        /// <summary>
        /// Get the staff member who is the guardian/parent of this student (if linked).
        /// </summary>
        [HttpGet("{studentId:guid}/guardian-staff")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<IActionResult> GetGuardianStaff(Guid studentId)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                var student = await _studentService.GetStudentByIdAsync(schoolId, studentId);
                if (student == null) return NotFound(new { message = "Student not found." });
                if (student.GuardianStaffId == null)
                    return Ok(null);
                var staff = await _studentService.GetGuardianStaffAsync(schoolId, student.GuardianStaffId.Value);
                return Ok(staff);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching guardian staff.", error = ex.Message });
            }
        }

        /// <summary>
        /// Link or unlink a staff member as the guardian/parent of this student.
        /// Pass null staffId to unlink.
        /// </summary>
        [HttpPut("{studentId:guid}/guardian-staff")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<IActionResult> SetGuardianStaff(Guid studentId, [FromBody] SetGuardianStaffRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            try
            {
                await _studentService.SetGuardianStaffAsync(schoolId, studentId, request.StaffId);
                return Ok(new { message = request.StaffId.HasValue ? "Guardian staff linked." : "Guardian staff unlinked." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Error updating guardian staff.", error = ex.Message }); }
        }

        // ── Helper ────────────────────────────────────────────────────────────
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId")?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(userIdClaim, out var id) ? id : Guid.Empty;
        }

        // =================================================================
        // STUDENT EXIT — Exit Clearance, Drop-Out, Pass-Out
        // =================================================================

        /// <summary>
        /// Returns pending fee dues and pre-populated exit document data
        /// for a student.  Called before showing the dropout/passout dialog.
        /// </summary>
        [HttpGet("{id}/exit-clearance")]
        [Authorize(Roles = "Admin,Principal,Staff")]
        public async Task<ActionResult<ExitClearanceResponse>> GetExitClearance(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _studentService.GetExitClearanceAsync(id, schoolId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Error fetching exit clearance.", error = ex.Message }); }
        }

        /// <summary>
        /// Processes a student drop-out.
        /// - "transfer"  → marks student inactive, creates TC + alumni record.
        /// - "detain"    → records detention remark; student stays active.
        /// </summary>
        [HttpPost("{id}/dropout")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentExitResponse>> DropoutStudent(
            Guid id, [FromBody] StudentDropoutRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId    = _tenant.GetEffectiveSchoolId();
                var processedBy = GetCurrentUserId();
                var result = await _studentService.ProcessDropoutAsync(id, schoolId, request, processedBy);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Error processing dropout.", error = ex.Message }); }
        }

        /// <summary>
        /// Processes a student pass-out (successful completion / leaving after passing).
        /// Marks student inactive, creates TC + alumni record.
        /// </summary>
        [HttpPost("{id}/passout")]
        [Authorize(Roles = "Admin,Principal")]
        public async Task<ActionResult<StudentExitResponse>> PassoutStudent(
            Guid id, [FromBody] StudentPassoutRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var schoolId    = _tenant.GetEffectiveSchoolId();
                var processedBy = GetCurrentUserId();
                var result = await _studentService.ProcessPassoutAsync(id, schoolId, request, processedBy);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Error processing pass-out.", error = ex.Message }); }
        }
    }
}

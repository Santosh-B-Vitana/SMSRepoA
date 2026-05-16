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
using System.Collections.Generic;

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
        private readonly IAcademicsService _academicsService;

        public StaffController(IStaffService staffService, ITenantContext tenant, AppDbContext dbContext, IAcademicsService academicsService)
        {
            _staffService = staffService;
            _tenant = tenant;
            _dbContext = dbContext;
            _academicsService = academicsService;
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

        /// <summary>
        /// Deactivate a staff member: optionally reassign or remove their class/section assignments,
        /// then mark their account and login as inactive.
        /// </summary>
        [HttpPost("{id}/deactivate")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> DeactivateStaff(Guid id, [FromBody] DeactivateStaffRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();

                var staff = await _dbContext.StaffMembers
                    .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (staff == null)
                    return NotFound(new { message = "Staff member not found." });

                // Process assignment actions (reassign / remove)
                var assignmentErrors = new List<string>();
                if (request.Assignments != null)
                {
                    foreach (var item in request.Assignments)
                    {
                        // Load the existing assignment to capture class/section/subject details
                        var oldAssignment = await _dbContext.TeacherAssignments
                            .AsNoTracking()
                            .FirstOrDefaultAsync(ta => ta.Id == item.AssignmentId && ta.SchoolId == schoolId);
                        if (oldAssignment == null)
                        {
                            assignmentErrors.Add($"Assignment {item.AssignmentId} not found — skipped.");
                            continue;
                        }

                        if (item.Action == "reassign" && item.NewStaffId.HasValue)
                        {
                            // Validate replacement staff
                            var newStaff = await _dbContext.StaffMembers
                                .FirstOrDefaultAsync(s => s.Id == item.NewStaffId.Value && s.SchoolId == schoolId && !s.IsDeleted);
                            if (newStaff == null) { assignmentErrors.Add($"Replacement staff not found for assignment {item.AssignmentId}."); continue; }
                            if (newStaff.Status?.ToLower() == "inactive" || newStaff.Status?.ToLower() == "terminated")
                            { assignmentErrors.Add($"Replacement staff '{newStaff.FirstName} {newStaff.LastName}' is {newStaff.Status} and cannot be assigned."); continue; }

                            // Step 1 — Remove the old assignment (also revokes role for departing staff)
                            await _academicsService.RemoveTeacherAssignmentAsync(item.AssignmentId, schoolId);

                            // Step 2 — Create the same assignment for the replacement (grants role + "My Classes" for new staff)
                            try
                            {
                                await _academicsService.AssignTeacherAsync(new SmsApi.Models.DTOs.AssignTeacherRequest
                                {
                                    SchoolId = schoolId,
                                    StaffId = item.NewStaffId.Value,
                                    ClassId = oldAssignment.ClassId,
                                    SectionId = oldAssignment.SectionId,
                                    SubjectId = oldAssignment.SubjectId,
                                    IsClassTeacher = oldAssignment.IsClassTeacher,
                                    AcademicYear = oldAssignment.AcademicYear,
                                    Status = "active"
                                });
                            }
                            catch (InvalidOperationException)
                            {
                                // Replacement already has this assignment — treat as success (idempotent)
                            }
                        }
                        else
                        {
                            // Remove only — unties from class/section, no replacement now
                            await _academicsService.RemoveTeacherAssignmentAsync(item.AssignmentId, schoolId);
                        }
                    }

                }

                // Mark staff as inactive (proceed even if some assignment lookups failed)
                staff.Status = "inactive";
                staff.UpdatedAt = DateTime.UtcNow;

                // Clear ClassSubjects.TeacherId where this staff is assigned as subject teacher
                var classSubjectsToUnassign = await _dbContext.ClassSubjects
                    .Where(cs => cs.SchoolId == schoolId && cs.TeacherId == id)
                    .ToListAsync();
                foreach (var cs in classSubjectsToUnassign)
                {
                    cs.TeacherId = null;
                    cs.UpdatedAt = DateTime.UtcNow;
                }

                // Revoke UserLogin — primary lookup by LinkedEntityId (most reliable), email fallback
                var linkedLogin = await _dbContext.UserLogins
                    .FirstOrDefaultAsync(u =>
                        u.SchoolId == schoolId &&
                        u.LinkedEntityId == id &&
                        u.LinkedEntityType == "staff" &&
                        !u.IsDeleted);

                if (linkedLogin == null && !string.IsNullOrEmpty(staff.Email))
                {
                    linkedLogin = await _dbContext.UserLogins
                        .FirstOrDefaultAsync(u =>
                            u.SchoolId == schoolId &&
                            u.Email.ToLower() == staff.Email.Trim().ToLower() &&
                            !u.IsDeleted);
                }

                if (linkedLogin != null)
                {
                    linkedLogin.Status = "inactive";
                    linkedLogin.RefreshTokenHash = null;
                    linkedLogin.RefreshTokenExpiry = null;
                    linkedLogin.UpdatedAt = DateTime.UtcNow;
                }
                // No UserLogin to revoke — staff may not have a portal account yet

                await _dbContext.SaveChangesAsync();

                var warnings = (request.Assignments != null && assignmentErrors.Count > 0) ? assignmentErrors : null;
                return Ok(new { message = $"{staff.FirstName} {staff.LastName} has been deactivated and their login access revoked.", warnings });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while deactivating the staff member.", error = ex.Message }); }
        }

        /// <summary>
        /// Reactivate a staff member: restore their account and login.
        /// </summary>
        [HttpPost("{id}/reactivate")]
        [Authorize(Roles = "Admin,Principal,HRManager")]
        public async Task<ActionResult> ReactivateStaff(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var staff = await _dbContext.StaffMembers
                    .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId && !s.IsDeleted);
                if (staff == null)
                    return NotFound(new { message = "Staff member not found." });

                staff.Status = "active";
                staff.UpdatedAt = DateTime.UtcNow;

                var linkedLogin = await _dbContext.UserLogins
                    .FirstOrDefaultAsync(u =>
                        u.SchoolId == schoolId &&
                        u.LinkedEntityId == id &&
                        u.LinkedEntityType == "staff" &&
                        !u.IsDeleted);

                if (linkedLogin == null && !string.IsNullOrEmpty(staff.Email))
                {
                    linkedLogin = await _dbContext.UserLogins
                        .FirstOrDefaultAsync(u =>
                            u.SchoolId == schoolId &&
                            u.Email.ToLower() == staff.Email.Trim().ToLower() &&
                            !u.IsDeleted);
                }

                if (linkedLogin != null)
                {
                    linkedLogin.Status = "active";
                    linkedLogin.UpdatedAt = DateTime.UtcNow;
                }

                await _dbContext.SaveChangesAsync();
                return Ok(new { message = $"{staff.FirstName} {staff.LastName} has been reactivated." });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = "An error occurred while reactivating the staff member.", error = ex.Message }); }
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
            var errors   = new List<string>();

            var allLines = csv
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.None)
                .ToList();

            // Find the first non-empty line as header
            int headerIdx = allLines.FindIndex(l => !string.IsNullOrWhiteSpace(l));
            if (headerIdx < 0)
                return (requests, new List<string> { "The CSV file is empty." });

            var headerCols = SplitCsvLine(allLines[headerIdx]);
            if (headerCols.Count == 0)
                return (requests, new List<string> { "Could not read column headers from the first row." });

            // canonical name → column index
            var headers = headerCols
                .Select((h, i) => (canon: CanonCol(h), idx: i))
                .GroupBy(x => x.canon)
                .ToDictionary(g => g.Key, g => g.First().idx);

            // Column aliases for staff fields
            var staffAliases = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["employeeid"]    = new[] { "empid", "emp_id", "staffid", "staff_id", "employeecode" },
                ["firstname"]     = new[] { "fname", "givenname" },
                ["lastname"]      = new[] { "lname", "surname", "familyname" },
                ["dateofbirth"]   = new[] { "dob", "birthdate" },
                ["joiningdate"]   = new[] { "joindate", "startdate", "dateofjoining", "hiredate" },
                ["employmenttype"]= new[] { "emptype", "jobtype", "employment_type", "contracttype" },
                ["primaryphone"]  = new[] { "phone", "mobile", "mobileno", "contact", "phoneno" },
                ["aadharnumber"]  = new[] { "aadhar", "aadhaar", "uid" },
                ["pannumber"]     = new[] { "pan", "panno" },
                ["qualification"] = new[] { "education", "degree", "educationqualification" },
                ["experience"]    = new[] { "exp", "yearsofexperience", "workexperience" },
            };

            int GetIdx(string name)
            {
                var canon = CanonCol(name);
                if (headers.TryGetValue(canon, out var i)) return i;
                if (staffAliases.TryGetValue(canon, out var aliases))
                    foreach (var a in aliases)
                        if (headers.TryGetValue(CanonCol(a), out i)) return i;
                return -1;
            }

            string? GetCol(List<string> cols, string name)
            {
                var idx = GetIdx(name);
                if (idx < 0 || idx >= cols.Count) return null;
                var v = cols[idx].Trim();
                return v.Length == 0 ? null : v;
            }

            // Flexible date parser (same as student)
            DateTime? ParseFlexDate(string? raw)
            {
                if (string.IsNullOrWhiteSpace(raw)) return null;
                raw = raw.Trim();
                string[] fmts = {
                    "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy", "MM-dd-yyyy",
                    "d/M/yyyy",   "M/d/yyyy",   "d-M-yyyy",   "M-d-yyyy",
                    "yyyy/MM/dd", "dd MMM yyyy","d MMM yyyy", "dd-MMM-yyyy",
                    "d MMM yy",   "dd/MM/yy"
                };
                if (DateTime.TryParseExact(raw, fmts, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out var d)) return d;
                if (DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out d)) return d;
                return null;
            }

            // Normalise gender
            string? NormalizeGender(string? raw) =>
                raw?.Trim().ToLower() switch
                {
                    "m" or "male" or "gents" or "boy"             => "male",
                    "f" or "female" or "ladies" or "lady" or "girl" => "female",
                    "other" or "others"                            => "other",
                    "prefer_not_to_say" or "na" or "n/a"
                        or "prefer not to say" or "not specified"  => "prefer_not_to_say",
                    _ => raw?.Trim()
                };

            // Normalise employment type
            string? NormalizeEmpType(string? raw) =>
                raw?.Trim().ToLower() switch
                {
                    "permanent" or "full time" or "fulltime" or "full_time" or "regular" => "permanent",
                    "contract" or "contractual" or "temp" or "temporary"                 => "contract",
                    "part_time" or "part time" or "parttime"                             => "part_time",
                    "probation" or "probationary" or "on probation"                      => "probation",
                    "intern" or "internship" or "trainee" or "apprentice"               => "intern",
                    "consultant" or "consulting" or "freelance" or "visiting"           => "consultant",
                    _ => raw?.Trim()
                };

            // Normalise staff status
            string NormalizeStatus(string? raw) =>
                raw?.Trim().ToLower() switch
                {
                    "active" or "enabled" or "working"             => "active",
                    "inactive" or "disabled"                        => "inactive",
                    "on_leave" or "on leave" or "leave"             => "on_leave",
                    "terminated" or "dismissed" or "fired"         => "terminated",
                    "probation" or "probationary"                  => "probation",
                    _ => "active"
                };

            // Clean Aadhar: strip all non-digit characters, leave as 12 digits
            string? CleanAadhar(string? raw)
            {
                if (string.IsNullOrWhiteSpace(raw)) return null;
                var digits = System.Text.RegularExpressions.Regex.Replace(raw.Trim(), @"[^\d]", "");
                return digits.Length == 12 ? digits : raw.Trim();
            }

            string? CleanPan(string? raw) =>
                string.IsNullOrWhiteSpace(raw) ? null : raw.Trim().ToUpperInvariant();

            int dataRow = 0;
            for (int i = headerIdx + 1; i < allLines.Count; i++)
            {
                var line = allLines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;
                var cols = SplitCsvLine(line);
                if (cols.All(c => string.IsNullOrWhiteSpace(c))) continue;
                dataRow++;
                var rowLabel = $"Row {dataRow}";

                // Try to resolve a DOB — give a clear message if unparseable
                var dobRaw  = GetCol(cols, "dateofbirth");
                var dob     = ParseFlexDate(dobRaw);
                if (dobRaw != null && dob == null)
                {
                    errors.Add($"[{rowLabel}] DateOfBirth '{dobRaw}' is not a recognisable date. Use DD/MM/YYYY or YYYY-MM-DD (e.g. 15/08/1990).");
                    continue;
                }

                var joinRaw  = GetCol(cols, "joiningdate");
                var joinDate = ParseFlexDate(joinRaw);
                if (joinRaw != null && joinDate == null)
                {
                    errors.Add($"[{rowLabel}] JoiningDate '{joinRaw}' is not a recognisable date. Use DD/MM/YYYY or YYYY-MM-DD.");
                    continue;
                }

                // Experience and Salary: ignore if blank, warn if non-numeric
                int experience = 0;
                var expRaw = GetCol(cols, "experience");
                if (expRaw != null && !int.TryParse(expRaw, out experience))
                    errors.Add($"[{rowLabel}] Experience '{expRaw}' is not a whole number — defaulting to 0.");

                decimal? salary = null;
                var salaryRaw = GetCol(cols, "salary");
                if (salaryRaw != null)
                {
                    if (decimal.TryParse(salaryRaw, System.Globalization.NumberStyles.Any,
                            System.Globalization.CultureInfo.InvariantCulture, out var sal))
                        salary = sal;
                    else
                        errors.Add($"[{rowLabel}] Salary '{salaryRaw}' is not a valid number — leaving blank.");
                }

                requests.Add(new CreateStaffRequest
                {
                    EmployeeId              = GetCol(cols, "employeeid"),
                    FirstName               = GetCol(cols, "firstname") ?? string.Empty,
                    LastName                = GetCol(cols, "lastname")  ?? string.Empty,
                    Gender                  = NormalizeGender(GetCol(cols, "gender")),
                    DateOfBirth             = dob ?? default,
                    Email                   = GetCol(cols, "email"),
                    Phone                   = GetCol(cols, "primaryphone") ?? GetCol(cols, "phone") ?? string.Empty,
                    Department              = GetCol(cols, "department") ?? string.Empty,
                    Designation             = GetCol(cols, "designation") ?? string.Empty,
                    EmploymentType          = NormalizeEmpType(GetCol(cols, "employmenttype")) ?? "permanent",
                    JoiningDate             = joinDate ?? DateTime.UtcNow,
                    Experience              = experience,
                    Qualification           = GetCol(cols, "qualification"),
                    Specialization          = GetCol(cols, "specialization"),
                    Status                  = NormalizeStatus(GetCol(cols, "status")),
                    Salary                  = salary,
                    Address                 = GetCol(cols, "address") ?? string.Empty,
                    City                    = GetCol(cols, "city"),
                    State                   = GetCol(cols, "state"),
                    Pincode                 = GetCol(cols, "pincode"),
                    AadharNumber            = CleanAadhar(GetCol(cols, "aadharnumber")),
                    PanNumber               = CleanPan(GetCol(cols, "pannumber")),
                    BankName                = GetCol(cols, "bankname"),
                    BankAccountNumber       = GetCol(cols, "bankaccountnumber"),
                    IfscCode                = GetCol(cols, "ifsccode"),
                    PfNumber                = GetCol(cols, "pfnumber"),
                    EsiNumber               = GetCol(cols, "esinumber"),
                    UanNumber               = GetCol(cols, "uannumber"),
                    EmergencyContactName    = GetCol(cols, "emergencycontactname"),
                    EmergencyContactPhone   = GetCol(cols, "emergencycontactphone"),
                    EmergencyContactRelationship = GetCol(cols, "emergencycontactrelationship"),
                });
            }

            if (requests.Count == 0 && errors.Count == 0)
                errors.Add("The CSV file contained no data rows (only the header was found).");

            return (requests, errors);
        }

        // Strip spaces, underscores and hyphens then lowercase — same as student controller.
        private static string CanonCol(string raw) =>
            System.Text.RegularExpressions.Regex.Replace(raw.Trim().ToLowerInvariant(), @"[\s_\-]", "");

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

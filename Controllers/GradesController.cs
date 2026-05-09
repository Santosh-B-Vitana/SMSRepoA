using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GradesController : ControllerBase
    {
        private readonly IGradeService _gradeService;
        private readonly ITenantContext _tenant;
        private readonly AppDbContext _context;

        public GradesController(IGradeService gradeService, ITenantContext tenant, AppDbContext context)
        {
            _gradeService = gradeService;
            _tenant = tenant;
            _context = context;
        }

        private Guid GetSchoolId() => _tenant.GetEffectiveSchoolId();
        private Guid? GetUserId()
        {
            var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(val, out var id) ? id : null;
        }

        // â”€â”€â”€ GRADE CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        [HttpGet("categories")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeCategoryListResponse), 200)]
        public async Task<IActionResult> GetCategories([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _gradeService.GetCategoriesAsync(GetSchoolId(), page, pageSize);
            return Ok(result);
        }

        [HttpGet("categories/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeCategoryResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            var category = await _gradeService.GetCategoryByIdAsync(id, GetSchoolId());
            return category == null ? NotFound() : Ok(category);
        }

        [HttpPost("categories")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(GradeCategoryResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> CreateCategory([FromBody] CreateGradeCategoryRequest request)
        {
            try
            {
                var category = await _gradeService.CreateCategoryAsync(GetSchoolId(), request);
                return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, category);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpPut("categories/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(GradeCategoryResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CreateGradeCategoryRequest request)
        {
            try
            {
                var category = await _gradeService.UpdateCategoryAsync(id, GetSchoolId(), request);
                return category == null ? NotFound() : Ok(category);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpDelete("categories/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            try
            {
                var result = await _gradeService.DeleteCategoryAsync(id, GetSchoolId());
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        // â”€â”€â”€ GRADE ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        [HttpGet("items")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeItemListResponse), 200)]
        public async Task<IActionResult> GetGradeItems(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? subjectId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _gradeService.GetGradeItemsAsync(GetSchoolId(), classId, subjectId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("items/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeItemResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetGradeItemById(Guid id)
        {
            var item = await _gradeService.GetGradeItemByIdAsync(id, GetSchoolId());
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost("items")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeItemResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> CreateGradeItem([FromBody] CreateGradeItemRequest request)
        {
            try
            {
                request.SchoolId = GetSchoolId();
                var item = await _gradeService.CreateGradeItemAsync(request);
                return CreatedAtAction(nameof(GetGradeItemById), new { id = item.Id }, item);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpPut("items/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(GradeItemResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateGradeItem(Guid id, [FromBody] UpdateGradeItemRequest request)
        {
            try
            {
                var item = await _gradeService.UpdateGradeItemAsync(id, GetSchoolId(), request);
                return item == null ? NotFound() : Ok(item);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpDelete("items/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteGradeItem(Guid id)
        {
            try
            {
                var result = await _gradeService.DeleteGradeItemAsync(id, GetSchoolId());
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        // â”€â”€â”€ STUDENT GRADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        [HttpGet("my-child-grades")]
        [Authorize(Roles = "Parent")]
        [ProducesResponseType(typeof(StudentGradeListResponse), 200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetMyChildGrades(
            [FromQuery] Guid studentId,
            [FromQuery] Guid? gradeItemId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            var parentEmail = _tenant.UserEmail;

            if (string.IsNullOrEmpty(parentEmail))
                return Unauthorized(new { message = "Parent email not found in token." });

            var isLinked = await _context.StudentGuardians
                .AnyAsync(g => g.StudentId == studentId
                            && g.SchoolId == schoolId
                            && !g.IsDeleted
                            && g.Email != null
                            && g.Email.ToLower() == parentEmail.ToLower());

            if (!isLinked)
                return StatusCode(403, new { message = "Parents can only access their own child's grades." });

            var result = await _gradeService.GetStudentGradesAsync(schoolId, gradeItemId, studentId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("student-grades")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(StudentGradeListResponse), 200)]
        public async Task<IActionResult> GetStudentGrades(
            [FromQuery] Guid? gradeItemId = null,
            [FromQuery] Guid? studentId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _gradeService.GetStudentGradesAsync(GetSchoolId(), gradeItemId, studentId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("student-grades/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(StudentGradeResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetStudentGradeById(Guid id)
        {
            var grade = await _gradeService.GetStudentGradeByIdAsync(id, GetSchoolId());
            return grade == null ? NotFound() : Ok(grade);
        }

        [HttpPost("student-grades")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(StudentGradeResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> CreateStudentGrade([FromBody] CreateStudentGradeRequest request)
        {
            try
            {
                request.EnteredById = GetUserId();
                var grade = await _gradeService.CreateStudentGradeAsync(GetSchoolId(), request);
                return CreatedAtAction(nameof(GetStudentGradeById), new { id = grade.Id }, grade);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpPut("student-grades/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(StudentGradeResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateStudentGrade(Guid id, [FromBody] UpdateStudentGradeRequest request)
        {
            try
            {
                var grade = await _gradeService.UpdateStudentGradeAsync(id, GetSchoolId(), request);
                return grade == null ? NotFound() : Ok(grade);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpDelete("student-grades/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteStudentGrade(Guid id)
        {
            try
            {
                var result = await _gradeService.DeleteStudentGradeAsync(id, GetSchoolId());
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpPost("student-grades/bulk")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(BulkCreateStudentGradeResult), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> BulkCreateStudentGrades([FromBody] BulkCreateStudentGradeRequest request)
        {
            try
            {
                var result = await _gradeService.BulkCreateStudentGradesAsync(GetSchoolId(), request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        // â”€â”€â”€ CCE ASSESSMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        [HttpGet("cce")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CCEAssessmentListResponse), 200)]
        public async Task<IActionResult> GetCCEAssessments(
            [FromQuery] Guid? studentId = null,
            [FromQuery] string? academicYear = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _gradeService.GetCCEAssessmentsAsync(GetSchoolId(), studentId, academicYear, page, pageSize);
            return Ok(result);
        }

        [HttpGet("cce/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CCEAssessmentResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetCCEAssessmentById(Guid id)
        {
            var assessment = await _gradeService.GetCCEAssessmentByIdAsync(id, GetSchoolId());
            return assessment == null ? NotFound() : Ok(assessment);
        }

        [HttpPost("cce")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(CCEAssessmentResponse), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> CreateCCEAssessment([FromBody] CreateCCEAssessmentRequest request)
        {
            try
            {
                var assessment = await _gradeService.CreateCCEAssessmentAsync(GetSchoolId(), request);
                return CreatedAtAction(nameof(GetCCEAssessmentById), new { id = assessment.Id }, assessment);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpPut("cce/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(typeof(CCEAssessmentResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateCCEAssessment(Guid id, [FromBody] UpdateCCEAssessmentRequest request)
        {
            try
            {
                var assessment = await _gradeService.UpdateCCEAssessmentAsync(id, GetSchoolId(), request);
                return assessment == null ? NotFound() : Ok(assessment);
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        [HttpDelete("cce/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteCCEAssessment(Guid id)
        {
            try
            {
                var result = await _gradeService.DeleteCCEAssessmentAsync(id, GetSchoolId());
                return result ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }

        // â”€â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        [HttpGet("stats")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        [ProducesResponseType(typeof(GradeStatsResponse), 200)]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var result = await _gradeService.GetStatsAsync(GetSchoolId());
                return Ok(result);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "An unexpected error occurred.", detail = ex.Message }); }
        }
    }
}

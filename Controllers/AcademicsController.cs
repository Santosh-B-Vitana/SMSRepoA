using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmsApi.Models.DTOs;
using SmsApi.Services;
using System;
using System.Threading.Tasks;

namespace SmsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AcademicsController : ControllerBase
    {
        private readonly IAcademicsService _academicsService;
        private readonly ITenantContext _tenant;

        public AcademicsController(IAcademicsService academicsService, ITenantContext tenant)
        {
            _academicsService = academicsService;
            _tenant = tenant;
        }

        // Classes Endpoints
        [HttpGet("classes")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<ClassListResponse>> GetClasses(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetClassesAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("classes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<ClassResponse>> GetClassById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var classEntity = await _academicsService.GetClassByIdAsync(id, schoolId);
                if (classEntity == null) { return NotFound(); }
                return Ok(classEntity);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("classes")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ClassResponse>> CreateClass([FromBody] CreateClassRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var classEntity = await _academicsService.CreateClassAsync(request);
                return CreatedAtAction(nameof(GetClassById), new { id = classEntity.Id }, classEntity);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("classes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ClassResponse>> UpdateClass(Guid id, [FromBody] CreateClassRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var classEntity = await _academicsService.UpdateClassAsync(id, schoolId, request);
                if (classEntity == null) { return NotFound(); }
                return Ok(classEntity);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("classes/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteClass(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteClassAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Sections Endpoints
        [HttpGet("sections")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<SectionListResponse>> GetSections(
            [FromQuery] Guid? classId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetSectionsAsync(schoolId, classId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("sections/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<SectionResponse>> GetSectionById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var section = await _academicsService.GetSectionByIdAsync(id, schoolId);
                if (section == null) { return NotFound(); }
                return Ok(section);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("sections")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<SectionResponse>> CreateSection([FromBody] CreateSectionRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var section = await _academicsService.CreateSectionAsync(request);
                return CreatedAtAction(nameof(GetSectionById), new { id = section.Id }, section);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("sections/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<SectionResponse>> UpdateSection(Guid id, [FromBody] CreateSectionRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var section = await _academicsService.UpdateSectionAsync(id, schoolId, request);
                if (section == null) { return NotFound(); }
                return Ok(section);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("sections/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteSection(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteSectionAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Subjects Endpoints
        [HttpGet("subjects")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<SubjectListResponse>> GetSubjects(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetSubjectsAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("subjects/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<SubjectResponse>> GetSubjectById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var subject = await _academicsService.GetSubjectByIdAsync(id, schoolId);
                if (subject == null) { return NotFound(); }
                return Ok(subject);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("subjects")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<SubjectResponse>> CreateSubject([FromBody] CreateSubjectRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var subject = await _academicsService.CreateSubjectAsync(request);
                return CreatedAtAction(nameof(GetSubjectById), new { id = subject.Id }, subject);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("subjects/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<SubjectResponse>> UpdateSubject(Guid id, [FromBody] CreateSubjectRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var subject = await _academicsService.UpdateSubjectAsync(id, schoolId, request);
                if (subject == null) { return NotFound(); }
                return Ok(subject);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("subjects/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteSubject(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteSubjectAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Class Subjects Endpoints
        [HttpGet("classes/{classId}/subjects")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult> GetClassSubjects(Guid classId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var subjects = await _academicsService.GetClassSubjectsAsync(classId, schoolId);
                return Ok(subjects);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("class-subjects")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ClassSubjectResponse>> AssignSubjectToClass([FromBody] AssignSubjectRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var classSubject = await _academicsService.AssignSubjectToClassAsync(request);
                return Ok(classSubject);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("class-subjects/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> RemoveSubjectFromClass(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.RemoveSubjectFromClassAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Teacher Assignments Endpoints
        [HttpGet("teacher-assignments")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<TeacherAssignmentListResponse>> GetTeacherAssignments(
            [FromQuery] Guid? classId = null,
            [FromQuery] Guid? sectionId = null,
            [FromQuery] Guid? staffId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetTeacherAssignmentsAsync(schoolId, classId, sectionId, staffId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("teacher-assignments")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<TeacherAssignmentResponse>> AssignTeacher([FromBody] AssignTeacherRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var assignment = await _academicsService.AssignTeacherAsync(request);
                return Ok(assignment);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("teacher-assignments/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> RemoveTeacherAssignment(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.RemoveTeacherAssignmentAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // Class Settings Endpoints
        [HttpGet("classes/{classId}/settings")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ClassSettingsResponse>> GetClassSettings(Guid classId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var settings = await _academicsService.GetClassSettingsAsync(classId, schoolId);
                if (settings == null) { return NotFound(); }
                return Ok(settings);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("classes/settings")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ClassSettingsResponse>> CreateClassSettings([FromBody] CreateClassSettingsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var settings = await _academicsService.CreateClassSettingsAsync(request);
                return CreatedAtAction(nameof(GetClassSettings), new { classId = settings.ClassId }, settings);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPut("classes/settings/{settingsId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ClassSettingsResponse>> UpdateClassSettings(Guid settingsId, [FromBody] UpdateClassSettingsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var settings = await _academicsService.UpdateClassSettingsAsync(settingsId, request, schoolId);
                if (settings == null) { return NotFound(); }
                return Ok(settings);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpDelete("classes/settings/{settingsId}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteClassSettings(Guid settingsId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteClassSettingsAsync(settingsId, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // Grade Tiers Endpoints
        [HttpGet("classes/{classId}/grade-tiers")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<GradeTierListResponse>> GetGradeTiers(Guid classId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetGradeTiersAsync(classId, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("grade-tiers")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<GradeTierResponse>> CreateGradeTier([FromBody] CreateGradeTierRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var gradeTier = await _academicsService.CreateGradeTierAsync(request);
                return Ok(gradeTier);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPut("grade-tiers/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<GradeTierResponse>> UpdateGradeTier(Guid id, [FromBody] UpdateGradeTierRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var gradeTier = await _academicsService.UpdateGradeTierAsync(id, request, schoolId);
                if (gradeTier == null) { return NotFound(); }
                return Ok(gradeTier);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpDelete("grade-tiers/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteGradeTier(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteGradeTierAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // Timetable Endpoints
        [HttpGet("sections/{sectionId}/timetable")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<TimetableEntryListResponse>> GetSectionTimetable(Guid sectionId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetSectionTimetableAsync(sectionId, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPost("timetable")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<TimetableEntryResponse>> CreateTimetableEntry([FromBody] CreateTimetableEntryRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                request.SchoolId = schoolId;
                var entry = await _academicsService.CreateTimetableEntryAsync(request);
                return Ok(entry);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpPut("timetable/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<TimetableEntryResponse>> UpdateTimetableEntry(Guid id, [FromBody] UpdateTimetableEntryRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var entry = await _academicsService.UpdateTimetableEntryAsync(id, request, schoolId);
                if (entry == null) { return NotFound(); }
                return Ok(entry);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        [HttpDelete("timetable/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult> DeleteTimetableEntry(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.DeleteTimetableEntryAsync(id, schoolId);
                if (!result) { return NotFound(); }
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // Grouped Classes Endpoint
        [HttpGet("classes/grouped")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<GroupedClassListResponse>> GetGroupedClasses()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetGroupedClassesAsync(schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        /// <summary>
        /// Get class teacher assignments for the currently logged-in staff/teacher.
        /// Returns all classes/sections where this staff is the class teacher.
        /// </summary>
        [HttpGet("my-class-assignments")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<List<MyClassAssignmentDto>>> GetMyClassAssignments()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var userEmail = _tenant.UserEmail ?? string.Empty;
                var result = await _academicsService.GetMyClassTeacherAssignmentsByEmailAsync(userEmail, schoolId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, new { message = ex.Message }); }
        }

        // Academic Years Endpoints
        [HttpGet("academic-years")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AcademicYearListResponse>> GetAcademicYears(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetAcademicYearsAsync(schoolId, page, pageSize);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("academic-years/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllStaff)]
        public async Task<ActionResult<AcademicYearResponse>> GetAcademicYearById(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetAcademicYearByIdAsync(id, schoolId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("academic-years")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<AcademicYearResponse>> CreateAcademicYear([FromBody] CreateAcademicYearRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.CreateAcademicYearAsync(schoolId, request);
                return CreatedAtAction(nameof(GetAcademicYearById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("academic-years/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<AcademicYearResponse>> UpdateAcademicYear(Guid id, [FromBody] CreateAcademicYearRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.UpdateAcademicYearAsync(id, schoolId, request);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPatch("academic-years/{id}/set-current")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<AcademicYearResponse>> SetCurrentAcademicYear(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.SetCurrentAcademicYearAsync(id, schoolId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("academic-years/{id}")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<IActionResult> DeleteAcademicYear(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted = await _academicsService.DeleteAcademicYearAsync(id, schoolId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // ── Exam Types ────────────────────────────────────────────────────────

        [HttpGet("exam-types")]
        public async Task<IActionResult> GetExamTypes()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                return Ok(await _academicsService.GetExamTypesAsync(schoolId));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("exam-types/{id}")]
        public async Task<IActionResult> GetExamType(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetExamTypeByIdAsync(id, schoolId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("exam-types")]
        public async Task<IActionResult> CreateExamType([FromBody] CreateExamTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.CreateExamTypeAsync(schoolId, request);
                return CreatedAtAction(nameof(GetExamType), new { id = result.Id }, result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("exam-types/{id}")]
        public async Task<IActionResult> UpdateExamType(Guid id, [FromBody] CreateExamTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.UpdateExamTypeAsync(id, schoolId, request);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("exam-types/{id}")]
        public async Task<IActionResult> DeleteExamType(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted = await _academicsService.DeleteExamTypeAsync(id, schoolId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // ── Subject Types ─────────────────────────────────────────────────────

        [HttpGet("subject-types")]
        public async Task<IActionResult> GetSubjectTypes()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                return Ok(await _academicsService.GetSubjectTypesAsync(schoolId));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpGet("subject-types/{id}")]
        public async Task<IActionResult> GetSubjectType(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.GetSubjectTypeByIdAsync(id, schoolId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("subject-types")]
        public async Task<IActionResult> CreateSubjectType([FromBody] CreateSubjectTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.CreateSubjectTypeAsync(schoolId, request);
                return CreatedAtAction(nameof(GetSubjectType), new { id = result.Id }, result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPut("subject-types/{id}")]
        public async Task<IActionResult> UpdateSubjectType(Guid id, [FromBody] CreateSubjectTypeRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _academicsService.UpdateSubjectTypeAsync(id, schoolId, request);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("subject-types/{id}")]
        public async Task<IActionResult> DeleteSubjectType(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted = await _academicsService.DeleteSubjectTypeAsync(id, schoolId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        // ── Student Subjects ──────────────────────────────────────────────────

        [HttpGet("students/{studentId}/subjects")]
        public async Task<IActionResult> GetStudentSubjects(Guid studentId, [FromQuery] string? academicYear)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                return Ok(await _academicsService.GetStudentSubjectsAsync(schoolId, studentId, academicYear));
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("students/subjects")]
        public async Task<IActionResult> AssignStudentSubject([FromBody] AssignStudentSubjectRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                return Ok(await _academicsService.AssignStudentSubjectAsync(schoolId, request));
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpPost("students/subjects/bulk")]
        public async Task<IActionResult> BulkAssignStudentSubjects([FromBody] BulkAssignStudentSubjectsRequest request)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                await _academicsService.BulkAssignStudentSubjectsAsync(schoolId, request);
                return Ok(new { message = "Subjects assigned successfully" });
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }

        [HttpDelete("students/subjects/{id}")]
        public async Task<IActionResult> RemoveStudentSubject(Guid id)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var deleted = await _academicsService.RemoveStudentSubjectAsync(id, schoolId);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception) { return StatusCode(500, new { message = "An error occurred." }); }
        }
    }
}

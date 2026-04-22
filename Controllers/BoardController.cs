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
    public class BoardController : ControllerBase
    {
        private readonly IBoardConfigurationService _boardService;
        private readonly ITenantContext _tenant;

        public BoardController(IBoardConfigurationService boardService, ITenantContext tenant)
        {
            _boardService = boardService;
            _tenant = tenant;
        }

        // ── Board Catalogue (public read — any authenticated user) ─────────────

        /// <summary>List all available boards (CBSE, ICSE, State boards, IB, CAIE…).</summary>
        [HttpGet("boards")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<ActionResult<BoardConfigurationListResponse>> GetAllBoards()
        {
            try
            {
                var result = await _boardService.GetAllBoardsAsync();
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>Get a single board by ID.</summary>
        [HttpGet("boards/{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<ActionResult<BoardConfigurationResponse>> GetBoardById(Guid id)
        {
            try
            {
                var board = await _boardService.GetBoardByIdAsync(id);
                if (board == null)
                    return NotFound(new { message = "Board not found." });
                return Ok(board);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>Get a single board by code (e.g. CBSE, ICSE, STATE-KA).</summary>
        [HttpGet("boards/code/{code}")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<ActionResult<BoardConfigurationResponse>> GetBoardByCode(string code)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                    return BadRequest(new { message = "Board code is required." });

                var board = await _boardService.GetBoardByCodeAsync(code);
                if (board == null)
                    return NotFound(new { message = "Board not found." });
                return Ok(board);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>SuperAdmin: Create a new board template.</summary>
        [HttpPost("boards")]
        [Authorize(Roles = StatusConstants.Roles.SuperAdmin)]
        public async Task<ActionResult<BoardConfigurationResponse>> CreateBoard([FromBody] CreateBoardConfigurationRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { message = "Request body cannot be null." });

                var board = await _boardService.CreateBoardAsync(request);
                return CreatedAtAction(nameof(GetBoardById), new { id = board.Id }, board);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        // ── School Board Config ───────────────────────────────────────────────

        /// <summary>Get this school's current board setup (with effective grading scale + exam structure).</summary>
        [HttpGet("config")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllInternal)]
        public async Task<ActionResult<SchoolBoardConfigResponse>> GetSchoolBoardConfig(
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var config = await _boardService.GetSchoolBoardConfigAsync(schoolId, academicYear);
                if (config == null)
                    return NotFound(new { message = "No board configured for this school. Please set a board first." });
                return Ok(config);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>Admin: Select / update the board for this school.</summary>
        [HttpPost("config")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<ActionResult<SchoolBoardConfigResponse>> SetSchoolBoardConfig(
            [FromBody] SetSchoolBoardConfigRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { message = "Request body cannot be null." });

                var schoolId = _tenant.GetEffectiveSchoolId();
                var config = await _boardService.SetSchoolBoardConfigAsync(schoolId, request);
                return Ok(config);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        // ── Grading helpers ───────────────────────────────────────────────────

        /// <summary>Calculate grade for a given percentage using this school's board config.</summary>
        [HttpGet("grade")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal,Teacher")]
        public async Task<ActionResult<BoardAwareGradeResult>> CalculateGrade(
            [FromQuery] decimal percentage,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var result = await _boardService.CalculateGradeAsync(schoolId, percentage, academicYear);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>Get the effective grading scale for this school.</summary>
        [HttpGet("grading-scale")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllInternal)]
        public async Task<ActionResult> GetGradingScale([FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var scale = await _boardService.GetEffectiveGradingScaleAsync(schoolId, academicYear);
                return Ok(scale);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        /// <summary>Get the standard exam structure (Periodic Test / Half-Yearly / Annual etc.) for this school's board.</summary>
        [HttpGet("exam-structure")]
        [Authorize(Roles = StatusConstants.RoleGroups.AllInternal)]
        public async Task<ActionResult> GetExamStructure([FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var structure = await _boardService.GetEffectiveExamStructureAsync(schoolId, academicYear);
                return Ok(structure);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }
    }
}

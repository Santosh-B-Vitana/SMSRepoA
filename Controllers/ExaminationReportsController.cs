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
    public class ExaminationReportsController : ControllerBase
    {
        private readonly IExaminationReportService _reportService;
        private readonly IAcademicYearContextService _yearContextService;
        private readonly ITenantContext _tenant;

        public ExaminationReportsController(
            IExaminationReportService reportService,
            IAcademicYearContextService yearContextService,
            ITenantContext tenant)
        {
            _reportService = reportService;
            _yearContextService = yearContextService;
            _tenant = tenant;
        }

        /// <summary>
        /// Get result summary report across all exams (respects X-Academic-Year header)
        /// Includes pass/fail statistics, grade distribution, and exam summaries
        /// </summary>
        [HttpGet("result-summary")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ReportApiResponse<ResultSummaryReportResponse>>> GetResultSummaryReport(
            [FromQuery] string? fromDate = null,
            [FromQuery] string? toDate = null,
            [FromQuery] string? academicYear = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                
                // Resolve effective academic year from header
                var headerYear = (string?)HttpContext.Items["AcademicYearHeaderValue"] ?? "";
                var effectiveYear = await _yearContextService.GetEffectiveYearAsync(
                    schoolId,
                    string.IsNullOrWhiteSpace(headerYear) ? null : headerYear,
                    academicYear);
                
                var filter = new ExamReportFilterRequest
                {
                    FromDate = string.IsNullOrEmpty(fromDate) ? null : DateTime.Parse(fromDate),
                    ToDate = string.IsNullOrEmpty(toDate) ? null : DateTime.Parse(toDate),
                    AcademicYear = effectiveYear
                };

                var report = await _reportService.GetResultSummaryReportAsync(schoolId, filter);
                return Ok(new ReportApiResponse<ResultSummaryReportResponse>
                {
                    Success = true,
                    Message = "Result summary report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<ResultSummaryReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get detailed exam performance report
        /// Includes question-wise, section-wise, and class-wise performance
        /// </summary>
        [HttpGet("exam-performance/{examId}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ReportApiResponse<ExamPerformanceReportResponse>>> GetExamPerformanceReport(Guid examId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var report = await _reportService.GetExamPerformanceReportAsync(schoolId, examId);
                return Ok(new ReportApiResponse<ExamPerformanceReportResponse>
                {
                    Success = true,
                    Message = "Exam performance report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<ExamPerformanceReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get student-wise marks report for a specific exam
        /// Shows individual marks, grades, and pass/fail status
        /// </summary>
        [HttpGet("student-marks/{examId}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ReportApiResponse<StudentWiseMarksReportResponse>>> GetStudentWiseMarksReport(
            Guid examId,
            [FromQuery] Guid? classId = null)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var report = await _reportService.GetStudentWiseMarksReportAsync(schoolId, examId, classId);
                return Ok(new ReportApiResponse<StudentWiseMarksReportResponse>
                {
                    Success = true,
                    Message = "Student-wise marks report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<StudentWiseMarksReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get class-wise performance analysis and comparison
        /// Shows comparative metrics across all classes
        /// </summary>
        [HttpGet("class-analysis")]
        [Authorize(Roles = StatusConstants.RoleGroups.AdminPrincipal)]
        public async Task<ActionResult<ReportApiResponse<ClassAnalysisReportResponse>>> GetClassAnalysisReport()
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var filter = new ExamReportFilterRequest();
                var report = await _reportService.GetClassAnalysisReportAsync(schoolId, filter);
                return Ok(new ReportApiResponse<ClassAnalysisReportResponse>
                {
                    Success = true,
                    Message = "Class analysis report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<ClassAnalysisReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get grade distribution statistics for a specific exam
        /// Shows how many students got each grade
        /// </summary>
        [HttpGet("grade-distribution/{examId}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ReportApiResponse<GradeDistributionReportResponse>>> GetGradeDistributionReport(Guid examId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var report = await _reportService.GetGradeDistributionReportAsync(schoolId, examId);
                return Ok(new ReportApiResponse<GradeDistributionReportResponse>
                {
                    Success = true,
                    Message = "Grade distribution report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<GradeDistributionReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Get subject-wise performance metrics
        /// Shows performance comparison across all subjects
        /// </summary>
        [HttpGet("subject-performance/{examId}")]
        [Authorize(Roles = "Admin,Principal,Teacher")]
        public async Task<ActionResult<ReportApiResponse<SubjectPerformanceReportResponse>>> GetSubjectPerformanceReport(Guid examId)
        {
            try
            {
                var schoolId = _tenant.GetEffectiveSchoolId();
                var report = await _reportService.GetSubjectPerformanceReportAsync(schoolId, examId);
                return Ok(new ReportApiResponse<SubjectPerformanceReportResponse>
                {
                    Success = true,
                    Message = "Subject performance report generated successfully",
                    Data = report,
                    GeneratedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ReportApiResponse<SubjectPerformanceReportResponse>
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    GeneratedAt = DateTime.UtcNow
                });
            }
        }
    }
}

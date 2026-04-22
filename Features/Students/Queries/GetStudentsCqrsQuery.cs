using FluentValidation;
using MediatR;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Features.Students.Queries
{
    public sealed record GetStudentsCqrsQuery(
        int Page = 1,
        int PageSize = 10,
        string? Search = null,
        string? ClassFilter = null,
        string? SectionFilter = null,
        string? Status = null,
        string? AcademicYear = null,
        string? SortBy = null,
        string? SortOrder = null) : IRequest<StudentListResponse>;

    public sealed class GetStudentsCqrsQueryHandler : IRequestHandler<GetStudentsCqrsQuery, StudentListResponse>
    {
        private readonly IStudentService _studentService;
        private readonly ITenantContext _tenant;

        public GetStudentsCqrsQueryHandler(IStudentService studentService, ITenantContext tenant)
        {
            _studentService = studentService;
            _tenant = tenant;
        }

        public Task<StudentListResponse> Handle(GetStudentsCqrsQuery request, CancellationToken cancellationToken)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            return _studentService.GetStudentsAsync(
                schoolId,
                request.Page,
                request.PageSize,
                request.Search,
                request.ClassFilter,
                request.SectionFilter,
                request.Status,
                request.AcademicYear,
                request.SortBy,
                request.SortOrder);
        }
    }

    public sealed class GetStudentsCqrsQueryValidator : AbstractValidator<GetStudentsCqrsQuery>
    {
        private static readonly HashSet<string> ValidSortFields = new(StringComparer.OrdinalIgnoreCase)
            { "admissionnumber", "name", "class", "status", "dob" };

        public GetStudentsCqrsQueryValidator()
        {
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
            RuleFor(x => x.Search).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Search));
            RuleFor(x => x.ClassFilter).MaximumLength(50).When(x => !string.IsNullOrWhiteSpace(x.ClassFilter));
            RuleFor(x => x.SectionFilter).MaximumLength(20).When(x => !string.IsNullOrWhiteSpace(x.SectionFilter));
            RuleFor(x => x.Status).MaximumLength(20).When(x => !string.IsNullOrWhiteSpace(x.Status));
            RuleFor(x => x.AcademicYear).MaximumLength(30).When(x => !string.IsNullOrWhiteSpace(x.AcademicYear));
            RuleFor(x => x.SortBy)
                .Must(v => string.IsNullOrWhiteSpace(v) || ValidSortFields.Contains(v))
                .WithMessage($"SortBy must be one of: {string.Join(", ", ValidSortFields)}");
            RuleFor(x => x.SortOrder)
                .Must(v => string.IsNullOrWhiteSpace(v) || v.Equals("asc", StringComparison.OrdinalIgnoreCase) || v.Equals("desc", StringComparison.OrdinalIgnoreCase))
                .WithMessage("SortOrder must be 'asc' or 'desc'");
        }
    }
}

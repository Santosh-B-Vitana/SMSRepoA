using FluentValidation;
using MediatR;
using SmsApi.Models.DTOs;
using SmsApi.Services;

namespace SmsApi.Features.Students.Commands
{
    public sealed record CreateStudentCqrsCommand(CreateStudentRequest Request) : IRequest<StudentResponse>;

    public sealed class CreateStudentCqrsCommandHandler : IRequestHandler<CreateStudentCqrsCommand, StudentResponse>
    {
        private readonly IStudentService _studentService;
        private readonly ITenantContext _tenant;

        public CreateStudentCqrsCommandHandler(IStudentService studentService, ITenantContext tenant)
        {
            _studentService = studentService;
            _tenant = tenant;
        }

        public Task<StudentResponse> Handle(CreateStudentCqrsCommand command, CancellationToken cancellationToken)
        {
            if (command.Request == null)
            {
                throw new ValidationException("Student payload is required.");
            }

            var schoolId = _tenant.GetEffectiveSchoolId(command.Request.SchoolId == Guid.Empty ? null : command.Request.SchoolId);
            command.Request.SchoolId = schoolId;
            return _studentService.CreateStudentAsync(command.Request);
        }
    }

    public sealed class CreateStudentCqrsCommandValidator : AbstractValidator<CreateStudentCqrsCommand>
    {
        private static readonly HashSet<string> ValidGenders = new(StringComparer.OrdinalIgnoreCase)
            { "male", "female", "other", "prefer_not_to_say" };
        private static readonly HashSet<string> ValidBloodGroups = new(StringComparer.OrdinalIgnoreCase)
            { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Unknown" };
        private static readonly HashSet<string> ValidCategories = new(StringComparer.OrdinalIgnoreCase)
            { "General", "OBC", "SC", "ST", "EWS", "Minority", "Other" };

        public CreateStudentCqrsCommandValidator()
        {
            RuleFor(x => x.Request).NotNull();

            When(x => x.Request != null, () =>
            {
                RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(200);
                RuleFor(x => x.Request.AdmissionNumber).NotEmpty().MaximumLength(50);
                RuleFor(x => x.Request.Class).NotEmpty().MaximumLength(20);
                RuleFor(x => x.Request.Section).NotEmpty().MaximumLength(10);
                RuleFor(x => x.Request.Address).NotEmpty();
                RuleFor(x => x.Request.GuardianName).NotEmpty().MaximumLength(200);
                RuleFor(x => x.Request.GuardianPhone).NotEmpty().MaximumLength(20);
                RuleFor(x => x.Request.DateOfBirth)
                    .NotEmpty()
                    .LessThan(DateTime.UtcNow.Date.AddDays(1))
                    .WithMessage("Date of birth must be in the past.");
                RuleFor(x => x.Request.AdmissionDate)
                    .LessThanOrEqualTo(DateTime.UtcNow.Date.AddDays(1))
                    .WithMessage("Admission date cannot be in the future.");
                RuleFor(x => x.Request.Email)
                    .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Request.Email));
                RuleFor(x => x.Request.Gender)
                    .Must(g => string.IsNullOrWhiteSpace(g) || ValidGenders.Contains(g))
                    .WithMessage($"Gender must be one of: {string.Join(", ", ValidGenders)}");
                RuleFor(x => x.Request.BloodGroup)
                    .Must(b => string.IsNullOrWhiteSpace(b) || ValidBloodGroups.Contains(b))
                    .WithMessage($"BloodGroup must be one of: {string.Join(", ", ValidBloodGroups)}");
                RuleFor(x => x.Request.Category)
                    .Must(c => string.IsNullOrWhiteSpace(c) || ValidCategories.Contains(c))
                    .WithMessage($"Category must be one of: {string.Join(", ", ValidCategories)}");
                RuleFor(x => x.Request.AadharNumber)
                    .Matches(@"^\d{4}-?\d{4}-?\d{4}$")
                    .When(x => !string.IsNullOrWhiteSpace(x.Request.AadharNumber))
                    .WithMessage("AadharNumber must be 12 digits (optionally hyphenated: XXXX-XXXX-XXXX).");
                RuleFor(x => x.Request.PanNumber)
                    .Matches(@"^[A-Z]{5}[0-9]{4}[A-Z]$")
                    .When(x => !string.IsNullOrWhiteSpace(x.Request.PanNumber))
                    .WithMessage("PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter).");
            });
        }
    }
}

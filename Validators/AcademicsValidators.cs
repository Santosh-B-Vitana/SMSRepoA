using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateClassRequestValidator : AbstractValidator<CreateClassRequest>
{
    public CreateClassRequestValidator()
    {
        RuleFor(x => x.SchoolId)
            .NotEmpty().WithMessage("School ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");

        RuleFor(x => x.Status)
            .Must(s => new[] { "active", "inactive", "archived" }.Contains(s.ToLower()))
            .WithMessage("Status must be: active, inactive, or archived");

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0")
            .LessThanOrEqualTo(200).WithMessage("Capacity cannot exceed 200")
            .When(x => x.Capacity.HasValue);
    }
}

public class CreateSectionRequestValidator : AbstractValidator<CreateSectionRequest>
{
    public CreateSectionRequestValidator()
    {
        RuleFor(x => x.SchoolId)
            .NotEmpty().WithMessage("School ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");

        RuleFor(x => x.ClassId)
            .NotEmpty().WithMessage("Class ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid class must be selected");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Section name is required")
            .MaximumLength(50).WithMessage("Section name cannot exceed 50 characters");

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0")
            .LessThanOrEqualTo(100).WithMessage("Capacity cannot exceed 100")
            .When(x => x.Capacity.HasValue);

        RuleFor(x => x.Status)
            .Must(s => new[] { "active", "inactive" }.Contains(s.ToLower()))
            .WithMessage("Status must be: active or inactive");
    }
}

public class CreateSubjectRequestValidator : AbstractValidator<CreateSubjectRequest>
{
    public CreateSubjectRequestValidator()
    {
        RuleFor(x => x.SchoolId)
            .NotEmpty().WithMessage("School ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Subject name is required")
            .Length(2, 200).WithMessage("Subject name must be between 2 and 200 characters");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Subject code is required")
            .MaximumLength(50).WithMessage("Subject code cannot exceed 50 characters");

        RuleFor(x => x.Type)
            .Must(t => new[] { "core", "elective", "language", "lab", "other" }.Contains(t!.ToLower()))
            .WithMessage("Subject type must be: core, elective, language, lab, or other")
            .When(x => !string.IsNullOrEmpty(x.Type));

        RuleFor(x => x.MaxMarks)
            .InclusiveBetween(0, 100).WithMessage("Max marks must be between 0 and 100")
            .When(x => x.MaxMarks.HasValue);

        RuleFor(x => x.PassMarks)
            .InclusiveBetween(0, 100).WithMessage("Pass marks must be between 0 and 100")
            .LessThanOrEqualTo(x => x.MaxMarks).WithMessage("Pass marks cannot exceed max marks")
            .When(x => x.PassMarks.HasValue && x.MaxMarks.HasValue);

        RuleFor(x => x.Status)
            .Must(s => new[] { "active", "inactive" }.Contains(s.ToLower()))
            .WithMessage("Status must be: active or inactive");
    }
}

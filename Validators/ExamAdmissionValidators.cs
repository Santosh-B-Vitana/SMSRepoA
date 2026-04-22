using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateExamValidator : AbstractValidator<CreateExamDto>
{
    public CreateExamValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Exam name is required")
            .MaximumLength(200);

        RuleFor(x => x.AcademicYear)
            .NotEmpty().WithMessage("Academic year is required")
            .Matches(@"^\d{4}-\d{2}$").WithMessage("Academic year must be in format YYYY-YY (e.g., 2025-26)");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Exam date is required");

        RuleFor(x => x.MaxMarks)
            .GreaterThan(0).WithMessage("Maximum marks must be positive")
            .LessThanOrEqualTo(1000);

        RuleFor(x => x.PassingMarks)
            .GreaterThanOrEqualTo(0)
            .LessThanOrEqualTo(x => x.MaxMarks)
            .WithMessage("Passing marks cannot exceed maximum marks");

        RuleFor(x => x.Duration)
            .InclusiveBetween(1, 600).WithMessage("Duration must be between 1 and 600 minutes")
            .When(x => x.Duration.HasValue);

        RuleFor(x => x.Term)
            .InclusiveBetween(0, 2).WithMessage("Term must be 0 (full year), 1, or 2");
    }
}

public class CreateAdmissionValidator : AbstractValidator<CreateAdmissionDto>
{
    public CreateAdmissionValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .Length(2, 100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .Length(2, 100);

        RuleFor(x => x.DateOfBirth)
            .NotEmpty().WithMessage("Date of birth is required")
            .Must(dob => dob < DateTime.Today.AddYears(-2))
            .WithMessage("Student must be at least 2 years old")
            .Must(dob => dob > DateTime.Today.AddYears(-25))
            .WithMessage("Date of birth seems invalid");

        RuleFor(x => x.Gender)
            .NotEmpty().WithMessage("Gender is required")
            .Must(g => g == "male" || g == "female" || g == "other" ||
                        g == "Male" || g == "Female" || g == "Other")
            .WithMessage("Gender must be male, female, or other");

        RuleFor(x => x.GuardianName)
            .NotEmpty().WithMessage("Guardian name is required")
            .Length(2, 200);

        RuleFor(x => x.GuardianRelation)
            .NotEmpty().WithMessage("Guardian relation is required")
            .MaximumLength(50);

        RuleFor(x => x.GuardianPhone)
            .NotEmpty().WithMessage("Guardian phone is required")
            .Matches(@"^\+?[0-9\-]{10,20}$").WithMessage("Invalid phone number format");

        RuleFor(x => x.GuardianEmail)
            .EmailAddress().WithMessage("Invalid email format")
            .When(x => !string.IsNullOrEmpty(x.GuardianEmail));

        RuleFor(x => x.Category)
            .Must(c => c == "general" || c == "obc" || c == "sc" || c == "st" || c == "ews")
            .WithMessage("Category must be general, obc, sc, st, or ews")
            .When(x => !string.IsNullOrEmpty(x.Category));
    }
}

using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateAssignmentValidator : AbstractValidator<CreateAssignmentRequest>
{
    public CreateAssignmentValidator()
    {
        RuleFor(x => x.ClassId)
            .NotEmpty().WithMessage("Class is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.SubjectId)
            .NotEmpty().WithMessage("Subject is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.AssignedById)
            .NotEmpty().WithMessage("Assigned by staff ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Assignment title is required")
            .Length(3, 500).WithMessage("Title must be between 3 and 500 characters");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required");

        RuleFor(x => x.AssignedDate)
            .NotEmpty().WithMessage("Assigned date is required");

        RuleFor(x => x.DueDate)
            .NotEmpty().WithMessage("Due date is required")
            .GreaterThan(x => x.AssignedDate)
            .WithMessage("Due date must be after assigned date");

        RuleFor(x => x.MaxMarks)
            .GreaterThan(0).WithMessage("Max marks must be positive")
            .LessThanOrEqualTo(1000).WithMessage("Max marks cannot exceed 1000");
    }
}

public class UpdateAssignmentValidator : AbstractValidator<UpdateAssignmentRequest>
{
    public UpdateAssignmentValidator()
    {
        RuleFor(x => x.Title)
            .Length(3, 500).WithMessage("Title must be between 3 and 500 characters")
            .When(x => x.Title != null);

        RuleFor(x => x.MaxMarks)
            .GreaterThan(0).WithMessage("Max marks must be positive")
            .When(x => x.MaxMarks.HasValue);

        RuleFor(x => x.Status)
            .Must(s => s == "active" || s == "inactive" || s == "completed")
            .WithMessage("Status must be 'active', 'inactive', or 'completed'")
            .When(x => x.Status != null);
    }
}

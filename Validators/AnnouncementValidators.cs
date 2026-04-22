using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateAnnouncementValidator : AbstractValidator<CreateAnnouncementRequest>
{
    private static readonly string[] ValidPriorities = { "Low", "Normal", "High", "Urgent" };
    private static readonly string[] ValidAudiences = { "All", "Students", "Staff", "Parents", "Class", "Section" };

    public CreateAnnouncementValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Announcement title is required")
            .Length(3, 200).WithMessage("Title must be between 3 and 200 characters");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Announcement content is required")
            .MaximumLength(10000).WithMessage("Content cannot exceed 10000 characters");

        RuleFor(x => x.CreatedByStaffId)
            .NotEmpty().WithMessage("Creator staff ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.Priority)
            .Must(p => ValidPriorities.Contains(p))
            .WithMessage($"Priority must be one of: {string.Join(", ", ValidPriorities)}");

        RuleFor(x => x.TargetAudience)
            .Must(t => ValidAudiences.Contains(t))
            .WithMessage($"Target audience must be one of: {string.Join(", ", ValidAudiences)}");

        RuleFor(x => x.TargetClassId)
            .NotEmpty().WithMessage("Target class is required when audience is 'Class'")
            .When(x => x.TargetAudience == "Class");

        RuleFor(x => x.TargetSectionId)
            .NotEmpty().WithMessage("Target section is required when audience is 'Section'")
            .When(x => x.TargetAudience == "Section");

        RuleFor(x => x.ExpiryDate)
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Expiry date must be a future date/time")
            .When(x => x.ExpiryDate.HasValue);
    }
}

public class UpdateAnnouncementValidator : AbstractValidator<UpdateAnnouncementRequest>
{
    private static readonly string[] ValidPriorities = { "Low", "Normal", "High", "Urgent" };

    public UpdateAnnouncementValidator()
    {
        RuleFor(x => x.Title)
            .Length(3, 200).WithMessage("Title must be between 3 and 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.Priority)
            .Must(p => ValidPriorities.Contains(p))
            .WithMessage($"Priority must be one of: {string.Join(", ", ValidPriorities)}")
            .When(x => !string.IsNullOrEmpty(x.Priority));
    }
}

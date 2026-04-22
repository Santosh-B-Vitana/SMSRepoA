using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateTransportRouteValidator : AbstractValidator<CreateTransportRouteRequest>
{
    public CreateTransportRouteValidator()
    {
        RuleFor(x => x.RouteNumber)
            .NotEmpty().WithMessage("Route number is required")
            .MaximumLength(50);

        RuleFor(x => x.RouteName)
            .NotEmpty().WithMessage("Route name is required")
            .MaximumLength(200);

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0")
            .LessThanOrEqualTo(100).WithMessage("Capacity cannot exceed 100");

        RuleFor(x => x.MonthlyFee)
            .GreaterThan(0).WithMessage("Monthly fee must be positive")
            .When(x => x.MonthlyFee.HasValue);

        RuleFor(x => x.DriverPhone)
            .Matches(@"^\+?[0-9\-]{10,15}$").WithMessage("Invalid phone number format")
            .When(x => !string.IsNullOrEmpty(x.DriverPhone));

        RuleFor(x => x.Status)
            .Must(s => s == "active" || s == "inactive")
            .WithMessage("Status must be 'active' or 'inactive'");
    }
}

public class CreateTransportStudentValidator : AbstractValidator<CreateTransportStudentRequest>
{
    public CreateTransportStudentValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty().WithMessage("Student ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.RouteId)
            .NotEmpty().WithMessage("Route ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.PickupPoint)
            .MaximumLength(200)
            .When(x => x.PickupPoint != null);

        RuleFor(x => x.DropPoint)
            .MaximumLength(200)
            .When(x => x.DropPoint != null);
    }
}

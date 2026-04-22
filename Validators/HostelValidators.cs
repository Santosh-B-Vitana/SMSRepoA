using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateHostelRoomValidator : AbstractValidator<CreateHostelRoomRequest>
{
    public CreateHostelRoomValidator()
    {
        RuleFor(x => x.RoomNumber)
            .NotEmpty().WithMessage("Room number is required")
            .MaximumLength(20);

        RuleFor(x => x.RoomType)
            .NotEmpty().WithMessage("Room type is required")
            .MaximumLength(50);

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be at least 1")
            .LessThanOrEqualTo(20).WithMessage("Capacity cannot exceed 20 per room");

        RuleFor(x => x.RentPerBed)
            .GreaterThan(0).WithMessage("Rent per bed must be positive")
            .LessThan(100000).WithMessage("Rent amount seems too high");

        RuleFor(x => x.Occupied)
            .GreaterThanOrEqualTo(0)
            .LessThanOrEqualTo(x => x.Capacity)
            .WithMessage("Occupied count cannot exceed capacity");

        RuleFor(x => x.Status)
            .Must(s => s == "available" || s == "full" || s == "maintenance" || s == "closed")
            .WithMessage("Status must be 'available', 'full', 'maintenance', or 'closed'");
    }
}

public class CreateHostelStudentValidator : AbstractValidator<CreateHostelStudentRequest>
{
    public CreateHostelStudentValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty().WithMessage("Student ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.RoomId)
            .NotEmpty().WithMessage("Room ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.CheckInDate)
            .NotEmpty().WithMessage("Check-in date is required");

        RuleFor(x => x.MonthlyFee)
            .GreaterThan(0).WithMessage("Monthly fee must be positive");
    }
}

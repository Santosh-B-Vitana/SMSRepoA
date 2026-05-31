using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateFeeStructureRequestValidator : AbstractValidator<CreateFeeStructureRequest>
{
    public CreateFeeStructureRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Fee structure name is required")
            .Length(3, 100).WithMessage("Name must be between 3 and 100 characters");

        RuleFor(x => x.Class)
            .MaximumLength(50).WithMessage("Class cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Class));

        RuleFor(x => x.AcademicYear)
            .NotEmpty().WithMessage("Academic year is required")
            .Matches(@"^\d{4}-\d{2,4}$").WithMessage("Academic year must be in format YYYY-YY or YYYY-YYYY");

        RuleFor(x => x.TuitionFee).GreaterThanOrEqualTo(0).WithMessage("Tuition fee cannot be negative");
        RuleFor(x => x.AdmissionFee).GreaterThanOrEqualTo(0).WithMessage("Admission fee cannot be negative");
        RuleFor(x => x.ExamFee).GreaterThanOrEqualTo(0).WithMessage("Exam fee cannot be negative");
        RuleFor(x => x.LibraryFee).GreaterThanOrEqualTo(0).WithMessage("Library fee cannot be negative");
        RuleFor(x => x.LabFee).GreaterThanOrEqualTo(0).WithMessage("Lab fee cannot be negative");
        RuleFor(x => x.SportsFee).GreaterThanOrEqualTo(0).WithMessage("Sports fee cannot be negative");
        RuleFor(x => x.TransportFee).GreaterThanOrEqualTo(0).WithMessage("Transport fee cannot be negative");
        RuleFor(x => x.HostelFee).GreaterThanOrEqualTo(0).WithMessage("Hostel fee cannot be negative");
        RuleFor(x => x.UniformFee).GreaterThanOrEqualTo(0).WithMessage("Uniform fee cannot be negative");
        RuleFor(x => x.BooksFee).GreaterThanOrEqualTo(0).WithMessage("Books fee cannot be negative");
        RuleFor(x => x.DevelopmentFee).GreaterThanOrEqualTo(0).WithMessage("Development fee cannot be negative");
        RuleFor(x => x.Miscellaneous).GreaterThanOrEqualTo(0).WithMessage("Miscellaneous fee cannot be negative");

        // Legacy fee components are optional — fees are now added as line items via the components API
        RuleFor(x => x.InstallmentCount)
            .InclusiveBetween(0, 12).WithMessage("Installment count must be between 0 and 12");
    }
}

public class CreatePaymentRequestValidator : AbstractValidator<CreatePaymentRequest>
{
    public CreatePaymentRequestValidator()
    {
        RuleFor(x => x.StudentId)
            .NotEmpty().WithMessage("Student ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid student must be selected");

        RuleFor(x => x.FeeRecordId)
            .NotEmpty().WithMessage("Fee record ID is required")
            .NotEqual(Guid.Empty).WithMessage("Valid fee record must be selected");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Payment amount must be greater than 0");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Payment date is required")
            .LessThanOrEqualTo(DateTime.UtcNow.Date.AddDays(1)).WithMessage("Payment date cannot be in the future");

        RuleFor(x => x.Method)
            .NotEmpty().WithMessage("Payment method is required")
            .Must(m => new[] { "cash", "cheque", "dd", "online", "upi", "card", "bank_transfer", "neft", "imps", "rtgs", "razorpay", "payu", "cashfree" }
                .Contains(m.ToLower()))
            .WithMessage("Payment method must be: cash, cheque, dd, bank_transfer, upi, card, or cashfree");

        RuleFor(x => x.ReceiptNumber)
            .NotEmpty().WithMessage("Receipt number is required")
            .MaximumLength(50).WithMessage("Receipt number cannot exceed 50 characters");
    }
}

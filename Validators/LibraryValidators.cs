using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators;

public class CreateBookValidator : AbstractValidator<CreateBookRequest>
{
    public CreateBookValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Book title is required")
            .MaximumLength(500);

        RuleFor(x => x.Author)
            .MaximumLength(255)
            .When(x => x.Author != null);

        RuleFor(x => x.ISBN)
            .Matches(@"^(97[89][-\s]?)?(\d[-\s]?){9}[\dXx]$")
            .WithMessage("Invalid ISBN format")
            .When(x => !string.IsNullOrEmpty(x.ISBN));

        RuleFor(x => x.TotalCopies)
            .GreaterThan(0).WithMessage("Total copies must be at least 1")
            .LessThanOrEqualTo(10000).WithMessage("Total copies seems too high");

        RuleFor(x => x.AvailableCopies)
            .GreaterThanOrEqualTo(0)
            .LessThanOrEqualTo(x => x.TotalCopies)
            .WithMessage("Available copies cannot exceed total copies");

        RuleFor(x => x.PublishedYear)
            .InclusiveBetween(1900, DateTime.Today.Year + 1)
            .WithMessage("Published year must be between 1900 and next year")
            .When(x => x.PublishedYear.HasValue);
    }
}

public class CreateBookIssueValidator : AbstractValidator<CreateBookIssueRequest>
{
    public CreateBookIssueValidator()
    {
        RuleFor(x => x.BookId)
            .NotEmpty().WithMessage("Book ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.StudentId)
            .NotEmpty().WithMessage("Student ID is required")
            .NotEqual(Guid.Empty);

        RuleFor(x => x.IssueDate)
            .NotEmpty().WithMessage("Issue date is required")
            .LessThanOrEqualTo(DateTime.Today.AddDays(1))
            .WithMessage("Issue date cannot be in the future");

        RuleFor(x => x.DueDate)
            .NotEmpty().WithMessage("Due date is required")
            .GreaterThan(x => x.IssueDate)
            .WithMessage("Due date must be after issue date")
            .LessThanOrEqualTo(x => x.IssueDate.AddDays(90))
            .WithMessage("Maximum borrowing period is 90 days");
    }
}

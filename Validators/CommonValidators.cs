using FluentValidation;
using SmsApi.Models.DTOs;

namespace SmsApi.Validators
{
    /// <summary>
    /// Core validation rules for key DTOs
    /// Ensures data integrity before database operations
    /// </summary>

    public class CreateStudentValidator : AbstractValidator<CreateStudentRequest>
    {
        public CreateStudentValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Student name is required")
                .Length(2, 100).WithMessage("Name must be between 2 and 100 characters");

            RuleFor(x => x.AdmissionNumber)
                .NotEmpty().WithMessage("Admission number is required")
                .Matches(@"^[A-Z0-9\-/]+$").WithMessage("Admission number must contain only uppercase letters, numbers, hyphens, and slashes");

            RuleFor(x => x.DateOfBirth)
                .NotEmpty().WithMessage("Date of birth is required")
                .Must(dob => dob < DateTime.Today.AddYears(-4))
                .WithMessage("Student must be at least 4 years old")
                .Must(dob => dob > DateTime.Today.AddYears(-25))
                .WithMessage("Date of birth seems invalid");

            RuleFor(x => x.Gender)
                .NotEmpty().WithMessage("Gender is required")
                .Must(g => g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be Male, Female, or Other");

            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("Valid email address is required")
                .When(x => !string.IsNullOrEmpty(x.Email));

            RuleFor(x => x.SchoolId)
                .NotEmpty().WithMessage("School ID is required")
                .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");
        }
    }

    /// <summary>
    /// Validation for Staff creation
    /// </summary>
    public class CreateStaffValidator : AbstractValidator<CreateStaffRequest>
    {
        public CreateStaffValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required")
                .Length(2, 100).WithMessage("First name must be between 2 and 100 characters");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required")
                .Length(2, 100).WithMessage("Last name must be between 2 and 100 characters");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Valid email address is required");

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Phone number is required")
                .Matches(@"^[0-9]{10}$").WithMessage("Phone number must be 10 digits");

            RuleFor(x => x.DateOfBirth)
                .NotEmpty().WithMessage("Date of birth is required")
                .Must(dob => dob < DateTime.Today.AddYears(-18))
                .WithMessage("Staff member must be at least 18 years old");

            RuleFor(x => x.EmployeeId)
                .NotEmpty().WithMessage("Employee ID is required")
                .Length(3, 50).WithMessage("Employee ID must be between 3 and 50 characters");

            RuleFor(x => x.Department)
                .NotEmpty().WithMessage("Department is required")
                .Length(2, 100).WithMessage("Department must be between 2 and 100 characters");

            RuleFor(x => x.Designation)
                .NotEmpty().WithMessage("Designation is required")
                .Length(2, 100).WithMessage("Designation must be between 2 and 100 characters");

            RuleFor(x => x.JoiningDate)
                .NotEmpty().WithMessage("Joining date is required")
                .Must(date => date <= DateTime.Today)
                .WithMessage("Joining date cannot be in the future");

            RuleFor(x => x.Salary)
                .GreaterThan(0).WithMessage("Salary must be greater than 0")
                .When(x => x.Salary.HasValue);

            RuleFor(x => x.EmploymentType)
                .Must(type => type == "permanent" || type == "contract" || type == "temporary" || type == "probation")
                .WithMessage("Employment type must be permanent, contract, temporary, or probation");

            RuleFor(x => x.SchoolId)
                .NotEmpty().WithMessage("School ID is required")
                .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");
        }
    }

    /// <summary>
    /// Validation for Fee record creation
    /// </summary>
    public class CreateFeeRecordValidator : AbstractValidator<CreateFeeRecordRequest>
    {
        public CreateFeeRecordValidator()
        {
            RuleFor(x => x.StudentId)
                .NotEmpty().WithMessage("Student ID is required")
                .NotEqual(Guid.Empty).WithMessage("Valid student must be selected");

            RuleFor(x => x.TotalAmount)
                .GreaterThan(0).WithMessage("Fee amount must be greater than 0")
                .LessThan(1000000).WithMessage("Fee amount seems too high");

            RuleFor(x => x.DueDate)
                .NotEmpty().WithMessage("Due date is required")
                .GreaterThan(DateTime.Today).WithMessage("Due date must be in the future");

            RuleFor(x => x.SchoolId)
                .NotEmpty().WithMessage("School ID is required")
                .NotEqual(Guid.Empty).WithMessage("Valid school must be selected");
        }
    }

    /// <summary>
    /// Validation for Attendance marking
    /// </summary>
    public class MarkAttendanceValidator : AbstractValidator<MarkAttendanceDto>
    {
        public MarkAttendanceValidator()
        {
            RuleFor(x => x.StudentId)
                .NotEmpty().WithMessage("Student ID is required")
                .NotEqual(Guid.Empty).WithMessage("Valid student must be selected");

            RuleFor(x => x.Date)
                .NotEmpty().WithMessage("Attendance date is required")
                .Must(date => date <= DateTime.Today)
                .WithMessage("Attendance cannot be marked for future dates")
                .Must(date => date >= DateTime.Today.AddDays(-365))
                .WithMessage("Attendance cannot be marked for dates older than 1 year");

            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("Attendance status is required")
                .Must(status => status == "Present" || status == "Absent" || status == "Leave" || status == "Late")
                .WithMessage("Status must be Present, Absent, Leave, or Late");

            RuleFor(x => x.CheckInTime)
                .Must(time => ValidateTimeFormat(time))
                .WithMessage("Check-in time must be in HH:mm:ss or HH:mm format")
                .When(x => !string.IsNullOrEmpty(x.CheckInTime));

            RuleFor(x => x.CheckOutTime)
                .Must(time => ValidateTimeFormat(time))
                .WithMessage("Check-out time must be in HH:mm:ss or HH:mm format")
                .When(x => !string.IsNullOrEmpty(x.CheckOutTime));
        }

        private bool ValidateTimeFormat(string? time)
        {
            if (string.IsNullOrEmpty(time))
                return true;
            return TimeSpan.TryParse(time, out _);
        }
    }
}

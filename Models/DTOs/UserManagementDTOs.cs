using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.DTOs
{
    /// <summary>
    /// User management data transfer objects
    /// </summary>
    /// 
    public class UserManagementRequest
    {
        [Required(ErrorMessage = "Username is required")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 100 characters")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email address")]
        public string Email { get; set; } = string.Empty;

        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required")]
        [StringLength(50)]
        public string Role { get; set; } = string.Empty;

        [Required(ErrorMessage = "Status is required")]
        [StringLength(50)]
        public string Status { get; set; } = "active";
    }

    public class CreateUserRequest : UserManagementRequest
    {
        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateUserRequest : UserManagementRequest
    {
        // Password is optional for updates
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        public string? Password { get; set; }
    }

    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "User ID is required")]
        public Guid UserId { get; set; }

        [Required(ErrorMessage = "New password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm password is required")]
        public string ConfirmPassword { get; set; } = string.Empty;

        /// <summary>
        /// If true, sends email notification to user with new password
        /// </summary>
        public bool SendEmailNotification { get; set; } = true;
    }

    public class UserResponse
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
        public int FailedLoginAttempts { get; set; }
        public DateTime? PasswordChangedAt { get; set; }
    }

    public class UserListResponse
    {
        public List<UserResponse> Users { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class UserStatisticsResponse
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int LockedUsers { get; set; }
        public int AdminUsers { get; set; }
        public int PrincipalUsers { get; set; }
        public int TeacherUsers { get; set; }
        public int StaffUsers { get; set; }
    }

    public class PasswordResetEmailRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string TemporaryPassword { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
    }
}

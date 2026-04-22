using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace SmsApi.Services
{
    /// <summary>
    /// Interface for user management operations
    /// </summary>
    public interface IUserManagementService
    {
        Task<ServiceResult<UserResponse>> CreateUserAsync(Guid schoolId, CreateUserRequest request);
        Task<ServiceResult<UserResponse>> UpdateUserAsync(Guid schoolId, Guid userId, UpdateUserRequest request);
        Task<ServiceResult<bool>> DeleteUserAsync(Guid schoolId, Guid userId);
        Task<ServiceResult<UserResponse>> GetUserByIdAsync(Guid schoolId, Guid userId);
        Task<ServiceResult<UserListResponse>> GetAllUsersAsync(Guid schoolId, int pageNumber = 1, int pageSize = 50);
        Task<ServiceResult<UserStatisticsResponse>> GetUserStatisticsAsync(Guid schoolId);
        Task<ServiceResult<bool>> ResetPasswordAsync(Guid schoolId, ResetPasswordRequest request);
        Task<ServiceResult<bool>> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
        Task<ServiceResult<UserResponse>> GetUserByUsernameAsync(Guid schoolId, string username);
        Task<ServiceResult<List<UserResponse>>> SearchUsersAsync(Guid schoolId, string searchTerm, string? roleFilter = null);
    }

    /// <summary>
    /// Service for managing user accounts and credentials
    /// </summary>
    public class UserManagementService : BaseService, IUserManagementService
    {
        private readonly IEmailService _emailService;
        private const int BCRYPT_WORK_FACTOR = 12;

        public UserManagementService(
            AppDbContext context,
            IEmailService emailService,
            ILogger<UserManagementService> logger) : base(context, logger)
        {
            _emailService = emailService;
        }

        public async Task<ServiceResult<UserResponse>> CreateUserAsync(Guid schoolId, CreateUserRequest request)
        {
            try
            {
                // Validate school exists
                var schoolExists = await _context.Schools.AnyAsync(s => s.Id == schoolId);
                if (!schoolExists)
                    return CreateErrorResult<UserResponse>("School not found");

                // Check if username already exists
                var usernameExists = await _context.Set<UserLogin>()
                    .AnyAsync(u => u.Username == request.Username && u.SchoolId == schoolId && !u.IsDeleted);
                if (usernameExists)
                    return CreateErrorResult<UserResponse>("Username already exists");

                // Check if email already exists
                var emailExists = await _context.Set<UserLogin>()
                    .AnyAsync(u => u.Email == request.Email && u.SchoolId == schoolId && !u.IsDeleted);
                if (emailExists)
                    return CreateErrorResult<UserResponse>("Email already exists");

                var passwordHash = HashPassword(request.Password);

                var user = new UserLogin
                {
                    Username = request.Username,
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role,
                    Status = request.Status,
                    SchoolId = schoolId,
                    PasswordHash = passwordHash,
                    PasswordChangedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Set<UserLogin>().Add(user);
                await _context.SaveChangesAsync();

                // Send welcome email with credentials
                var tempPassword = request.Password;
                await _emailService.SendUserCreatedEmailAsync(
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.Username,
                    tempPassword);

                _logger.LogInformation($"User {request.Username} created successfully for school {schoolId}");

                return CreateSuccessResult(MapToUserResponse(user));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error creating user: {ex.Message}");
                return CreateErrorResult<UserResponse>("Error creating user");
            }
        }

        public async Task<ServiceResult<UserResponse>> UpdateUserAsync(Guid schoolId, Guid userId, UpdateUserRequest request)
        {
            try
            {
                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == userId && u.SchoolId == schoolId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<UserResponse>("User not found");

                // Check if new username is already taken by another user
                if (user.Username != request.Username)
                {
                    var usernameTaken = await _context.Set<UserLogin>()
                        .AnyAsync(u => u.Username == request.Username && u.SchoolId == schoolId && u.Id != userId && !u.IsDeleted);
                    if (usernameTaken)
                        return CreateErrorResult<UserResponse>("Username already exists");
                }

                // Check if new email is already taken by another user
                if (user.Email != request.Email)
                {
                    var emailTaken = await _context.Set<UserLogin>()
                        .AnyAsync(u => u.Email == request.Email && u.SchoolId == schoolId && u.Id != userId && !u.IsDeleted);
                    if (emailTaken)
                        return CreateErrorResult<UserResponse>("Email already exists");
                }

                user.Username = request.Username;
                user.Email = request.Email;
                user.FirstName = request.FirstName;
                user.LastName = request.LastName;
                user.Role = request.Role;
                user.Status = request.Status;
                user.UpdatedAt = DateTime.UtcNow;

                // Update password if provided
                if (!string.IsNullOrWhiteSpace(request.Password))
                {
                    user.PasswordHash = HashPassword(request.Password);
                    user.PasswordChangedAt = DateTime.UtcNow;
                }

                _context.Set<UserLogin>().Update(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {userId} updated successfully");

                return CreateSuccessResult(MapToUserResponse(user));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating user: {ex.Message}");
                return CreateErrorResult<UserResponse>("Error updating user");
            }
        }

        public async Task<ServiceResult<bool>> DeleteUserAsync(Guid schoolId, Guid userId)
        {
            try
            {
                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == userId && u.SchoolId == schoolId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<bool>("User not found");

                // Soft delete
                user.IsDeleted = true;
                user.UpdatedAt = DateTime.UtcNow;

                _context.Set<UserLogin>().Update(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {userId} deleted (soft delete)");

                return CreateSuccessResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error deleting user: {ex.Message}");
                return CreateErrorResult<bool>("Error deleting user");
            }
        }

        public async Task<ServiceResult<UserResponse>> GetUserByIdAsync(Guid schoolId, Guid userId)
        {
            try
            {
                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == userId && u.SchoolId == schoolId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<UserResponse>("User not found");

                return CreateSuccessResult(MapToUserResponse(user));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user: {ex.Message}");
                return CreateErrorResult<UserResponse>("Error retrieving user");
            }
        }

        public async Task<ServiceResult<UserListResponse>> GetAllUsersAsync(Guid schoolId, int pageNumber = 1, int pageSize = 50)
        {
            try
            {
                var query = _context.Set<UserLogin>()
                    .Where(u => u.SchoolId == schoolId && !u.IsDeleted)
                    .OrderByDescending(u => u.CreatedAt);

                var totalCount = await query.CountAsync();
                var users = await query
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var response = new UserListResponse
                {
                    Users = users.Select(MapToUserResponse).ToList(),
                    TotalCount = totalCount,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                return CreateSuccessResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving users: {ex.Message}");
                return CreateErrorResult<UserListResponse>("Error retrieving users");
            }
        }

        public async Task<ServiceResult<UserStatisticsResponse>> GetUserStatisticsAsync(Guid schoolId)
        {
            try
            {
                var users = await _context.Set<UserLogin>()
                    .Where(u => u.SchoolId == schoolId && !u.IsDeleted)
                    .ToListAsync();

                var stats = new UserStatisticsResponse
                {
                    TotalUsers = users.Count,
                    ActiveUsers = users.Count(u => u.Status == "active"),
                    InactiveUsers = users.Count(u => u.Status == "inactive"),
                    LockedUsers = users.Count(u => u.Status == "locked"),
                    AdminUsers = users.Count(u => u.Role == "admin"),
                    PrincipalUsers = users.Count(u => u.Role == "principal"),
                    TeacherUsers = users.Count(u => u.Role == "teacher"),
                    StaffUsers = users.Count(u => u.Role == "staff")
                };

                return CreateSuccessResult(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting user statistics: {ex.Message}");
                return CreateErrorResult<UserStatisticsResponse>("Error getting user statistics");
            }
        }

        public async Task<ServiceResult<bool>> ResetPasswordAsync(Guid schoolId, ResetPasswordRequest request)
        {
            try
            {
                if (request.NewPassword != request.ConfirmPassword)
                    return CreateErrorResult<bool>("Passwords do not match");

                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == request.UserId && u.SchoolId == schoolId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<bool>("User not found");

                user.PasswordHash = HashPassword(request.NewPassword);
                user.PasswordChangedAt = DateTime.UtcNow;
                user.FailedLoginAttempts = 0;
                user.LockedUntil = null;
                user.UpdatedAt = DateTime.UtcNow;

                _context.Set<UserLogin>().Update(user);
                await _context.SaveChangesAsync();

                // Send email notification if enabled
                if (request.SendEmailNotification)
                {
                    var emailRequest = new PasswordResetEmailRequest
                    {
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Username = user.Username,
                        TemporaryPassword = request.NewPassword
                    };

                    await _emailService.SendPasswordResetEmailAsync(emailRequest);
                }

                _logger.LogInformation($"Password reset for user {request.UserId}");

                return CreateSuccessResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error resetting password: {ex.Message}");
                return CreateErrorResult<bool>("Error resetting password");
            }
        }

        public async Task<ServiceResult<bool>> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            try
            {
                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<bool>("User not found");

                // Verify current password
                if (!VerifyPassword(currentPassword, user.PasswordHash))
                    return CreateErrorResult<bool>("Current password is incorrect");

                user.PasswordHash = HashPassword(newPassword);
                user.PasswordChangedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;

                _context.Set<UserLogin>().Update(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Password changed for user {userId}");

                return CreateSuccessResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error changing password: {ex.Message}");
                return CreateErrorResult<bool>("Error changing password");
            }
        }

        public async Task<ServiceResult<UserResponse>> GetUserByUsernameAsync(Guid schoolId, string username)
        {
            try
            {
                var user = await _context.Set<UserLogin>()
                    .FirstOrDefaultAsync(u => u.Username == username && u.SchoolId == schoolId && !u.IsDeleted);

                if (user == null)
                    return CreateErrorResult<UserResponse>("User not found");

                return CreateSuccessResult(MapToUserResponse(user));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error retrieving user by username: {ex.Message}");
                return CreateErrorResult<UserResponse>("Error retrieving user");
            }
        }

        public async Task<ServiceResult<List<UserResponse>>> SearchUsersAsync(Guid schoolId, string searchTerm, string? roleFilter = null)
        {
            try
            {
                var query = _context.Set<UserLogin>()
                    .Where(u => u.SchoolId == schoolId && !u.IsDeleted);

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    var term = searchTerm.ToLower();
                    query = query.Where(u =>
                        u.Username.ToLower().Contains(term) ||
                        u.Email.ToLower().Contains(term) ||
                        u.FirstName.ToLower().Contains(term) ||
                        u.LastName.ToLower().Contains(term));
                }

                if (!string.IsNullOrWhiteSpace(roleFilter))
                {
                    query = query.Where(u => u.Role == roleFilter);
                }

                var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
                var result = users.Select(MapToUserResponse).ToList();

                return CreateSuccessResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error searching users: {ex.Message}");
                return CreateErrorResult<List<UserResponse>>("Error searching users");
            }
        }

        // Helper Methods

        private static string HashPassword(string password) =>
            BCrypt.Net.BCrypt.HashPassword(password, workFactor: BCRYPT_WORK_FACTOR);

        private static bool VerifyPassword(string password, string hash)
        {
            try { return BCrypt.Net.BCrypt.Verify(password, hash); }
            catch { return false; }
        }

        /// <summary>
        /// Create a success result
        /// </summary>
        private ServiceResult<T> CreateSuccessResult<T>(T? data, string message = "Success")
        {
            return new ServiceResult<T>
            {
                Success = true,
                Data = data,
                Message = message
            };
        }

        /// <summary>
        /// Create an error result
        /// </summary>
        private ServiceResult<T> CreateErrorResult<T>(string message)
        {
            return new ServiceResult<T>
            {
                Success = false,
                Data = default,
                Message = message,
                Errors = new List<string> { message }
            };
        }

        /// <summary>
        /// Map UserLogin entity to UserResponse DTO
        /// </summary>
        private UserResponse MapToUserResponse(UserLogin user)
        {
            return new UserResponse
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                Status = user.Status,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                LastLogin = user.LastLogin,
                FailedLoginAttempts = user.FailedLoginAttempts,
                PasswordChangedAt = user.PasswordChangedAt
            };
        }
    }

    /// <summary>
    /// Generic service result wrapper
    /// </summary>
    public class ServiceResult<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> Errors { get; set; } = new();
    }
}

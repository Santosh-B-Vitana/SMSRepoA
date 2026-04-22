using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using Microsoft.Extensions.Logging;

namespace SmsApi.Services
{
    public interface IClassSettingsService
    {
        Task<ClassSettingsResponse?> GetClassSettingsAsync(Guid classId);
        Task<ClassSettingsResponse> CreateClassSettingsAsync(CreateClassSettingsRequest request);
        Task<ClassSettingsResponse> UpdateClassSettingsAsync(Guid classSettingsId, UpdateClassSettingsRequest request);
        Task<bool> DeleteClassSettingsAsync(Guid classSettingsId);
        Task<ClassSettingsResponse?> GetOrCreateDefaultSettingsAsync(Guid schoolId, Guid classId);
    }

    public class ClassSettingsService : BaseService, IClassSettingsService
    {
        private readonly AppDbContext _dbContext;

        public ClassSettingsService(AppDbContext dbContext, ILogger<ClassSettingsService> logger) : base(dbContext, logger)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Get class settings by class ID
        /// </summary>
        public async Task<ClassSettingsResponse?> GetClassSettingsAsync(Guid classId)
        {
            try
            {
                var settings = await _dbContext.ClassSettings
                    .FirstOrDefaultAsync(cs => cs.ClassId == classId && !cs.IsDeleted);

                if (settings == null)
                    return null;

                return MapToResponse(settings);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error retrieving class settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Create new class settings
        /// </summary>
        public async Task<ClassSettingsResponse> CreateClassSettingsAsync(CreateClassSettingsRequest request)
        {
            try
            {
                // Check if class exists
                var classExists = await _dbContext.Classes
                    .AnyAsync(c => c.Id == request.ClassId && !c.IsDeleted);

                if (!classExists)
                    throw new Exception($"Class with ID {request.ClassId} not found");

                // Check if settings already exist
                var existingSettings = await _dbContext.ClassSettings
                    .FirstOrDefaultAsync(cs => cs.ClassId == request.ClassId && !cs.IsDeleted);

                if (existingSettings != null)
                    throw new Exception($"Settings already exist for class {request.ClassId}");

                var settings = new ClassSettings
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    ClassId = request.ClassId,
                    PassingPercentage = request.PassingPercentage,
                    MinimumAttendance = request.MinimumAttendance,
                    GradingScale = request.GradingScale,
                    PromotionPolicy = request.PromotionPolicy,
                    CustomPromotionPolicy = request.CustomPromotionPolicy,
                    EnableAutoPromotion = request.EnableAutoPromotion,
                    EnableSupplementaryExams = request.EnableSupplementaryExams,
                    EnableGradingForPromotion = request.EnableGradingForPromotion,
                    MinSubjectsToPass = request.MinSubjectsToPass,
                    Notes = request.Notes,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.ClassSettings.Add(settings);
                await _dbContext.SaveChangesAsync();

                return MapToResponse(settings);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error creating class settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Update class settings
        /// </summary>
        public async Task<ClassSettingsResponse> UpdateClassSettingsAsync(Guid classSettingsId, UpdateClassSettingsRequest request)
        {
            try
            {
                var settings = await _dbContext.ClassSettings
                    .FirstOrDefaultAsync(cs => cs.Id == classSettingsId && !cs.IsDeleted);

                if (settings == null)
                    throw new Exception($"Class settings with ID {classSettingsId} not found");

                // Update only provided fields
                if (request.PassingPercentage.HasValue)
                    settings.PassingPercentage = request.PassingPercentage.Value;

                if (request.MinimumAttendance.HasValue)
                    settings.MinimumAttendance = request.MinimumAttendance.Value;

                if (!string.IsNullOrEmpty(request.GradingScale))
                    settings.GradingScale = request.GradingScale;

                if (!string.IsNullOrEmpty(request.PromotionPolicy))
                    settings.PromotionPolicy = request.PromotionPolicy;

                if (!string.IsNullOrEmpty(request.CustomPromotionPolicy))
                    settings.CustomPromotionPolicy = request.CustomPromotionPolicy;

                if (request.EnableAutoPromotion.HasValue)
                    settings.EnableAutoPromotion = request.EnableAutoPromotion.Value;

                if (request.EnableSupplementaryExams.HasValue)
                    settings.EnableSupplementaryExams = request.EnableSupplementaryExams.Value;

                if (request.EnableGradingForPromotion.HasValue)
                    settings.EnableGradingForPromotion = request.EnableGradingForPromotion.Value;

                if (request.MinSubjectsToPass.HasValue)
                    settings.MinSubjectsToPass = request.MinSubjectsToPass;

                if (!string.IsNullOrEmpty(request.Notes))
                    settings.Notes = request.Notes;

                if (!string.IsNullOrEmpty(request.Status))
                    settings.Status = request.Status;

                settings.UpdatedAt = DateTime.UtcNow;

                _dbContext.ClassSettings.Update(settings);
                await _dbContext.SaveChangesAsync();

                return MapToResponse(settings);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating class settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete class settings (soft delete)
        /// </summary>
        public async Task<bool> DeleteClassSettingsAsync(Guid classSettingsId)
        {
            try
            {
                var settings = await _dbContext.ClassSettings
                    .FirstOrDefaultAsync(cs => cs.Id == classSettingsId && !cs.IsDeleted);

                if (settings == null)
                    return false;

                settings.IsDeleted = true;
                settings.DeletedAt = DateTime.UtcNow;

                _dbContext.ClassSettings.Update(settings);
                await _dbContext.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error deleting class settings: {ex.Message}");
            }
        }

        /// <summary>
        /// Get or create default settings for a class
        /// </summary>
        public async Task<ClassSettingsResponse?> GetOrCreateDefaultSettingsAsync(Guid schoolId, Guid classId)
        {
            try
            {
                var existingSettings = await GetClassSettingsAsync(classId);
                if (existingSettings != null)
                    return existingSettings;

                // Create default settings
                var defaultRequest = new CreateClassSettingsRequest
                {
                    SchoolId = schoolId,
                    ClassId = classId,
                    PassingPercentage = 35m,
                    MinimumAttendance = 75m,
                    GradingScale = "4.0",
                    PromotionPolicy = "strict",
                    EnableAutoPromotion = true,
                    EnableSupplementaryExams = true,
                    EnableGradingForPromotion = true
                };

                return await CreateClassSettingsAsync(defaultRequest);
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting or creating default settings: {ex.Message}");
            }
        }

        private ClassSettingsResponse MapToResponse(ClassSettings settings)
        {
            return new ClassSettingsResponse
            {
                Id = settings.Id,
                SchoolId = settings.SchoolId,
                ClassId = settings.ClassId,
                PassingPercentage = settings.PassingPercentage,
                MinimumAttendance = settings.MinimumAttendance,
                GradingScale = settings.GradingScale,
                PromotionPolicy = settings.PromotionPolicy,
                CustomPromotionPolicy = settings.CustomPromotionPolicy,
                EnableAutoPromotion = settings.EnableAutoPromotion,
                EnableSupplementaryExams = settings.EnableSupplementaryExams,
                EnableGradingForPromotion = settings.EnableGradingForPromotion,
                MinSubjectsToPass = settings.MinSubjectsToPass,
                Notes = settings.Notes,
                Status = settings.Status,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt
            };
        }
    }
}

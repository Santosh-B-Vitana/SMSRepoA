using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface ISettingsService
    {
        Task<SettingsListResponse> GetSchoolSettingsAsync(Guid schoolId, string? category = null);
        Task<SchoolSettingResponse> GetSchoolSettingAsync(Guid schoolId, string key);
        Task<SchoolSettingResponse> SetSchoolSettingAsync(SchoolSettingRequest request);
        Task DeleteSchoolSettingAsync(Guid id, Guid schoolId);
        Task<SettingsListResponse> GetUserSettingsAsync(Guid userId);
        Task<UserSettingResponse> SetUserSettingAsync(UserSettingRequest request);
        Task<SettingsListResponse> GetSystemConfigsAsync(string? module = null);
        Task<SystemConfigResponse> SetSystemConfigAsync(SystemConfigRequest request);
        Task<BulkSettingsRequest> BulkUpdateSettingsAsync(BulkSettingsRequest request);
    }

    public class SettingsService : ISettingsService
    {
        private readonly AppDbContext _context;

        public SettingsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SettingsListResponse> GetSchoolSettingsAsync(Guid schoolId, string? category = null)
        {
            var query = _context.SchoolSettings.Where(s => s.SchoolId == schoolId);
            
            if (!string.IsNullOrEmpty(category))
                query = query.Where(s => s.Category == category);

            var settings = await query.ToListAsync();

            return new SettingsListResponse
            {
                Settings = settings.Select(MapToSchoolSettingResponse).ToList()
            };
        }

        public async Task<SchoolSettingResponse> GetSchoolSettingAsync(Guid schoolId, string key)
        {
            var setting = await _context.SchoolSettings
                .FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.SettingKey == key);

            if (setting == null)
                throw new KeyNotFoundException($"Setting with key '{key}' not found");

            return MapToSchoolSettingResponse(setting);
        }

        public async Task<SchoolSettingResponse> SetSchoolSettingAsync(SchoolSettingRequest request)
        {
            // VALIDATION 1: Setting key must not be empty and must be valid format
            if (string.IsNullOrWhiteSpace(request.SettingKey) || request.SettingKey.Length > 100)
                throw new InvalidOperationException("Setting key must be provided and not exceed 100 characters");

            // VALIDATION 2: Reserved/protected keys cannot be modified
            var protectedKeys = new[] { "SCHOOL_ID", "API_KEY", "ENCRYPTION_KEY", "DATABASE_CONNECTION", "SYSTEM_ADMIN" };
            if (protectedKeys.Contains(request.SettingKey.ToUpper()))
                throw new InvalidOperationException($"Setting key '{request.SettingKey}' is protected and cannot be modified");

            // VALIDATION 3: Data type must be valid
            var validDataTypes = new[] { "string", "number", "boolean", "date", "json" };
            if (!validDataTypes.Contains(request.DataType?.ToLower()))
                throw new InvalidOperationException("Invalid data type. Must be string, number, boolean, date, or json");

            // VALIDATION 4: Value format must match data type
            if (!ValidateSettingValueFormat(request.SettingValue, request.DataType))
                throw new InvalidOperationException($"Setting value format does not match data type '{request.DataType}'");

            // VALIDATION 5: Skip upsert for empty optional settings (treat as no-op)
            if (string.IsNullOrWhiteSpace(request.SettingValue))
                request.SettingValue = string.Empty; // allow clearing a setting value

            var existingSetting = await _context.SchoolSettings
                .FirstOrDefaultAsync(s => s.SchoolId == request.SchoolId && s.SettingKey == request.SettingKey);

            if (existingSetting != null)
            {
                existingSetting.SettingValue = request.SettingValue;
                existingSetting.DataType = request.DataType;
                existingSetting.Category = request.Category;
                existingSetting.Description = request.Description;
                existingSetting.IsEncrypted = request.IsEncrypted;
                existingSetting.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return MapToSchoolSettingResponse(existingSetting);
            }
            else
            {
                var newSetting = new SchoolSettings
                {
                    Id = Guid.NewGuid(),
                    SchoolId = request.SchoolId,
                    SettingKey = request.SettingKey,
                    SettingValue = request.SettingValue,
                    DataType = request.DataType,
                    Category = request.Category,
                    Description = request.Description,
                    IsEncrypted = request.IsEncrypted,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SchoolSettings.Add(newSetting);
                await _context.SaveChangesAsync();
                return MapToSchoolSettingResponse(newSetting);
            }
        }

        public async Task DeleteSchoolSettingAsync(Guid id, Guid schoolId)
        {
            var setting = await _context.SchoolSettings
                .FirstOrDefaultAsync(s => s.Id == id && s.SchoolId == schoolId);

            if (setting == null)
                throw new KeyNotFoundException("Setting not found");

            // VALIDATION 1: Protected keys cannot be deleted
            var protectedKeys = new[] { "SCHOOL_ID", "API_KEY", "ENCRYPTION_KEY", "DATABASE_CONNECTION", "SYSTEM_ADMIN" };
            if (protectedKeys.Contains(setting.SettingKey.ToUpper()))
                throw new InvalidOperationException($"Setting key '{setting.SettingKey}' is protected and cannot be deleted");

            _context.SchoolSettings.Remove(setting);
            await _context.SaveChangesAsync();
        }

        public async Task<SettingsListResponse> GetUserSettingsAsync(Guid userId)
        {
            var settings = await _context.UserSettings
                .Where(s => s.UserId == userId)
                .ToListAsync();

            return new SettingsListResponse
            {
                UserSettings = settings.Select(MapToUserSettingResponse).ToList()
            };
        }

        public async Task<UserSettingResponse> SetUserSettingAsync(UserSettingRequest request)
        {
            // VALIDATION 1: UserId must not be empty
            if (request.UserId == Guid.Empty)
                throw new ArgumentException("UserId cannot be empty");

            // VALIDATION 2: Setting key must not be empty and must be valid format
            if (string.IsNullOrWhiteSpace(request.SettingKey) || request.SettingKey.Length > 100)
                throw new ArgumentException("Setting key must be provided and not exceed 100 characters");

            // VALIDATION 3: User must exist in database
            var userExists = await _context.Persons.AnyAsync(p => p.Id == request.UserId && !p.IsDeleted);
            if (!userExists)
                throw new KeyNotFoundException($"User with ID '{request.UserId}' not found");

            // VALIDATION 4: Data type must be valid
            var validDataTypes = new[] { "string", "number", "boolean", "date", "json" };
            if (!validDataTypes.Contains(request.DataType?.ToLower()))
                throw new ArgumentException("Invalid data type. Must be string, number, boolean, date, or json");

            // VALIDATION 5: Value format must match data type
            if (!ValidateSettingValueFormat(request.SettingValue, request.DataType))
                throw new ArgumentException($"Setting value format does not match data type '{request.DataType}'");

            var existingSetting = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == request.UserId && s.SettingKey == request.SettingKey);

            if (existingSetting != null)
            {
                existingSetting.SettingValue = request.SettingValue;
                existingSetting.DataType = request.DataType;
                existingSetting.Category = request.Category;
                existingSetting.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return MapToUserSettingResponse(existingSetting);
            }
            else
            {
                var newSetting = new UserSettings
                {
                    Id = Guid.NewGuid(),
                    UserId = request.UserId,
                    SettingKey = request.SettingKey,
                    SettingValue = request.SettingValue,
                    DataType = request.DataType,
                    Category = request.Category,
                    CreatedAt = DateTime.UtcNow
                };

                _context.UserSettings.Add(newSetting);
                await _context.SaveChangesAsync();
                return MapToUserSettingResponse(newSetting);
            }
        }

        public async Task<SettingsListResponse> GetSystemConfigsAsync(string? module = null)
        {
            var query = _context.SystemConfigurations.AsQueryable();
            
            if (!string.IsNullOrEmpty(module))
                query = query.Where(s => s.Module == module);

            var configs = await query.ToListAsync();

            return new SettingsListResponse
            {
                SystemConfigs = configs.Select(MapToSystemConfigResponse).ToList()
            };
        }

        public async Task<SystemConfigResponse> SetSystemConfigAsync(SystemConfigRequest request)
        {
            // VALIDATION 1: Config key must not be empty and must be valid format
            if (string.IsNullOrWhiteSpace(request.ConfigKey) || request.ConfigKey.Length > 100)
                throw new ArgumentException("Config key must be provided and not exceed 100 characters");

            // VALIDATION 2: Reserved system keys cannot be modified (except via direct DB admin)
            var protectedKeys = new[] { "MASTER_ENCRYPTION_KEY", "SYSTEM_ADMIN_PASSWORD", "DATABASE_MASTER_KEY", "LICENSE_KEY", "API_SECRET_KEY" };
            if (protectedKeys.Contains(request.ConfigKey.ToUpper()))
                throw new InvalidOperationException($"Config key '{request.ConfigKey}' is protected and cannot be modified");

            // VALIDATION 3: Data type must be valid
            var validDataTypes = new[] { "string", "number", "boolean", "date", "json" };
            if (!validDataTypes.Contains(request.DataType?.ToLower()))
                throw new ArgumentException("Invalid data type. Must be string, number, boolean, date, or json");

            // VALIDATION 4: Config value format must match data type
            if (!ValidateSettingValueFormat(request.ConfigValue, request.DataType))
                throw new ArgumentException($"Config value format does not match data type '{request.DataType}'");

            // VALIDATION 5: Module name must not exceed 100 chars
            if (!string.IsNullOrEmpty(request.Module) && request.Module.Length > 100)
                throw new ArgumentException("Module name cannot exceed 100 characters");

            var existingConfig = await _context.SystemConfigurations
                .FirstOrDefaultAsync(s => s.ConfigKey == request.ConfigKey);

            if (existingConfig != null)
            {
                // VALIDATION 6: Read-only config cannot be modified
                if (existingConfig.IsReadOnly)
                    throw new InvalidOperationException("Cannot modify read-only system configuration");

                existingConfig.ConfigValue = request.ConfigValue;
                existingConfig.DataType = request.DataType;
                existingConfig.Module = request.Module;
                existingConfig.Description = request.Description;
                existingConfig.RequiresRestart = request.RequiresRestart;
                existingConfig.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return MapToSystemConfigResponse(existingConfig);
            }
            else
            {
                var newConfig = new SystemConfiguration
                {
                    Id = Guid.NewGuid(),
                    ConfigKey = request.ConfigKey,
                    ConfigValue = request.ConfigValue,
                    DataType = request.DataType,
                    Module = request.Module,
                    Description = request.Description,
                    IsReadOnly = false,
                    RequiresRestart = request.RequiresRestart,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SystemConfigurations.Add(newConfig);
                await _context.SaveChangesAsync();
                return MapToSystemConfigResponse(newConfig);
            }
        }

        public async Task<BulkSettingsRequest> BulkUpdateSettingsAsync(BulkSettingsRequest request)
        {
            // VALIDATION 1: Request cannot be null
            if (request == null)
                throw new ArgumentException("Bulk settings request cannot be null");

            // VALIDATION 2: At least one collection must have items
            var hasItems = (request.SchoolSettings?.Count ?? 0) > 0 
                        || (request.UserSettings?.Count ?? 0) > 0 
                        || (request.SystemConfigs?.Count ?? 0) > 0;
            if (!hasItems)
                throw new ArgumentException("Bulk request must contain at least one setting");

            // VALIDATION 3: Total items cannot exceed reasonable limit (prevent DoS)
            var totalItems = (request.SchoolSettings?.Count ?? 0) 
                           + (request.UserSettings?.Count ?? 0) 
                           + (request.SystemConfigs?.Count ?? 0);
            if (totalItems > 1000)
                throw new ArgumentException($"Bulk request cannot exceed 1000 items total (received {totalItems})");

            var errors = new List<string>();

            if (request.SchoolSettings != null && request.SchoolSettings.Count > 0)
            {
                foreach (var setting in request.SchoolSettings)
                {
                    try
                    {
                        await SetSchoolSettingAsync(setting);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"School setting '{setting.SettingKey}': {ex.Message}");
                    }
                }
            }

            if (request.UserSettings != null && request.UserSettings.Count > 0)
            {
                foreach (var setting in request.UserSettings)
                {
                    try
                    {
                        await SetUserSettingAsync(setting);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"User setting '{setting.SettingKey}': {ex.Message}");
                    }
                }
            }

            if (request.SystemConfigs != null && request.SystemConfigs.Count > 0)
            {
                foreach (var config in request.SystemConfigs)
                {
                    try
                    {
                        await SetSystemConfigAsync(config);
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"System config '{config.ConfigKey}': {ex.Message}");
                    }
                }
            }

            // VALIDATION 4: If any errors occurred, throw exception with details
            if (errors.Count > 0)
                throw new InvalidOperationException($"Bulk update failed with {errors.Count} error(s): {string.Join("; ", errors.Take(5))}");

            return request;
        }

        private SchoolSettingResponse MapToSchoolSettingResponse(SchoolSettings setting)
        {
            return new SchoolSettingResponse
            {
                Id = setting.Id,
                SchoolId = setting.SchoolId,
                SettingKey = setting.SettingKey,
                SettingValue = setting.SettingValue,
                DataType = setting.DataType,
                Category = setting.Category,
                Description = setting.Description,
                IsEncrypted = setting.IsEncrypted,
                CreatedAt = setting.CreatedAt,
                UpdatedAt = setting.UpdatedAt
            };
        }

        private bool ValidateSettingValueFormat(string value, string dataType)
        {
            if (string.IsNullOrEmpty(value))
                return true;

            switch (dataType?.ToLower())
            {
                case "number":
                    return decimal.TryParse(value, out _);
                case "boolean":
                    return value.ToLower() == "true" || value.ToLower() == "false";
                case "date":
                    return DateTime.TryParse(value, out _);
                case "json":
                    try
                    {
                        System.Text.Json.JsonDocument.Parse(value);
                        return true;
                    }
                    catch
                    {
                        return false;
                    }
                default:
                    return true;
            }
        }

        private UserSettingResponse MapToUserSettingResponse(UserSettings setting)
        {
            return new UserSettingResponse
            {
                Id = setting.Id,
                UserId = setting.UserId,
                SettingKey = setting.SettingKey,
                SettingValue = setting.SettingValue,
                DataType = setting.DataType,
                Category = setting.Category,
                CreatedAt = setting.CreatedAt,
                UpdatedAt = setting.UpdatedAt
            };
        }

        private SystemConfigResponse MapToSystemConfigResponse(SystemConfiguration config)
        {
            return new SystemConfigResponse
            {
                Id = config.Id,
                ConfigKey = config.ConfigKey,
                ConfigValue = config.ConfigValue,
                DataType = config.DataType,
                Module = config.Module,
                Description = config.Description,
                IsReadOnly = config.IsReadOnly,
                RequiresRestart = config.RequiresRestart,
                CreatedAt = config.CreatedAt,
                UpdatedAt = config.UpdatedAt
            };
        }
    }
}


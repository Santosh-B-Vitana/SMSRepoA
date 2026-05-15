using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    // School Setting Basic DTO - Lightweight version for list views
    public class SchoolSettingBasicDto
    {
        public Guid Id { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsActive { get; set; }
    }

    // System Config Basic DTO - Lightweight version for list views
    public class SystemConfigBasicDto
    {
        public Guid Id { get; set; }
        public string ConfigKey { get; set; } = string.Empty;
        public string ConfigValue { get; set; } = string.Empty;
        public string? Module { get; set; }
        public bool IsReadOnly { get; set; }
        public bool IsActive { get; set; }
    }

    // Settings DTOs
    public class UpdateSchoolContactRequest
    {
        public string? Name    { get; set; }
        public string? Logo    { get; set; }
        public string? Phone   { get; set; }
        public string? Email   { get; set; }
        public string? Address { get; set; }
        public string? Website { get; set; }
        public string? Tagline { get; set; }
    }

    public class SchoolSettingRequest
    {
        public Guid SchoolId { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public bool IsEncrypted { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class SchoolSettingResponse
    {
        public Guid Id { get; set; }
        public Guid SchoolId { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public bool IsEncrypted { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UserSettingRequest
    {
        public Guid UserId { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Category { get; set; }
    }

    public class UserSettingResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Category { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SystemConfigRequest
    {
        public string ConfigKey { get; set; } = string.Empty;
        public string ConfigValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Module { get; set; }
        public string? Description { get; set; }
        public bool IsReadOnly { get; set; }
        public bool RequiresRestart { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class SystemConfigResponse
    {
        public Guid Id { get; set; }
        public string ConfigKey { get; set; } = string.Empty;
        public string ConfigValue { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Module { get; set; }
        public string? Description { get; set; }
        public bool IsReadOnly { get; set; }
        public bool RequiresRestart { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SettingsListResponse
    {
        public List<SchoolSettingResponse> Items { get; set; } = new();
        public List<SchoolSettingResponse> Settings { get; set; } = new();
        public List<UserSettingResponse> UserSettings { get; set; } = new();
        public List<SystemConfigResponse> SystemConfigs { get; set; } = new();
        public int TotalCount { get; set; }
    }

    public class BulkSettingsRequest
    {
        public List<SchoolSettingRequest> Settings { get; set; } = new();
        public List<SchoolSettingRequest> SchoolSettings { get; set; } = new();
        public List<UserSettingRequest> UserSettings { get; set; } = new();
        public List<SystemConfigRequest> SystemConfigs { get; set; } = new();
    }
}

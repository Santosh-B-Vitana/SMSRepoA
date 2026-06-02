namespace SmsApi.Models;

/// <summary>AWS S3 / MinIO / compatible storage configuration.</summary>
public class AwsSettings
{
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Region { get; set; } = "ap-south-1"; // Mumbai — default for India
    public string BucketName { get; set; } = string.Empty;
    /// <summary>Root folder / key prefix inside the bucket (e.g. "SMS-Test"). All stored objects are nested under this prefix.</summary>
    public string RootFolder { get; set; } = string.Empty;
    /// <summary>Override service URL for MinIO / LocalStack (leave empty for real AWS).</summary>
    public string? ServiceUrl { get; set; }
    /// <summary>Required for MinIO path-style addressing.</summary>
    public bool ForcePathStyle { get; set; } = false;
}

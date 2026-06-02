namespace SmsApi.Services;

/// <summary>
/// Abstraction for file storage. Implementations: LocalFileStorageService (dev/on-prem)
/// and S3FileStorageService (production/cloud). Switch without changing callers.
/// </summary>
public interface IFileStorageService
{
    /// <summary>Read file bytes. Returns null when not found.</summary>
    Task<byte[]?> GetAsync(string filePath);

    /// <summary>Delete a file by its storage key or full URL. Returns true on success.</summary>
    Task<bool> DeleteAsync(string filePath);

    /// <summary>Check if a file exists.</summary>
    Task<bool> ExistsAsync(string filePath);

    /// <summary>Write a stream to a specific key/path. Returns true on success.</summary>
    Task<bool> SaveFileAsync(string key, Stream content);

    /// <summary>Get the public URL for a file (CDN/S3 URL or local path).</summary>
    string GetPublicUrl(string filePath);

    /// <summary>
    /// Builds a fully-qualified storage key by prepending the configured root folder prefix.
    /// Example: "schools/{schoolId}/students/{id}/photos/x.jpg" →
    ///          "SMS-Test/schools/{schoolId}/students/{id}/photos/x.jpg"
    /// Use this when constructing keys for upload — pass the result to SaveFileAsync / GetPublicUrl.
    /// </summary>
    string BuildAssetKey(string relativePath);

    /// <summary>
    /// Generate a pre-signed PUT URL so the client can upload directly to storage,
    /// avoiding routing the binary through the API server.
    /// Returns (uploadUrl, storageKey).
    /// </summary>
    (string uploadUrl, string key) GetPresignedUploadUrl(
        string fileName, string folder, Guid schoolId, TimeSpan expiration, string? contentType = null);

    /// <summary>Generate a time-limited download URL for private files.</summary>
    string GetPresignedDownloadUrl(string filePath, TimeSpan expiration);
}

namespace SmsApi.Services;

/// <summary>
/// Local filesystem storage implementation.
/// Suitable for development and on-premises single-server deployments.
/// For production cloud deployments use S3FileStorageService.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly string _baseUrl;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(IConfiguration configuration, ILogger<LocalFileStorageService> logger)
    {
        _basePath = configuration["FileStorage:BasePath"]
            ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        _baseUrl = configuration["FileStorage:BaseUrl"] ?? "/files";
        _logger = logger;

        if (!Directory.Exists(_basePath))
            Directory.CreateDirectory(_basePath);
    }

    public async Task<bool> SaveFileAsync(string key, Stream content)
    {
        try
        {
            var fullPath = Path.Combine(_basePath, key);
            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            using var fs = new FileStream(fullPath, FileMode.Create);
            await content.CopyToAsync(fs);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save file at key {Key}", key);
            return false;
        }
    }

    public async Task<byte[]?> GetAsync(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_basePath, filePath);
            if (!File.Exists(fullPath)) return null;
            return await File.ReadAllBytesAsync(fullPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read file {FilePath}", filePath);
            return null;
        }
    }

    public Task<bool> DeleteAsync(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_basePath, filePath);
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                _logger.LogInformation("Deleted local file {FilePath}", filePath);
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {FilePath}", filePath);
            return Task.FromResult(false);
        }
    }

    public Task<bool> ExistsAsync(string filePath)
    {
        var fullPath = Path.Combine(_basePath, filePath);
        return Task.FromResult(File.Exists(fullPath));
    }

    public string GetPublicUrl(string filePath)
    {
        var urlPath = filePath.Replace('\\', '/').TrimStart('/');
        return $"{_baseUrl}/{urlPath}";
    }

    /// <summary>
    /// Local storage does not support pre-signed URLs.
    /// Returns the direct upload path for internal use.
    /// </summary>
    public (string uploadUrl, string key) GetPresignedUploadUrl(
        string fileName, string folder, Guid schoolId, TimeSpan expiration, string? contentType = null)
    {
        var extension = Path.GetExtension(fileName);
        var key = $"{schoolId}/{folder}/{Guid.NewGuid()}{extension}";
        // For local storage, the "upload URL" is just the API upload endpoint
        return ($"/api/documents/upload?key={Uri.EscapeDataString(key)}", key);
    }

    /// <summary>Local storage returns the public URL; no expiry enforcement.</summary>
    public string GetPresignedDownloadUrl(string filePath, TimeSpan expiration) =>
        GetPublicUrl(filePath);
}

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
        _basePath = Path.GetFullPath(
            configuration["FileStorage:BasePath"]
            ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads"));
        _baseUrl = configuration["FileStorage:BaseUrl"] ?? "/files";
        _logger = logger;

        if (!Directory.Exists(_basePath))
            Directory.CreateDirectory(_basePath);
    }

    /// <summary>
    /// Guards against path traversal attacks by verifying the resolved absolute path
    /// starts with the configured base path. Throws if the path escapes the root.
    /// </summary>
    private string ResolveAndGuard(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("File path must not be empty.");

        // Normalize separators and resolve to absolute
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, relativePath));

        // Ensure the resolved path is inside _basePath (path traversal guard)
        if (!fullPath.StartsWith(_basePath + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            && !fullPath.Equals(_basePath, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Path traversal attempt blocked. Attempted path: {Attempted}", relativePath);
            throw new UnauthorizedAccessException("Invalid file path.");
        }

        return fullPath;
    }

    public async Task<bool> SaveFileAsync(string key, Stream content)
    {
        try
        {
            var fullPath = ResolveAndGuard(key);
            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            using var fs = new FileStream(fullPath, FileMode.Create);
            await content.CopyToAsync(fs);
            return true;
        }
        catch (UnauthorizedAccessException)
        {
            throw; // Re-throw traversal attempts — callers should handle as 400/403
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
            var fullPath = ResolveAndGuard(filePath);
            if (!File.Exists(fullPath)) return null;
            return await File.ReadAllBytesAsync(fullPath);
        }
        catch (UnauthorizedAccessException)
        {
            throw;
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
            var fullPath = ResolveAndGuard(filePath);
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                _logger.LogInformation("Deleted local file {FilePath}", filePath);
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }
        catch (UnauthorizedAccessException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {FilePath}", filePath);
            return Task.FromResult(false);
        }
    }

    public Task<bool> ExistsAsync(string filePath)
    {
        try
        {
            var fullPath = ResolveAndGuard(filePath);
            return Task.FromResult(File.Exists(fullPath));
        }
        catch (UnauthorizedAccessException)
        {
            return Task.FromResult(false);
        }
    }

    public string GetPublicUrl(string filePath)
    {
        var urlPath = filePath.Replace('\\', '/').TrimStart('/');
        return $"{_baseUrl}/{urlPath}";
    }

    /// <summary>
    /// For local file storage, BuildAssetKey simply normalises the path separators.
    /// There is no root folder prefix — the base path is the root.
    /// </summary>
    public string BuildAssetKey(string relativePath) => relativePath.TrimStart('/').Replace('\\', '/');

    /// <summary>
    /// Local storage does not support pre-signed URLs.
    /// Returns the direct upload path for internal use.
    /// </summary>
    public (string uploadUrl, string key) GetPresignedUploadUrl(
        string fileName, string folder, Guid schoolId, TimeSpan expiration, string? contentType = null)
    {
        // Sanitize: take only the extension from the client-supplied filename, never the name itself
        var rawExtension = Path.GetExtension(fileName ?? string.Empty);
        var safeExtension = string.IsNullOrEmpty(rawExtension) ? string.Empty
            : "." + rawExtension.TrimStart('.').ToLowerInvariant().Replace("/", "").Replace("\\", "");

        var key = BuildAssetKey($"schools/{schoolId}/{folder}/{Guid.NewGuid()}{safeExtension}");
        // For local storage, the "upload URL" is just the API upload endpoint
        return ($"/api/documents/upload?key={Uri.EscapeDataString(key)}", key);
    }

    /// <summary>Local storage returns the public URL; no expiry enforcement.</summary>
    public string GetPresignedDownloadUrl(string filePath, TimeSpan expiration) =>
        GetPublicUrl(filePath);
}

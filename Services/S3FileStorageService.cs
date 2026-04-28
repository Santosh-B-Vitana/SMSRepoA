using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using SmsApi.Models;
using System.Net;

namespace SmsApi.Services;

/// <summary>
/// AWS S3 (and compatible: MinIO, LocalStack) file storage.
/// Configured by AwsSettings bound from appsettings.json / environment variables.
/// Falls back gracefully: if S3 is not configured, LocalFileStorageService is used instead.
/// </summary>
public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly AwsSettings _settings;
    private readonly ILogger<S3FileStorageService> _logger;

    public S3FileStorageService(
        IAmazonS3 s3,
        IOptions<AwsSettings> settings,
        ILogger<S3FileStorageService> logger)
    {
        _s3 = s3;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<byte[]?> GetAsync(string filePath)
    {
        try
        {
            var request = new GetObjectRequest { BucketName = _settings.BucketName, Key = filePath };
            using var response = await _s3.GetObjectAsync(request);
            using var ms = new MemoryStream();
            await response.ResponseStream.CopyToAsync(ms);
            return ms.ToArray();
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning("S3 file not found: {Key}", filePath);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file from S3: {Key}", filePath);
            return null;
        }
    }

    public async Task<bool> DeleteAsync(string filePath)
    {
        try
        {
            var request = new DeleteObjectRequest { BucketName = _settings.BucketName, Key = filePath };
            var response = await _s3.DeleteObjectAsync(request);
            return response.HttpStatusCode is HttpStatusCode.NoContent or HttpStatusCode.OK;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting S3 file: {Key}", filePath);
            return false;
        }
    }

    public async Task<bool> ExistsAsync(string filePath)
    {
        try
        {
            await _s3.GetObjectMetadataAsync(_settings.BucketName, filePath);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking S3 file existence: {Key}", filePath);
            return false;
        }
    }

    public async Task<bool> SaveFileAsync(string key, Stream content)
    {
        try
        {
            var request = new PutObjectRequest
            {
                BucketName = _settings.BucketName,
                Key = key,
                InputStream = content,
                AutoCloseStream = false
            };
            var response = await _s3.PutObjectAsync(request);
            return response.HttpStatusCode == HttpStatusCode.OK;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving file to S3 key {Key}", key);
            return false;
        }
    }

    public string GetPublicUrl(string key)
    {
        // MinIO / LocalStack custom service URL
        if (!string.IsNullOrEmpty(_settings.ServiceUrl))
            return $"{_settings.ServiceUrl.TrimEnd('/')}/{_settings.BucketName}/{key}";

        // Standard AWS S3 URL (ap-south-1 = Mumbai — default for India)
        return $"https://{_settings.BucketName}.s3.{_settings.Region}.amazonaws.com/{key}";
    }

    public (string uploadUrl, string key) GetPresignedUploadUrl(
        string fileName, string folder, Guid schoolId, TimeSpan expiration, string? contentType = null)
    {
        var extension = Path.GetExtension(fileName);
        var key = $"{schoolId}/{folder}/{Guid.NewGuid()}{extension}";

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _settings.BucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.Add(expiration)
        };

        if (!string.IsNullOrEmpty(contentType))
            request.ContentType = contentType;

        var url = _s3.GetPreSignedURL(request);
        return (url, key);
    }

    public string GetPresignedDownloadUrl(string filePath, TimeSpan expiration)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _settings.BucketName,
            Key = filePath,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(expiration)
        };
        return _s3.GetPreSignedURL(request);
    }
}

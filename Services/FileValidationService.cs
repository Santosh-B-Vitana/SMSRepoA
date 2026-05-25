using Microsoft.AspNetCore.Http;

namespace SmsApi.Services
{
    /// <summary>
    /// Service for validating uploaded files
    /// </summary>
    public interface IFileValidationService
    {
        Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(IFormFile file);
    }

    public class FileValidationService : IFileValidationService
    {
        private readonly string[] _allowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx", ".txt", ".csv", ".mp4", ".mov", ".webm", ".avi" };
        private const long MaxFileSizeBytes = 100 * 1024 * 1024; // 100MB

        public async Task<(bool IsValid, string? ErrorMessage)> ValidateAsync(IFormFile file)
        {
            if (file == null)
                return (false, "File is required");

            if (file.Length == 0)
                return (false, "File is empty");

            // Check size
            if (file.Length > MaxFileSizeBytes)
                return (false, $"File exceeds {MaxFileSizeBytes / (1024 * 1024)}MB limit");

            // Check extension
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (string.IsNullOrEmpty(extension) || !_allowedExtensions.Contains(extension))
                return (false, $"File extension '{extension}' is not allowed. Allowed: {string.Join(", ", _allowedExtensions)}");

            // Check MIME type
            if (!IsValidMimeType(file.ContentType, extension))
                return (false, $"File MIME type '{file.ContentType}' doesn't match extension '{extension}'");

            // Check file signature (magic numbers)
            try
            {
                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    var fileBytes = ms.ToArray();
                    
                    if (!IsValidFileSignature(fileBytes, extension))
                        return (false, "File signature validation failed - file may be corrupted or misnamed");
                }
            }
            catch (Exception ex) { return (false, $"Error reading file: {ex.Message}");
            }

            return (true, null);
        }

        private bool IsValidMimeType(string mimeType, string extension)
        {
            var validMimes = new Dictionary<string, string[]>
            {
                { ".pdf", new[] { "application/pdf" } },
                { ".jpg", new[] { "image/jpeg" } },
                { ".jpeg", new[] { "image/jpeg" } },
                { ".png", new[] { "image/png" } },
                { ".gif", new[] { "image/gif" } },
                { ".webp", new[] { "image/webp" } },
                { ".doc", new[] { "application/msword" } },
                { ".docx", new[] { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } },
                { ".txt", new[] { "text/plain" } },
                { ".csv", new[] { "text/csv", "application/csv", "text/comma-separated-values" } },
                { ".mp4", new[] { "video/mp4" } },
                { ".mov", new[] { "video/quicktime", "video/mp4" } },
                { ".webm", new[] { "video/webm" } },
                { ".avi", new[] { "video/x-msvideo", "video/avi" } }
            };

            if (!validMimes.ContainsKey(extension))
                return true; // Allow if not in validation list

            return validMimes[extension].Contains(mimeType);
        }

        private bool IsValidFileSignature(byte[] fileBytes, string extension)
        {
            if (fileBytes.Length < 4)
                return false;

            return extension switch
            {
                ".pdf" => fileBytes.Length >= 4 &&
                         fileBytes[0] == 0x25 && fileBytes[1] == 0x50 &&
                         fileBytes[2] == 0x44 && fileBytes[3] == 0x46, // %PDF
                         
                ".jpg" or ".jpeg" => fileBytes.Length >= 3 &&
                                    fileBytes[0] == 0xFF && fileBytes[1] == 0xD8 && fileBytes[2] == 0xFF, // JPG
                                    
                ".png" => fileBytes.Length >= 8 &&
                         fileBytes[0] == 0x89 && fileBytes[1] == 0x50 &&
                         fileBytes[2] == 0x4E && fileBytes[3] == 0x47, // PNG
                         
                ".doc" => fileBytes.Length >= 8 &&
                         fileBytes[0] == 0xD0 && fileBytes[1] == 0xCF &&
                         fileBytes[2] == 0x11 && fileBytes[3] == 0xE0, // OLE
                         
                ".docx" or ".txt" or ".csv" or ".gif" or ".webp" => true, // Less strict validation
                // MP4/MOV: 'ftyp' at byte offset 4
                ".mp4" or ".mov" => fileBytes.Length >= 8 &&
                                    fileBytes[4] == 0x66 && fileBytes[5] == 0x74 &&
                                    fileBytes[6] == 0x79 && fileBytes[7] == 0x70,
                // WebM: EBML header 0x1A 0x45 0xDF 0xA3
                ".webm" => fileBytes.Length >= 4 &&
                           fileBytes[0] == 0x1A && fileBytes[1] == 0x45 &&
                           fileBytes[2] == 0xDF && fileBytes[3] == 0xA3,
                // AVI: RIFF header
                ".avi" => fileBytes.Length >= 4 &&
                          fileBytes[0] == 0x52 && fileBytes[1] == 0x49 &&
                          fileBytes[2] == 0x46 && fileBytes[3] == 0x46,
                _ => true
            };
        }
    }
}

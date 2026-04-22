namespace SmsApi.Models
{
    public class FileStorageSettings
    {
        public string BasePath { get; set; } = "uploads";
        public int MaxFileSizeInMB { get; set; } = 10;
        public string[] AllowedExtensions { get; set; } = { ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx" };
    }
}
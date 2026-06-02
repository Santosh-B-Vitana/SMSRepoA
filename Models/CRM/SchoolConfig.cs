namespace SmsApi.Models.CRM
{
    public class SchoolConfig
    {
        public int SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string SchoolShortName { get; set; } = string.Empty;
        public string SchoolDomain { get; set; } = string.Empty;
        public string DBServer { get; set; } = string.Empty;
        public string DBName { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        // Navigation
        public ICollection<SchoolBilling> SchoolBillings { get; set; } = new List<SchoolBilling>();
    }
}

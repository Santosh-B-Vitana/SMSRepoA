namespace SmsApi.Models.CRM
{
    public class SchoolBillPayment
    {
        public Guid SchoolBillPaymentId { get; set; }
        public int SchoolId { get; set; }
        public Guid SchoolBillId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string CollectedBy { get; set; } = string.Empty;
        public DateTime AddedDate { get; set; }

        // Navigation
        public SchoolBilling SchoolBilling { get; set; } = null!;
    }
}

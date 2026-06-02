namespace SmsApi.Models.CRM
{
    public class SchoolBilling
    {
        public Guid SchoolBillId { get; set; }
        public int SchoolId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDueDate { get; set; }
        public bool IsPaid { get; set; }
        public bool IsActive { get; set; }

        // Navigation
        public SchoolConfig SchoolConfig { get; set; } = null!;
        public ICollection<SchoolBillPayment> SchoolBillPayments { get; set; } = new List<SchoolBillPayment>();
    }
}

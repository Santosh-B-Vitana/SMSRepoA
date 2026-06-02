using System;
using System.ComponentModel.DataAnnotations;

namespace SmsApi.Models.Entities
{
    public class School : BaseEntity
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string SchoolCode { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Address { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }
        
        [MaxLength(500)]
        public string? Logo { get; set; }
        
        public bool IsActive { get; set; } = true;

        // ── Billing ──────────────────────────────────────────────────────────
        /// <summary>Subscription plan: Standard, Pro, Enterprise</summary>
        [MaxLength(50)]
        public string BillingPlan { get; set; } = "Standard";

        /// <summary>Billing status: Active, Inactive, Suspended, Trial</summary>
        [MaxLength(20)]
        public string BillingStatus { get; set; } = "Active";

        /// <summary>Date the current subscription expires. Null = no expiry set.</summary>
        public DateTime? BillingExpiryDate { get; set; }

        /// <summary>Days before expiry at which renewal reminders are sent to admins.</summary>
        public int RenewalReminderDays { get; set; } = 30;
    }
}

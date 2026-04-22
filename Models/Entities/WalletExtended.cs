using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmsApi.Models.Entities
{
    // ========== WALLET BALANCE ==========
    public class WalletBalance : BaseEntity
    {
        [Required]
        public Guid SchoolId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string UserType { get; set; } = string.Empty; // Student, Staff, Parent
        
        [Required]
        public decimal Balance { get; set; } = 0;
        
        public decimal BlockedAmount { get; set; } = 0;
        
        public decimal AvailableBalance { get; set; } = 0;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // Active, Blocked, Suspended, Closed
        
        public DateTime? LastTransactionDate { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }
    }
}

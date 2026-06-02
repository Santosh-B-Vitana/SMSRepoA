using Microsoft.EntityFrameworkCore;
using SmsApi.Models.CRM;

namespace SmsApi.Data
{
    public class CrmDbContext : DbContext
    {
        public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
        {
        }

        public DbSet<SchoolConfig> SchoolConfigs { get; set; }
        public DbSet<SchoolBilling> SchoolBillings { get; set; }
        public DbSet<SchoolBillPayment> SchoolBillPayments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // SchoolConfig
            modelBuilder.Entity<SchoolConfig>(entity =>
            {
                entity.ToTable("SchoolConfig");
                entity.HasKey(e => e.SchoolId);
                entity.Property(e => e.SchoolId).ValueGeneratedOnAdd();
                entity.Property(e => e.SchoolName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.SchoolShortName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SchoolDomain).IsRequired().HasMaxLength(200);
                entity.Property(e => e.DBServer).IsRequired().HasMaxLength(200);
                entity.Property(e => e.DBName).IsRequired().HasMaxLength(200);
            });

            // SchoolBilling
            modelBuilder.Entity<SchoolBilling>(entity =>
            {
                entity.ToTable("SchoolBilling");
                entity.HasKey(e => e.SchoolBillId);
                entity.Property(e => e.SchoolBillId).HasDefaultValueSql("NEWID()");
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");

                entity.HasOne(e => e.SchoolConfig)
                      .WithMany(s => s.SchoolBillings)
                      .HasForeignKey(e => e.SchoolId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // SchoolBillPayment
            modelBuilder.Entity<SchoolBillPayment>(entity =>
            {
                entity.ToTable("SchoolBillPayment");
                entity.HasKey(e => e.SchoolBillPaymentId);
                entity.Property(e => e.SchoolBillPaymentId).HasDefaultValueSql("NEWID()");
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.PaymentMode).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CollectedBy).IsRequired().HasMaxLength(200);
                entity.Property(e => e.AddedDate)
                      .HasDefaultValueSql("GETDATE()");

                entity.HasOne(e => e.SchoolBilling)
                      .WithMany(b => b.SchoolBillPayments)
                      .HasForeignKey(e => e.SchoolBillId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}

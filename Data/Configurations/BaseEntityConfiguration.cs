using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmsApi.Models.Entities;

namespace SmsApi.Data.Configurations
{
    /// <summary>
    /// Base entity configuration for EF Core
    /// Applies soft delete query filters and other common settings
    /// </summary>
    public abstract class BaseEntityConfiguration<TEntity> : IEntityTypeConfiguration<TEntity>
        where TEntity : BaseEntity
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
            // Apply soft delete query filter
            // This ensures IsDeleted = false by default in all queries
            // Prevents accidental exposure of deleted data
            builder.HasQueryFilter(e => !e.IsDeleted);

            // Index on common query fields
            builder.HasIndex(e => e.CreatedAt);
            builder.HasIndex(e => e.UpdatedAt);
            builder.HasIndex(e => e.IsDeleted);

            // Configure timestamp/concurrency token
            builder.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();

            // Configure other properties
            builder.Property(e => e.CreatedAt)
                .ValueGeneratedOnAdd()
                .HasDefaultValueSql("GETUTCDATE()");

            builder.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("GETUTCDATE()");
        }
    }
}

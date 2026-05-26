using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmsApi.Data;

#nullable disable

namespace SmsApi.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260526130000_FixFeeStructureIsActiveData")]
    public partial class FixFeeStructureIsActiveData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The AddFeeStructureIsActive migration used defaultValue: false,
            // which set all existing rows to IsActive = 0. Fix them to 1 (active).
            migrationBuilder.Sql("UPDATE FeeStructures SET IsActive = 1 WHERE IsActive = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No rollback needed for this data fix.
        }

        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            // Data-only migration — model unchanged from AddFeeStructureIsActive.
        }
    }
}

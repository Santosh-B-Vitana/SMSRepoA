using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeStructureIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Guard against re-running if the column already exists (e.g. applied manually or by a previous run).
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'IsActive'
                      AND Object_ID = Object_ID(N'FeeStructures')
                )
                BEGIN
                    ALTER TABLE [FeeStructures] ADD [IsActive] bit NOT NULL DEFAULT 1
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE Name = N'IsActive'
                      AND Object_ID = Object_ID(N'FeeStructures')
                )
                BEGIN
                    ALTER TABLE [FeeStructures] DROP COLUMN [IsActive]
                END
            ");
        }
    }
}

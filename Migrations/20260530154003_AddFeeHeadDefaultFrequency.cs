using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeHeadDefaultFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'FeeHeads' AND COLUMN_NAME = 'DefaultFrequency'
                )
                BEGIN
                    ALTER TABLE [FeeHeads] ADD [DefaultFrequency] nvarchar(20) NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultFrequency",
                table: "FeeHeads");
        }
    }
}

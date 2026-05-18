using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeHeadOverridesColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FeeHeadOverrides",
                table: "FeeRecords",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeeHeadOverrides",
                table: "FeeRecords");
        }
    }
}

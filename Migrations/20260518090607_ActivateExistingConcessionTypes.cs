using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class ActivateExistingConcessionTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE ConcessionTypes SET IsActive = 1 WHERE IsActive = 0");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}

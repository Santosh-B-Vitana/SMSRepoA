using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileAppBranding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MobileAppBrandings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AppIconUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    SplashScreenUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: false),
                    AccentColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: false),
                    FontHeading = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FontBody = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    StoreShortDescription = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobileAppBrandings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MobileAppBrandings_SchoolId",
                table: "MobileAppBrandings",
                column: "SchoolId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MobileAppBrandings");
        }
    }
}

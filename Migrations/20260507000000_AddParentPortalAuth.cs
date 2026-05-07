using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddParentPortalAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- UserLogins: parent portal fields ---
            migrationBuilder.AddColumn<bool>(
                name: "RequirePasswordChange",
                table: "UserLogins",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LinkedEntityType",
                table: "UserLogins",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LinkedEntityId",
                table: "UserLogins",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequirePasswordChange",
                table: "UserLogins");

            migrationBuilder.DropColumn(
                name: "LinkedEntityType",
                table: "UserLogins");

            migrationBuilder.DropColumn(
                name: "LinkedEntityId",
                table: "UserLogins");
        }
    }
}

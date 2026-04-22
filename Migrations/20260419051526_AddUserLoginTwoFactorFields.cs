using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLoginTwoFactorFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TwoFactorChallengeExpiry",
                table: "UserLogins",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorChallengeToken",
                table: "UserLogins",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TwoFactorEnabled",
                table: "UserLogins",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorSecret",
                table: "UserLogins",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TwoFactorChallengeExpiry",
                table: "UserLogins");

            migrationBuilder.DropColumn(
                name: "TwoFactorChallengeToken",
                table: "UserLogins");

            migrationBuilder.DropColumn(
                name: "TwoFactorEnabled",
                table: "UserLogins");

            migrationBuilder.DropColumn(
                name: "TwoFactorSecret",
                table: "UserLogins");
        }
    }
}

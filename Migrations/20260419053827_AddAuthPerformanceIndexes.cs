using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserLogins_SchoolId",
                table: "UserLogins");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_Email",
                table: "UserLogins",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_SchoolId_Email",
                table: "UserLogins",
                columns: new[] { "SchoolId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_SchoolId_Status",
                table: "UserLogins",
                columns: new[] { "SchoolId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_SchoolId_Username",
                table: "UserLogins",
                columns: new[] { "SchoolId", "Username" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_TwoFactorChallengeExpiry",
                table: "UserLogins",
                column: "TwoFactorChallengeExpiry");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_ExpiresAt",
                table: "RefreshTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_ExpiresAt",
                table: "PasswordResetTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActionType",
                table: "AuditLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_SchoolId_Timestamp",
                table: "AuditLogs",
                columns: new[] { "SchoolId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId_Timestamp",
                table: "AuditLogs",
                columns: new[] { "UserId", "Timestamp" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserLogins_Email",
                table: "UserLogins");

            migrationBuilder.DropIndex(
                name: "IX_UserLogins_SchoolId_Email",
                table: "UserLogins");

            migrationBuilder.DropIndex(
                name: "IX_UserLogins_SchoolId_Status",
                table: "UserLogins");

            migrationBuilder.DropIndex(
                name: "IX_UserLogins_SchoolId_Username",
                table: "UserLogins");

            migrationBuilder.DropIndex(
                name: "IX_UserLogins_TwoFactorChallengeExpiry",
                table: "UserLogins");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_ExpiresAt",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_ExpiresAt",
                table: "PasswordResetTokens");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_ActionType",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_SchoolId_Timestamp",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_UserId_Timestamp",
                table: "AuditLogs");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_SchoolId",
                table: "UserLogins",
                column: "SchoolId");
        }
    }
}

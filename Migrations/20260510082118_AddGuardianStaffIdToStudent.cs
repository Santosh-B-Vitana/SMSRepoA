using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddGuardianStaffIdToStudent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GuardianStaffId",
                table: "Students",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Students_GuardianStaffId",
                table: "Students",
                column: "GuardianStaffId");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_StaffMembers_GuardianStaffId",
                table: "Students",
                column: "GuardianStaffId",
                principalTable: "StaffMembers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Students_StaffMembers_GuardianStaffId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Students_GuardianStaffId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "GuardianStaffId",
                table: "Students");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveDeductionToStaffAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LeaveDeducted",
                table: "StaffAttendances",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "LeaveTypeId",
                table: "StaffAttendances",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "RenewalReminderDays",
                table: "Schools",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 30);

            migrationBuilder.AlterColumn<string>(
                name: "BillingStatus",
                table: "Schools",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Active");

            migrationBuilder.AlterColumn<string>(
                name: "BillingPlan",
                table: "Schools",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Standard");

            migrationBuilder.CreateIndex(
                name: "IX_StaffAttendances_LeaveTypeId",
                table: "StaffAttendances",
                column: "LeaveTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_StaffAttendances_LeaveTypes_LeaveTypeId",
                table: "StaffAttendances",
                column: "LeaveTypeId",
                principalTable: "LeaveTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StaffAttendances_LeaveTypes_LeaveTypeId",
                table: "StaffAttendances");

            migrationBuilder.DropIndex(
                name: "IX_StaffAttendances_LeaveTypeId",
                table: "StaffAttendances");

            migrationBuilder.DropColumn(
                name: "LeaveDeducted",
                table: "StaffAttendances");

            migrationBuilder.DropColumn(
                name: "LeaveTypeId",
                table: "StaffAttendances");

            migrationBuilder.AlterColumn<int>(
                name: "RenewalReminderDays",
                table: "Schools",
                type: "int",
                nullable: false,
                defaultValue: 30,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "BillingStatus",
                table: "Schools",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "BillingPlan",
                table: "Schools",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Standard",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}

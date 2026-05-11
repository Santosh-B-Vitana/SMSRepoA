using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class FeeRecord_StudentEnrollmentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FeeRecords_SchoolId",
                table: "FeeRecords");

            migrationBuilder.AddColumn<Guid>(
                name: "StudentEnrollmentId",
                table: "FeeRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeeRecords_SchoolId_StudentId_StudentEnrollmentId",
                table: "FeeRecords",
                columns: new[] { "SchoolId", "StudentId", "StudentEnrollmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_FeeRecords_StudentEnrollmentId",
                table: "FeeRecords",
                column: "StudentEnrollmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeRecords_StudentEnrollments_StudentEnrollmentId",
                table: "FeeRecords",
                column: "StudentEnrollmentId",
                principalTable: "StudentEnrollments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeRecords_StudentEnrollments_StudentEnrollmentId",
                table: "FeeRecords");

            migrationBuilder.DropIndex(
                name: "IX_FeeRecords_SchoolId_StudentId_StudentEnrollmentId",
                table: "FeeRecords");

            migrationBuilder.DropIndex(
                name: "IX_FeeRecords_StudentEnrollmentId",
                table: "FeeRecords");

            migrationBuilder.DropColumn(
                name: "StudentEnrollmentId",
                table: "FeeRecords");

            migrationBuilder.CreateIndex(
                name: "IX_FeeRecords_SchoolId",
                table: "FeeRecords",
                column: "SchoolId");
        }
    }
}

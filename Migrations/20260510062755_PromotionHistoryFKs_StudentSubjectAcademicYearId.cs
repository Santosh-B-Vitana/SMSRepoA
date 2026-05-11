using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class PromotionHistoryFKs_StudentSubjectAcademicYearId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StudentSubjects_SchoolId",
                table: "StudentSubjects");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_SchoolId",
                table: "PromotionHistory");

            migrationBuilder.AddColumn<Guid>(
                name: "AcademicYearId",
                table: "StudentSubjects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StudentEnrollmentId",
                table: "StudentSubjects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AcademicYearId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "NewClassId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "NewSectionId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousClassId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreviousSectionId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ResultingEnrollmentId",
                table: "PromotionHistory",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_AcademicYearId",
                table: "StudentSubjects",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_SchoolId_StudentId_AcademicYearId",
                table: "StudentSubjects",
                columns: new[] { "SchoolId", "StudentId", "AcademicYearId" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_StudentEnrollmentId",
                table: "StudentSubjects",
                column: "StudentEnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_AcademicYearId",
                table: "PromotionHistory",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_NewClassId",
                table: "PromotionHistory",
                column: "NewClassId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_NewSectionId",
                table: "PromotionHistory",
                column: "NewSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_PreviousClassId",
                table: "PromotionHistory",
                column: "PreviousClassId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_PreviousSectionId",
                table: "PromotionHistory",
                column: "PreviousSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_ResultingEnrollmentId",
                table: "PromotionHistory",
                column: "ResultingEnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_SchoolId_StudentId_PromotionDate",
                table: "PromotionHistory",
                columns: new[] { "SchoolId", "StudentId", "PromotionDate" });

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_AcademicYears_AcademicYearId",
                table: "PromotionHistory",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_Classes_NewClassId",
                table: "PromotionHistory",
                column: "NewClassId",
                principalTable: "Classes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_Classes_PreviousClassId",
                table: "PromotionHistory",
                column: "PreviousClassId",
                principalTable: "Classes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_Sections_NewSectionId",
                table: "PromotionHistory",
                column: "NewSectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_Sections_PreviousSectionId",
                table: "PromotionHistory",
                column: "PreviousSectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionHistory_StudentEnrollments_ResultingEnrollmentId",
                table: "PromotionHistory",
                column: "ResultingEnrollmentId",
                principalTable: "StudentEnrollments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_StudentSubjects_AcademicYears_AcademicYearId",
                table: "StudentSubjects",
                column: "AcademicYearId",
                principalTable: "AcademicYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_StudentSubjects_StudentEnrollments_StudentEnrollmentId",
                table: "StudentSubjects",
                column: "StudentEnrollmentId",
                principalTable: "StudentEnrollments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_AcademicYears_AcademicYearId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_Classes_NewClassId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_Classes_PreviousClassId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_Sections_NewSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_Sections_PreviousSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionHistory_StudentEnrollments_ResultingEnrollmentId",
                table: "PromotionHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentSubjects_AcademicYears_AcademicYearId",
                table: "StudentSubjects");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentSubjects_StudentEnrollments_StudentEnrollmentId",
                table: "StudentSubjects");

            migrationBuilder.DropIndex(
                name: "IX_StudentSubjects_AcademicYearId",
                table: "StudentSubjects");

            migrationBuilder.DropIndex(
                name: "IX_StudentSubjects_SchoolId_StudentId_AcademicYearId",
                table: "StudentSubjects");

            migrationBuilder.DropIndex(
                name: "IX_StudentSubjects_StudentEnrollmentId",
                table: "StudentSubjects");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_AcademicYearId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_NewClassId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_NewSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_PreviousClassId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_PreviousSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_ResultingEnrollmentId",
                table: "PromotionHistory");

            migrationBuilder.DropIndex(
                name: "IX_PromotionHistory_SchoolId_StudentId_PromotionDate",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "StudentSubjects");

            migrationBuilder.DropColumn(
                name: "StudentEnrollmentId",
                table: "StudentSubjects");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "NewClassId",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "NewSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "PreviousClassId",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "PreviousSectionId",
                table: "PromotionHistory");

            migrationBuilder.DropColumn(
                name: "ResultingEnrollmentId",
                table: "PromotionHistory");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_SchoolId",
                table: "StudentSubjects",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionHistory_SchoolId",
                table: "PromotionHistory",
                column: "SchoolId");
        }
    }
}

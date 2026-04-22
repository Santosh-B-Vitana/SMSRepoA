using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class IndustryGradeAcademicsExam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PracticalMaxMarks",
                table: "Subjects",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectTypeId",
                table: "Subjects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TheoryMaxMarks",
                table: "Subjects",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MarksObtained",
                table: "ExamResults",
                type: "numeric(6,2)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<decimal>(
                name: "InternalMarks",
                table: "ExamResults",
                type: "numeric(6,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAbsent",
                table: "ExamResults",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPass",
                table: "ExamResults",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PracticalMarks",
                table: "ExamResults",
                type: "numeric(6,2)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectId",
                table: "ExamResults",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TheoryMarks",
                table: "ExamResults",
                type: "numeric(6,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AcademicYear",
                table: "Examinations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Duration",
                table: "Examinations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EndTime",
                table: "Examinations",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InvigilatorId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StartTime",
                table: "Examinations",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Term",
                table: "Examinations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Venue",
                table: "Examinations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AcademicYear",
                table: "ClassSubjects",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PracticalMaxMarks",
                table: "ClassSubjects",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectTypeId",
                table: "ClassSubjects",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TheoryMaxMarks",
                table: "ClassSubjects",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_SubjectTypeId",
                table: "Subjects",
                column: "SubjectTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamResults_SubjectId",
                table: "ExamResults",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_InvigilatorId",
                table: "Examinations",
                column: "InvigilatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_SectionId",
                table: "Examinations",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSubjects_SubjectTypeId",
                table: "ClassSubjects",
                column: "SubjectTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_ClassSubjects_SubjectTypes_SubjectTypeId",
                table: "ClassSubjects",
                column: "SubjectTypeId",
                principalTable: "SubjectTypes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_Sections_SectionId",
                table: "Examinations",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_StaffMembers_InvigilatorId",
                table: "Examinations",
                column: "InvigilatorId",
                principalTable: "StaffMembers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ExamResults_Subjects_SubjectId",
                table: "ExamResults",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_SubjectTypes_SubjectTypeId",
                table: "Subjects",
                column: "SubjectTypeId",
                principalTable: "SubjectTypes",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClassSubjects_SubjectTypes_SubjectTypeId",
                table: "ClassSubjects");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_Sections_SectionId",
                table: "Examinations");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_StaffMembers_InvigilatorId",
                table: "Examinations");

            migrationBuilder.DropForeignKey(
                name: "FK_ExamResults_Subjects_SubjectId",
                table: "ExamResults");

            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_SubjectTypes_SubjectTypeId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_SubjectTypeId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_ExamResults_SubjectId",
                table: "ExamResults");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_InvigilatorId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_SectionId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_ClassSubjects_SubjectTypeId",
                table: "ClassSubjects");

            migrationBuilder.DropColumn(
                name: "PracticalMaxMarks",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "SubjectTypeId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "TheoryMaxMarks",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "InternalMarks",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "IsAbsent",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "IsPass",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "PracticalMarks",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "TheoryMarks",
                table: "ExamResults");

            migrationBuilder.DropColumn(
                name: "AcademicYear",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Duration",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "InvigilatorId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Term",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Venue",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "AcademicYear",
                table: "ClassSubjects");

            migrationBuilder.DropColumn(
                name: "PracticalMaxMarks",
                table: "ClassSubjects");

            migrationBuilder.DropColumn(
                name: "SubjectTypeId",
                table: "ClassSubjects");

            migrationBuilder.DropColumn(
                name: "TheoryMaxMarks",
                table: "ClassSubjects");

            migrationBuilder.AlterColumn<int>(
                name: "MarksObtained",
                table: "ExamResults",
                type: "integer",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(6,2)");
        }
    }
}

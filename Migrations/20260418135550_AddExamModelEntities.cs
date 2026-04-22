using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExamModelEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClassId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExamTypeId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectTypeId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Board",
                table: "Classes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "AlumniMeets",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExamTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DefaultMaxMarks = table.Column<int>(type: "integer", nullable: false),
                    ExamsPerTerm = table.Column<int>(type: "integer", nullable: false),
                    IsUnitTest = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamTypes_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubjectTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubjectTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubjectTypes_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StudentSubjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectTypeId = table.Column<Guid>(type: "uuid", nullable: true),
                    AcademicYear = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsMandatory = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentSubjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentSubjects_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentSubjects_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentSubjects_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentSubjects_SubjectTypes_SubjectTypeId",
                        column: x => x.SubjectTypeId,
                        principalTable: "SubjectTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_StudentSubjects_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_ClassId",
                table: "Examinations",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_ExamTypeId",
                table: "Examinations",
                column: "ExamTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_SubjectId",
                table: "Examinations",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_SubjectTypeId",
                table: "Examinations",
                column: "SubjectTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamTypes_SchoolId",
                table: "ExamTypes",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_ClassId",
                table: "StudentSubjects",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_SchoolId",
                table: "StudentSubjects",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_StudentId",
                table: "StudentSubjects",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_SubjectId",
                table: "StudentSubjects",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentSubjects_SubjectTypeId",
                table: "StudentSubjects",
                column: "SubjectTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_SubjectTypes_SchoolId",
                table: "SubjectTypes",
                column: "SchoolId");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_Classes_ClassId",
                table: "Examinations",
                column: "ClassId",
                principalTable: "Classes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_ExamTypes_ExamTypeId",
                table: "Examinations",
                column: "ExamTypeId",
                principalTable: "ExamTypes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_SubjectTypes_SubjectTypeId",
                table: "Examinations",
                column: "SubjectTypeId",
                principalTable: "SubjectTypes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_Subjects_SubjectId",
                table: "Examinations",
                column: "SubjectId",
                principalTable: "Subjects",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_Classes_ClassId",
                table: "Examinations");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_ExamTypes_ExamTypeId",
                table: "Examinations");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_SubjectTypes_SubjectTypeId",
                table: "Examinations");

            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_Subjects_SubjectId",
                table: "Examinations");

            migrationBuilder.DropTable(
                name: "ExamTypes");

            migrationBuilder.DropTable(
                name: "StudentSubjects");

            migrationBuilder.DropTable(
                name: "SubjectTypes");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_ClassId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_ExamTypeId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_SubjectId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_SubjectTypeId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "ExamTypeId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "SubjectTypeId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "Board",
                table: "Classes");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "AlumniMeets");
        }
    }
}

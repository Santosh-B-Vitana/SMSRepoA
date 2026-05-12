using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExamSetupModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ExamSetupId",
                table: "ReportCards",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExamSetups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ExamTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsCustomType = table.Column<bool>(type: "bit", nullable: false),
                    CustomTypeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BoardConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Term = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamSetups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamSetups_BoardConfigurations_BoardConfigurationId",
                        column: x => x.BoardConfigurationId,
                        principalTable: "BoardConfigurations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExamSetups_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamSetups_ExamTypes_ExamTypeId",
                        column: x => x.ExamTypeId,
                        principalTable: "ExamTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExamSetups_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExamSetups_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExamSetupSubjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExamSetupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsElective = table.Column<bool>(type: "bit", nullable: false),
                    MaxTheoryMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    MaxPracticalMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    MaxInternalMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    MaxTotalMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    PassingMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    AssignedStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExamDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    EndTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Venue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SubjectOrder = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamSetupSubjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamSetupSubjects_ExamSetups_ExamSetupId",
                        column: x => x.ExamSetupId,
                        principalTable: "ExamSetups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamSetupSubjects_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExamSetupSubjects_StaffMembers_AssignedStaffId",
                        column: x => x.AssignedStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExamSetupSubjects_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExamMarksEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExamSetupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExamSetupSubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TheoryMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    PracticalMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    InternalMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
                    ObtainedMarks = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    IsAbsent = table.Column<bool>(type: "bit", nullable: false),
                    Grade = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    GradePoint = table.Column<decimal>(type: "decimal(4,2)", nullable: true),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    IsPass = table.Column<bool>(type: "bit", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EnteredByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EnteredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamMarksEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamMarksEntries_ExamSetupSubjects_ExamSetupSubjectId",
                        column: x => x.ExamSetupSubjectId,
                        principalTable: "ExamSetupSubjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamMarksEntries_ExamSetups_ExamSetupId",
                        column: x => x.ExamSetupId,
                        principalTable: "ExamSetups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExamMarksEntries_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExamMarksEntries_StaffMembers_EnteredByStaffId",
                        column: x => x.EnteredByStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExamMarksEntries_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExamMarksEntries_EnteredByStaffId",
                table: "ExamMarksEntries",
                column: "EnteredByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamMarksEntries_ExamSetupId",
                table: "ExamMarksEntries",
                column: "ExamSetupId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamMarksEntries_ExamSetupSubjectId",
                table: "ExamMarksEntries",
                column: "ExamSetupSubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamMarksEntries_SchoolId",
                table: "ExamMarksEntries",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamMarksEntries_StudentId",
                table: "ExamMarksEntries",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetups_BoardConfigurationId",
                table: "ExamSetups",
                column: "BoardConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetups_ClassId",
                table: "ExamSetups",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetups_ExamTypeId",
                table: "ExamSetups",
                column: "ExamTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetups_SchoolId",
                table: "ExamSetups",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetups_SectionId",
                table: "ExamSetups",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetupSubjects_AssignedStaffId",
                table: "ExamSetupSubjects",
                column: "AssignedStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetupSubjects_ExamSetupId",
                table: "ExamSetupSubjects",
                column: "ExamSetupId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetupSubjects_SchoolId",
                table: "ExamSetupSubjects",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSetupSubjects_SubjectId",
                table: "ExamSetupSubjects",
                column: "SubjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExamMarksEntries");

            migrationBuilder.DropTable(
                name: "ExamSetupSubjects");

            migrationBuilder.DropTable(
                name: "ExamSetups");

            migrationBuilder.DropColumn(
                name: "ExamSetupId",
                table: "ReportCards");
        }
    }
}

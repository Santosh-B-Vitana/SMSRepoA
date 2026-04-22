using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BoardConfigurationId",
                table: "Classes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BoardConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    BoardLevel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    StateCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    TheoryPassingPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    PracticalPassingPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    OverallPassingPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    GradingScaleJson = table.Column<string>(type: "text", nullable: false),
                    MaxGradePoint = table.Column<decimal>(type: "numeric", nullable: false),
                    GradingSystem = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ExamStructureJson = table.Column<string>(type: "text", nullable: false),
                    IsSystemBoard = table.Column<bool>(type: "boolean", nullable: false),
                    IsCustomizable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_BoardConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BoardConfigurations_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SchoolBoardConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    BoardConfigurationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYear = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CustomOverallPassingPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    CustomTheoryPassingPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    CustomPracticalPassingPercentage = table.Column<decimal>(type: "numeric", nullable: true),
                    CustomGradingScaleJson = table.Column<string>(type: "text", nullable: true),
                    CustomExamStructureJson = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_SchoolBoardConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolBoardConfigs_BoardConfigurations_BoardConfigurationId",
                        column: x => x.BoardConfigurationId,
                        principalTable: "BoardConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SchoolBoardConfigs_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "BoardConfigurations",
                columns: new[] { "Id", "BoardLevel", "Code", "CreatedAt", "CreatedBy", "DeletedAt", "Description", "ExamStructureJson", "GradingScaleJson", "GradingSystem", "IsActive", "IsCustomizable", "IsDeleted", "IsSystemBoard", "MaxGradePoint", "Name", "OverallPassingPercentage", "PracticalPassingPercentage", "SchoolId", "StateCode", "TheoryPassingPercentage", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { new Guid("a0000001-0000-0000-0000-000000000001"), "National", "CBSE", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "National board governed by NCERT. Follows CCE pattern with Periodic Tests, Half-Yearly and Annual exams.", "[{\"code\":\"PT1\",\"name\":\"Periodic Test 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":40},{\"code\":\"PT2\",\"name\":\"Periodic Test 2\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":40},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":80},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":80}]", "[{\"grade\":\"A1\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"E1\",\"minPercentage\":21,\"maxPercentage\":32,\"gradePoint\":3.0,\"description\":\"Needs Improvement\",\"isPassing\":false},{\"grade\":\"E2\",\"minPercentage\":0,\"maxPercentage\":20,\"gradePoint\":2.0,\"description\":\"Unsatisfactory\",\"isPassing\":false}]", "A1-E2", true, false, false, true, 10m, "Central Board of Secondary Education (CBSE)", 33m, 33m, null, null, 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000002"), "National", "ICSE", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Class 10 board under CISCE. Internal Assessment 50% + External Exam 50%.", "[{\"code\":\"IA\",\"name\":\"Internal Assessment\",\"weightagePercent\":50,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"EXT\",\"name\":\"External Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A1\",\"minPercentage\":95,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":90,\"maxPercentage\":94,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":85,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":80,\"maxPercentage\":84,\"gradePoint\":7.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":6.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":5.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"D1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"D2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":3.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":2.0,\"description\":\"Eligible for Compartment\",\"isPassing\":false},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A1-F", true, false, false, true, 10m, "Indian Certificate of Secondary Education (ICSE)", 35m, 35m, null, null, 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000003"), "National", "ISC", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Class 11-12 board under CISCE. Theory + Practical components.", "[{\"code\":\"TERM1\",\"name\":\"Term 1 (Internal)\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"TERM2\",\"name\":\"Term 2 (Board Exam)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":75,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":60,\"maxPercentage\":74,\"gradePoint\":6.5,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":45,\"maxPercentage\":59,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":35,\"maxPercentage\":44,\"gradePoint\":3.5,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A-F", true, false, false, true, 10m, "Indian School Certificate (ISC)", 35m, 35m, null, null, 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000004"), "International", "IB", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "IB Diploma Programme. 1-7 grade scale per subject. Max 45 points total.", "[{\"code\":\"IA\",\"name\":\"Internal Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":100},{\"code\":\"EXT\",\"name\":\"External Examination (May/November)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"7\",\"minPercentage\":86,\"maxPercentage\":100,\"gradePoint\":7.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"6\",\"minPercentage\":72,\"maxPercentage\":85,\"gradePoint\":6.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"5\",\"minPercentage\":58,\"maxPercentage\":71,\"gradePoint\":5.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"4\",\"minPercentage\":44,\"maxPercentage\":57,\"gradePoint\":4.0,\"description\":\"Satisfactory\",\"isPassing\":true},{\"grade\":\"3\",\"minPercentage\":30,\"maxPercentage\":43,\"gradePoint\":3.0,\"description\":\"Mediocre\",\"isPassing\":false},{\"grade\":\"2\",\"minPercentage\":16,\"maxPercentage\":29,\"gradePoint\":2.0,\"description\":\"Poor\",\"isPassing\":false},{\"grade\":\"1\",\"minPercentage\":0,\"maxPercentage\":15,\"gradePoint\":1.0,\"description\":\"Very Poor\",\"isPassing\":false}]", "1-7", true, false, false, true, 7m, "International Baccalaureate (IB)", 40m, 40m, null, null, 40m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000005"), "International", "CAIE", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Cambridge IGCSE / A-Level. Grades A*-E for pass, U for ungraded.", "[{\"code\":\"COMP1\",\"name\":\"Component 1 (Theory)\",\"weightagePercent\":60,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"COMP2\",\"name\":\"Component 2 (Practical / Coursework)\",\"weightagePercent\":40,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":60}]", "[{\"grade\":\"A*\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":9.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":8.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":7.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":6.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":5.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":4.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"U\",\"minPercentage\":0,\"maxPercentage\":39,\"gradePoint\":0.0,\"description\":\"Ungraded\",\"isPassing\":false}]", "A*-U", true, false, false, true, 9m, "Cambridge Assessment International Education (CAIE)", 40m, 40m, null, null, 40m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000006"), "State", "STATE-MH", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Maharashtra State Board of Secondary & Higher Secondary Education.", "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"PRELIM\",\"name\":\"Preliminary Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"BOARD\",\"name\":\"Board Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"O\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A+\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "O-F", true, true, false, true, 10m, "Maharashtra State Board (MSBSHSE)", 35m, 35m, null, "MH", 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000007"), "State", "STATE-TN", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Tamil Nadu Board of Secondary Education.", "[{\"code\":\"UT1\",\"name\":\"Unit Test 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"UT2\",\"name\":\"Unit Test 2\",\"weightagePercent\":10,\"term\":2,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":40,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"U\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A+-U", true, true, false, true, 10m, "Tamil Nadu State Board (TNBSE)", 35m, 35m, null, "TN", 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000008"), "State", "STATE-KA", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Karnataka State Board for Classes 1-12.", "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA1\",\"name\":\"Summative Assessment 1\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"SA2\",\"name\":\"Summative Assessment 2 (Board)\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A1\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A1-F", true, true, false, true, 10m, "Karnataka Secondary Education Examination Board (KSEEB)", 35m, 35m, null, "KA", 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000009"), "State", "STATE-AP", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Common grading for AP and Telangana State Boards.", "[{\"code\":\"FA1\",\"name\":\"Formative Assessment 1\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"FA2\",\"name\":\"Formative Assessment 2\",\"weightagePercent\":10,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA1\",\"name\":\"Summative Assessment 1\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"SA2\",\"name\":\"Summative Assessment 2 (Board)\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":35,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":34,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A+-F", true, true, false, true, 10m, "Andhra Pradesh / Telangana State Board (BSEAP/BSETS)", 35m, 35m, null, "AP", 35m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000010"), "State", "STATE-GJ", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Gujarat State Board.", "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":30,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA\",\"name\":\"Summative Assessment (Board)\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A1\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A2\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":3.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A1-F", true, true, false, true, 10m, "Gujarat Secondary and Higher Secondary Education Board (GSEB)", 33m, 33m, null, "GJ", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000011"), "State", "STATE-RJ", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Rajasthan State Board.", "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":30,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"SA\",\"name\":\"Summative Assessment (Board)\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A+\",\"minPercentage\":80,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":49,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A+-E", true, true, false, true, 10m, "Board of Secondary Education Rajasthan (RBSE)", 33m, 33m, null, "RJ", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000012"), "State", "STATE-UP", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "UP Board of High School and Intermediate Education.", "[{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"BOARD\",\"name\":\"Board Examination\",\"weightagePercent\":70,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"D1\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"D2\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B1\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B2\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"B3\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"C1\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Below Average\",\"isPassing\":true},{\"grade\":\"C2\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "D1-F", true, true, false, true, 10m, "Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP)", 33m, 33m, null, "UP", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000013"), "State", "STATE-MP", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "MP State Board for Classes 9-12.", "[{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":20,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"ANNUAL\",\"name\":\"Annual/Board Examination\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A+\",\"minPercentage\":91,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":81,\"maxPercentage\":90,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":71,\"maxPercentage\":80,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":61,\"maxPercentage\":70,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":51,\"maxPercentage\":60,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":41,\"maxPercentage\":50,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":40,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A+-F", true, true, false, true, 10m, "Madhya Pradesh Board of Secondary Education (MPBSE)", 33m, 33m, null, "MP", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000014"), "State", "STATE-WB", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "West Bengal State Board for Classes 1-12.", "[{\"code\":\"FA\",\"name\":\"Formative Assessment\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination (Board)\",\"weightagePercent\":80,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"★\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Star Distinction\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Third Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "Star-F", true, true, false, true, 10m, "West Bengal Board of Secondary Education (WBBSE)", 33m, 33m, null, "WB", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("a0000001-0000-0000-0000-000000000015"), "State", "STATE-KL", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Kerala State Curriculum for Classes 1-12 (SCERT + DHSE).", "[{\"code\":\"CE\",\"name\":\"Continuous Evaluation\",\"weightagePercent\":20,\"term\":1,\"isInternal\":true,\"defaultMaxMarks\":50},{\"code\":\"HALF\",\"name\":\"Half-Yearly Examination\",\"weightagePercent\":30,\"term\":1,\"isInternal\":false,\"defaultMaxMarks\":100},{\"code\":\"ANNUAL\",\"name\":\"Annual Examination\",\"weightagePercent\":50,\"term\":2,\"isInternal\":false,\"defaultMaxMarks\":100}]", "[{\"grade\":\"A+\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Outstanding\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Excellent\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"Very Good\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Good\",\"isPassing\":true},{\"grade\":\"C+\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Above Average\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Average\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]", "A+-E", true, true, false, true, 10m, "Kerala Board (SCERT / DHSE)", 33m, 33m, null, "KL", 33m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Classes_BoardConfigurationId",
                table: "Classes",
                column: "BoardConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_BoardConfigurations_Code",
                table: "BoardConfigurations",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_BoardConfigurations_SchoolId",
                table: "BoardConfigurations",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolBoardConfigs_BoardConfigurationId",
                table: "SchoolBoardConfigs",
                column: "BoardConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolBoardConfigs_SchoolId_AcademicYear_IsActive",
                table: "SchoolBoardConfigs",
                columns: new[] { "SchoolId", "AcademicYear", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_Classes_BoardConfigurations_BoardConfigurationId",
                table: "Classes",
                column: "BoardConfigurationId",
                principalTable: "BoardConfigurations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Classes_BoardConfigurations_BoardConfigurationId",
                table: "Classes");

            migrationBuilder.DropTable(
                name: "SchoolBoardConfigs");

            migrationBuilder.DropTable(
                name: "BoardConfigurations");

            migrationBuilder.DropIndex(
                name: "IX_Classes_BoardConfigurationId",
                table: "Classes");

            migrationBuilder.DropColumn(
                name: "BoardConfigurationId",
                table: "Classes");
        }
    }
}

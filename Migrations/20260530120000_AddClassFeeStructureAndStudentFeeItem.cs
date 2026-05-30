using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddClassFeeStructureAndStudentFeeItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Add FeeTermId + DueDate columns to FeeStructureComponents ──────
            migrationBuilder.AddColumn<Guid>(
                name: "FeeTermId",
                table: "FeeStructureComponents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "FeeStructureComponents",
                type: "datetime2",
                nullable: true);

            // Drop the old unique index (FeeStructureId, FeeHeadId) and replace with
            // (FeeStructureId, FeeHeadId, FeeTermId) so the same head can appear in
            // multiple terms with different amounts.
            migrationBuilder.DropIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeHeadId",
                table: "FeeStructureComponents");

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId",
                table: "FeeStructureComponents",
                columns: new[] { "FeeStructureId", "FeeHeadId", "FeeTermId" },
                unique: true,
                filter: "[FeeTermId] IS NOT NULL");

            // Also index the FK
            migrationBuilder.CreateIndex(
                name: "IX_FeeStructureComponents_FeeTermId",
                table: "FeeStructureComponents",
                column: "FeeTermId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructureComponents_FeeTerms_FeeTermId",
                table: "FeeStructureComponents",
                column: "FeeTermId",
                principalTable: "FeeTerms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ── 2. ClassFeeStructure table ────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "ClassFeeStructures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeeStructureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
                    table.PrimaryKey("PK_ClassFeeStructures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassFeeStructures_FeeStructures_FeeStructureId",
                        column: x => x.FeeStructureId,
                        principalTable: "FeeStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassFeeStructures_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassFeeStructures_FeeStructureId",
                table: "ClassFeeStructures",
                column: "FeeStructureId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassFeeStructures_SchoolId_ClassName_AcademicYear",
                table: "ClassFeeStructures",
                columns: new[] { "SchoolId", "ClassName", "AcademicYear" },
                unique: true,
                filter: "[IsDeleted] = 0");

            // ── 3. StudentFeeItem table ───────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "StudentFeeItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeeStructureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeeStructureComponentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DiscountType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Others"),
                    DiscountPercentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 0m),
                    FlatAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
                    table.PrimaryKey("PK_StudentFeeItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentFeeItems_FeeStructureComponents_FeeStructureComponentId",
                        column: x => x.FeeStructureComponentId,
                        principalTable: "FeeStructureComponents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StudentFeeItems_FeeStructures_FeeStructureId",
                        column: x => x.FeeStructureId,
                        principalTable: "FeeStructures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentFeeItems_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentFeeItems_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeItems_StudentId_FeeStructureId_FeeStructureComponentId_AcademicYear",
                table: "StudentFeeItems",
                columns: new[] { "StudentId", "FeeStructureId", "FeeStructureComponentId", "AcademicYear" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "StudentFeeItems");
            migrationBuilder.DropTable(name: "ClassFeeStructures");

            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructureComponents_FeeTerms_FeeTermId",
                table: "FeeStructureComponents");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructureComponents_FeeTermId",
                table: "FeeStructureComponents");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId",
                table: "FeeStructureComponents");

            migrationBuilder.DropColumn(name: "FeeTermId", table: "FeeStructureComponents");
            migrationBuilder.DropColumn(name: "DueDate", table: "FeeStructureComponents");

            // Restore original unique index
            migrationBuilder.CreateIndex(
                name: "IX_FeeStructureComponents_FeeStructureId_FeeHeadId",
                table: "FeeStructureComponents",
                columns: new[] { "FeeStructureId", "FeeHeadId" },
                unique: true);
        }
    }
}

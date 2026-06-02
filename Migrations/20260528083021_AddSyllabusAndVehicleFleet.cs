using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSyllabusAndVehicleFleet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LinkedEntityId",
                table: "User",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DropStopId",
                table: "TransportStudents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PickupStopId",
                table: "TransportStudents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VehicleId",
                table: "TransportRoutes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "FeeStructures",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.CreateTable(
                name: "SyllabusUnits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    UnitNumber = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PlannedHours = table.Column<int>(type: "int", nullable: true),
                    PlannedStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlannedEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TotalTopics = table.Column<int>(type: "int", nullable: false),
                    CompletedTopics = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("PK_SyllabusUnits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SyllabusUnits_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SyllabusUnits_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SyllabusUnits_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TransportStops",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RouteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StopName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StopOrder = table.Column<int>(type: "int", nullable: false),
                    Landmark = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    MorningArrivalTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    EveningDepartureTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    DistanceKm = table.Column<decimal>(type: "decimal(6,2)", nullable: true),
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
                    table.PrimaryKey("PK_TransportStops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransportStops_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransportStops_TransportRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "TransportRoutes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RegistrationNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Make = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: true),
                    VehicleType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SeatingCapacity = table.Column<int>(type: "int", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    FuelType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    FitnessCertExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InsuranceExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PUCExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RoadTaxExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PermitExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastServiceDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextServiceDue = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OdometerKm = table.Column<int>(type: "int", nullable: true),
                    DriverStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DriverName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DriverPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DriverLicenseNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DriverLicenseExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vehicles_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Vehicles_StaffMembers_DriverStaffId",
                        column: x => x.DriverStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SyllabusTopics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TopicNumber = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: true),
                    ResourceReferences = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CompletionRemarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("PK_SyllabusTopics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SyllabusTopics_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SyllabusTopics_StaffMembers_CompletedByStaffId",
                        column: x => x.CompletedByStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SyllabusTopics_SyllabusUnits_UnitId",
                        column: x => x.UnitId,
                        principalTable: "SyllabusUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LessonPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TopicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodNumber = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    LearningObjectives = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TeachingMethods = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Resources = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClassActivities = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Homework = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ApprovedByStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_LessonPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonPlans_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LessonPlans_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LessonPlans_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LessonPlans_StaffMembers_ApprovedByStaffId",
                        column: x => x.ApprovedByStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LessonPlans_StaffMembers_StaffId",
                        column: x => x.StaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LessonPlans_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LessonPlans_SyllabusTopics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "SyllabusTopics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudents_DropStopId",
                table: "TransportStudents",
                column: "DropStopId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStudents_PickupStopId",
                table: "TransportStudents",
                column: "PickupStopId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportRoutes_VehicleId",
                table: "TransportRoutes",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_ApprovedByStaffId",
                table: "LessonPlans",
                column: "ApprovedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_ClassId",
                table: "LessonPlans",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_SchoolId_ClassId_Date",
                table: "LessonPlans",
                columns: new[] { "SchoolId", "ClassId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_SchoolId_StaffId_Date",
                table: "LessonPlans",
                columns: new[] { "SchoolId", "StaffId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_SectionId",
                table: "LessonPlans",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_StaffId",
                table: "LessonPlans",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_SubjectId",
                table: "LessonPlans",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonPlans_TopicId",
                table: "LessonPlans",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusTopics_CompletedByStaffId",
                table: "SyllabusTopics",
                column: "CompletedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusTopics_SchoolId",
                table: "SyllabusTopics",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusTopics_UnitId_TopicNumber",
                table: "SyllabusTopics",
                columns: new[] { "UnitId", "TopicNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusUnits_ClassId",
                table: "SyllabusUnits",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusUnits_SchoolId_ClassId_SubjectId_AcademicYear_UnitNumber",
                table: "SyllabusUnits",
                columns: new[] { "SchoolId", "ClassId", "SubjectId", "AcademicYear", "UnitNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyllabusUnits_SubjectId",
                table: "SyllabusUnits",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportStops_RouteId_StopOrder",
                table: "TransportStops",
                columns: new[] { "RouteId", "StopOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransportStops_SchoolId",
                table: "TransportStops",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_DriverStaffId",
                table: "Vehicles",
                column: "DriverStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_SchoolId_RegistrationNumber",
                table: "Vehicles",
                columns: new[] { "SchoolId", "RegistrationNumber" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TransportRoutes_Vehicles_VehicleId",
                table: "TransportRoutes",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TransportStudents_TransportStops_DropStopId",
                table: "TransportStudents",
                column: "DropStopId",
                principalTable: "TransportStops",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_TransportStudents_TransportStops_PickupStopId",
                table: "TransportStudents",
                column: "PickupStopId",
                principalTable: "TransportStops",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TransportRoutes_Vehicles_VehicleId",
                table: "TransportRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_TransportStudents_TransportStops_DropStopId",
                table: "TransportStudents");

            migrationBuilder.DropForeignKey(
                name: "FK_TransportStudents_TransportStops_PickupStopId",
                table: "TransportStudents");

            migrationBuilder.DropTable(
                name: "LessonPlans");

            migrationBuilder.DropTable(
                name: "TransportStops");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "SyllabusTopics");

            migrationBuilder.DropTable(
                name: "SyllabusUnits");

            migrationBuilder.DropIndex(
                name: "IX_TransportStudents_DropStopId",
                table: "TransportStudents");

            migrationBuilder.DropIndex(
                name: "IX_TransportStudents_PickupStopId",
                table: "TransportStudents");

            migrationBuilder.DropIndex(
                name: "IX_TransportRoutes_VehicleId",
                table: "TransportRoutes");

            migrationBuilder.DropColumn(
                name: "LinkedEntityId",
                table: "User");

            migrationBuilder.DropColumn(
                name: "DropStopId",
                table: "TransportStudents");

            migrationBuilder.DropColumn(
                name: "PickupStopId",
                table: "TransportStudents");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "TransportRoutes");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "FeeStructures",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");
        }
    }
}

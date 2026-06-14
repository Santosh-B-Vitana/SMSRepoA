using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOnlineClassesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OnlineClasses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    HostStaffId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Provider = table.Column<int>(type: "int", nullable: false),
                    ProviderRoomName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MeetingUrl = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    ScheduledStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActualStart = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    MaxParticipants = table.Column<int>(type: "int", nullable: false),
                    IsRecordingEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsInstant = table.Column<bool>(type: "bit", nullable: false),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
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
                    table.PrimaryKey("PK_OnlineClasses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnlineClasses_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OnlineClasses_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OnlineClasses_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OnlineClasses_StaffMembers_HostStaffId",
                        column: x => x.HostStaffId,
                        principalTable: "StaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OnlineClasses_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SchoolMeetingProviderConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DefaultProvider = table.Column<int>(type: "int", nullable: false),
                    UseSharedVitanaAccount = table.Column<bool>(type: "bit", nullable: false),
                    LiveKitServerUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LiveKitApiKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LiveKitApiSecretProtected = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    ZoomAccountId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ZoomClientId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ZoomClientSecretProtected = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
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
                    table.PrimaryKey("PK_SchoolMeetingProviderConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolMeetingProviderConfigs_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OnlineClassAttendanceRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OnlineClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JoinTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LeaveTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    JoinCount = table.Column<int>(type: "int", nullable: false),
                    AttendanceStatus = table.Column<int>(type: "int", nullable: false),
                    IsManualOverride = table.Column<bool>(type: "bit", nullable: false),
                    ManualOverrideBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ManualOverrideAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_OnlineClassAttendanceRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnlineClassAttendanceRecords_OnlineClasses_OnlineClassId",
                        column: x => x.OnlineClassId,
                        principalTable: "OnlineClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OnlineClassAttendanceRecords_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OnlineClassNotificationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OnlineClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecipientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NotificationType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Channel = table.Column<int>(type: "int", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
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
                    table.PrimaryKey("PK_OnlineClassNotificationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnlineClassNotificationLogs_OnlineClasses_OnlineClassId",
                        column: x => x.OnlineClassId,
                        principalTable: "OnlineClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OnlineClassRecordings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OnlineClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    S3Bucket = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    S3Key = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    FileSizeMb = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    IsTeacherRestricted = table.Column<bool>(type: "bit", nullable: false),
                    RecordingStatus = table.Column<int>(type: "int", nullable: false),
                    EgressId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
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
                    table.PrimaryKey("PK_OnlineClassRecordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnlineClassRecordings_OnlineClasses_OnlineClassId",
                        column: x => x.OnlineClassId,
                        principalTable: "OnlineClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassAttendanceRecords_OnlineClassId_StudentId",
                table: "OnlineClassAttendanceRecords",
                columns: new[] { "OnlineClassId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassAttendanceRecords_SchoolId_StudentId_AttendanceStatus",
                table: "OnlineClassAttendanceRecords",
                columns: new[] { "SchoolId", "StudentId", "AttendanceStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassAttendanceRecords_StudentId",
                table: "OnlineClassAttendanceRecords",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_ClassId",
                table: "OnlineClasses",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_HostStaffId",
                table: "OnlineClasses",
                column: "HostStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_ProviderRoomName",
                table: "OnlineClasses",
                column: "ProviderRoomName");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SchoolId_AcademicYear",
                table: "OnlineClasses",
                columns: new[] { "SchoolId", "AcademicYear" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SchoolId_ClassId_ScheduledStart",
                table: "OnlineClasses",
                columns: new[] { "SchoolId", "ClassId", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SchoolId_HostStaffId_ScheduledStart",
                table: "OnlineClasses",
                columns: new[] { "SchoolId", "HostStaffId", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SchoolId_Status_ScheduledStart",
                table: "OnlineClasses",
                columns: new[] { "SchoolId", "Status", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SectionId",
                table: "OnlineClasses",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClasses_SubjectId",
                table: "OnlineClasses",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassNotificationLogs_OnlineClassId",
                table: "OnlineClassNotificationLogs",
                column: "OnlineClassId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassNotificationLogs_SchoolId_OnlineClassId_NotificationType",
                table: "OnlineClassNotificationLogs",
                columns: new[] { "SchoolId", "OnlineClassId", "NotificationType" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassNotificationLogs_SchoolId_RecipientId_SentAt",
                table: "OnlineClassNotificationLogs",
                columns: new[] { "SchoolId", "RecipientId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassRecordings_EgressId",
                table: "OnlineClassRecordings",
                column: "EgressId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassRecordings_OnlineClassId",
                table: "OnlineClassRecordings",
                column: "OnlineClassId");

            migrationBuilder.CreateIndex(
                name: "IX_OnlineClassRecordings_SchoolId_OnlineClassId",
                table: "OnlineClassRecordings",
                columns: new[] { "SchoolId", "OnlineClassId" });

            migrationBuilder.CreateIndex(
                name: "IX_SchoolMeetingProviderConfigs_SchoolId",
                table: "SchoolMeetingProviderConfigs",
                column: "SchoolId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OnlineClassAttendanceRecords");

            migrationBuilder.DropTable(
                name: "OnlineClassNotificationLogs");

            migrationBuilder.DropTable(
                name: "OnlineClassRecordings");

            migrationBuilder.DropTable(
                name: "SchoolMeetingProviderConfigs");

            migrationBuilder.DropTable(
                name: "OnlineClasses");
        }
    }
}

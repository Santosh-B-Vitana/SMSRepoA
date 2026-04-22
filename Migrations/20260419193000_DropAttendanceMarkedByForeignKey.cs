using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SmsApi.Data;

#nullable disable

namespace SmsApi.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260419193000_DropAttendanceMarkedByForeignKey")]
    public partial class DropAttendanceMarkedByForeignKey : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'AttendanceRecords'
          AND c.conname = 'FK_AttendanceRecords_User_MarkedBy'
    ) THEN
        ALTER TABLE ""AttendanceRecords""
        DROP CONSTRAINT ""FK_AttendanceRecords_User_MarkedBy"";
    END IF;
END $$;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally no-op: original FK points to a non-existent User table in current model.
        }
    }
}

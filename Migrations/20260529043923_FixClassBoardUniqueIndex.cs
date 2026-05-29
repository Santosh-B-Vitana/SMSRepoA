using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class FixClassBoardUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old index only if it still exists (may have been dropped manually)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_SchoolId_Name' AND object_id = OBJECT_ID('Classes'))
                    DROP INDEX [IX_Classes_SchoolId_Name] ON [Classes];
            ");

            // Create new filtered unique index only if it doesn't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_SchoolId_Name_Board' AND object_id = OBJECT_ID('Classes'))
                    CREATE UNIQUE INDEX [IX_Classes_SchoolId_Name_Board] ON [Classes] ([SchoolId], [Name], [BoardConfigurationId]) WHERE [IsDeleted] = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Classes_SchoolId_Name_Board",
                table: "Classes");

            migrationBuilder.CreateIndex(
                name: "IX_Classes_SchoolId_Name",
                table: "Classes",
                columns: new[] { "SchoolId", "Name" },
                unique: true);
        }
    }
}

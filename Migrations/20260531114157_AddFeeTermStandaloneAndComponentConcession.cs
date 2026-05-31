using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeTermStandaloneAndComponentConcession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the old unique index if it exists (may not exist in all environments)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId'
                           AND object_id = OBJECT_ID('FeeStructureComponents'))
                    DROP INDEX [IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId] ON [FeeStructureComponents];
            ");

            migrationBuilder.AlterColumn<Guid>(
                name: "FeeStructureId",
                table: "FeeTerms",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "ConcessionTypeId",
                table: "FeeStructureComponents",
                type: "uniqueidentifier",
                nullable: true);

            // Add FeeTermId to FeeStructureComponents if it doesn't exist (may be missing in some environments)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns
                               WHERE object_id = OBJECT_ID('FeeStructureComponents') AND name = 'FeeTermId')
                    ALTER TABLE [FeeStructureComponents] ADD [FeeTermId] uniqueidentifier NULL;
            ");

            // Add DueDate to FeeStructureComponents if it doesn't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns
                               WHERE object_id = OBJECT_ID('FeeStructureComponents') AND name = 'DueDate')
                    ALTER TABLE [FeeStructureComponents] ADD [DueDate] datetime2 NULL;
            ");

            // Add ConcessionTypeId index only if it doesn't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FeeStructureComponents_ConcessionTypeId'
                               AND object_id = OBJECT_ID('FeeStructureComponents'))
                    CREATE INDEX [IX_FeeStructureComponents_ConcessionTypeId] ON [FeeStructureComponents] ([ConcessionTypeId]);
            ");

            // Add composite index only if FeeTermId column exists and index doesn't already exist
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('FeeStructureComponents') AND name = 'FeeTermId')
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId'
                                   AND object_id = OBJECT_ID('FeeStructureComponents'))
                    CREATE INDEX [IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId] ON [FeeStructureComponents] ([FeeStructureId], [FeeHeadId], [FeeTermId]);
            ");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructureComponents_ConcessionTypes_ConcessionTypeId",
                table: "FeeStructureComponents",
                column: "ConcessionTypeId",
                principalTable: "ConcessionTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructureComponents_ConcessionTypes_ConcessionTypeId",
                table: "FeeStructureComponents");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FeeStructureComponents_ConcessionTypeId'
                           AND object_id = OBJECT_ID('FeeStructureComponents'))
                    DROP INDEX [IX_FeeStructureComponents_ConcessionTypeId] ON [FeeStructureComponents];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId'
                           AND object_id = OBJECT_ID('FeeStructureComponents'))
                    DROP INDEX [IX_FeeStructureComponents_FeeStructureId_FeeHeadId_FeeTermId] ON [FeeStructureComponents];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('FeeStructureComponents') AND name = 'ConcessionTypeId')
                    ALTER TABLE [FeeStructureComponents] DROP COLUMN [ConcessionTypeId];
            ");

            migrationBuilder.AlterColumn<Guid>(
                name: "FeeStructureId",
                table: "FeeTerms",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}

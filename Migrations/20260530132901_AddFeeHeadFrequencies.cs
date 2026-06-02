using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeHeadFrequencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Add missing columns to ClassFeeStructures if they were created with an older schema ──
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ClassFeeStructures') AND name = 'ClassName')
                    ALTER TABLE [ClassFeeStructures] ADD [ClassName] nvarchar(50) NOT NULL CONSTRAINT [DF_ClassFeeStructures_ClassName] DEFAULT '';
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ClassFeeStructures') AND name = 'AcademicYear')
                    ALTER TABLE [ClassFeeStructures] ADD [AcademicYear] nvarchar(20) NOT NULL CONSTRAINT [DF_ClassFeeStructures_AcademicYear] DEFAULT '';
            ");

            // ── 2. Drop old ClassFeeStructures index if it exists ─────────────────
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ClassFeeStructures_SchoolId_ClassName_AcademicYear'
                      AND object_id = OBJECT_ID('ClassFeeStructures')
                )
                    DROP INDEX [IX_ClassFeeStructures_SchoolId_ClassName_AcademicYear] ON [ClassFeeStructures];
            ");

            // ── 3. Add FeeHeadFrequencies column to FeeStructures (idempotent) ─────
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'FeeStructures') AND name = 'FeeHeadFrequencies'
                )
                    ALTER TABLE [FeeStructures] ADD [FeeHeadFrequencies] nvarchar(2000) NULL;
            ");

            // ── 4. Create StudentFeeItems table if it does not exist ──────────────
            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'StudentFeeItems', N'U') IS NULL
                BEGIN
                    CREATE TABLE [StudentFeeItems] (
                        [Id]                      uniqueidentifier NOT NULL,
                        [SchoolId]                uniqueidentifier NOT NULL,
                        [StudentId]               uniqueidentifier NOT NULL,
                        [FeeStructureId]          uniqueidentifier NOT NULL,
                        [FeeStructureComponentId] uniqueidentifier NULL,
                        [AcademicYear]            nvarchar(20) NOT NULL,
                        [DiscountType]            nvarchar(50) NOT NULL CONSTRAINT [DF_StudentFeeItems_DiscountType] DEFAULT 'Others',
                        [DiscountPercentage]      decimal(5,2) NOT NULL CONSTRAINT [DF_StudentFeeItems_DiscountPercentage] DEFAULT 0,
                        [FlatAmount]              decimal(12,2) NULL,
                        [Reason]                  nvarchar(500) NULL,
                        [IsActive]                bit NOT NULL CONSTRAINT [DF_StudentFeeItems_IsActive] DEFAULT 1,
                        [CreatedAt]               datetime2 NOT NULL,
                        [UpdatedAt]               datetime2 NOT NULL,
                        [CreatedBy]               uniqueidentifier NULL,
                        [UpdatedBy]               uniqueidentifier NULL,
                        [IsDeleted]               bit NOT NULL CONSTRAINT [DF_StudentFeeItems_IsDeleted] DEFAULT 0,
                        [DeletedAt]               datetime2 NULL,
                        [RowVersion]              rowversion NULL,
                        CONSTRAINT [PK_StudentFeeItems] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_StudentFeeItems_FeeStructureComponents_FeeStructureComponentId]
                            FOREIGN KEY ([FeeStructureComponentId])
                            REFERENCES [FeeStructureComponents] ([Id]) ON DELETE SET NULL,
                        CONSTRAINT [FK_StudentFeeItems_FeeStructures_FeeStructureId]
                            FOREIGN KEY ([FeeStructureId])
                            REFERENCES [FeeStructures] ([Id]),
                        CONSTRAINT [FK_StudentFeeItems_Schools_SchoolId]
                            FOREIGN KEY ([SchoolId])
                            REFERENCES [Schools] ([Id]),
                        CONSTRAINT [FK_StudentFeeItems_Students_StudentId]
                            FOREIGN KEY ([StudentId])
                            REFERENCES [Students] ([Id])
                    );
                    CREATE INDEX [IX_StudentFeeItems_StudentId_FeeStructureId_FeeStructureComponentId_AcademicYear]
                        ON [StudentFeeItems] ([StudentId], [FeeStructureId], [FeeStructureComponentId], [AcademicYear]);
                END
            ");

            // ── 5. StudentFeeItems additional indexes (conditional) ───────────────
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentFeeItems_FeeStructureComponentId' AND object_id = OBJECT_ID('StudentFeeItems'))
                    CREATE INDEX [IX_StudentFeeItems_FeeStructureComponentId] ON [StudentFeeItems] ([FeeStructureComponentId]);
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentFeeItems_FeeStructureId' AND object_id = OBJECT_ID('StudentFeeItems'))
                    CREATE INDEX [IX_StudentFeeItems_FeeStructureId] ON [StudentFeeItems] ([FeeStructureId]);
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentFeeItems_SchoolId' AND object_id = OBJECT_ID('StudentFeeItems'))
                    CREATE INDEX [IX_StudentFeeItems_SchoolId] ON [StudentFeeItems] ([SchoolId]);
            ");

            // ── 6. Recreate ClassFeeStructures unique index ───────────────────────
            // Skipped: existing rows have AcademicYear='' from the backfill default, which
            // causes duplicates that block UNIQUE index creation. The index will be added
            // manually after data is cleaned, or by a future migration on a fresh schema.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StudentFeeItems_FeeStructureComponentId",
                table: "StudentFeeItems");

            migrationBuilder.DropIndex(
                name: "IX_StudentFeeItems_FeeStructureId",
                table: "StudentFeeItems");

            migrationBuilder.DropIndex(
                name: "IX_StudentFeeItems_SchoolId",
                table: "StudentFeeItems");

            migrationBuilder.DropIndex(
                name: "IX_ClassFeeStructures_SchoolId_ClassName_AcademicYear",
                table: "ClassFeeStructures");

            migrationBuilder.DropColumn(
                name: "FeeHeadFrequencies",
                table: "FeeStructures");

            migrationBuilder.CreateIndex(
                name: "IX_ClassFeeStructures_SchoolId_ClassName_AcademicYear",
                table: "ClassFeeStructures",
                columns: new[] { "SchoolId", "ClassName", "AcademicYear" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}

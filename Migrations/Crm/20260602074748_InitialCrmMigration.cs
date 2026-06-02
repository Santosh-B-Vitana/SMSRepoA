using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations.Crm
{
    /// <inheritdoc />
    public partial class InitialCrmMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SchoolConfig",
                columns: table => new
                {
                    SchoolId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SchoolShortName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SchoolDomain = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DBServer = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DBName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolConfig", x => x.SchoolId);
                });

            migrationBuilder.CreateTable(
                name: "SchoolBilling",
                columns: table => new
                {
                    SchoolBillId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentDueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsPaid = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolBilling", x => x.SchoolBillId);
                    table.ForeignKey(
                        name: "FK_SchoolBilling_SchoolConfig_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "SchoolConfig",
                        principalColumn: "SchoolId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SchoolBillPayment",
                columns: table => new
                {
                    SchoolBillPaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SchoolId = table.Column<int>(type: "int", nullable: false),
                    SchoolBillId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaymentMode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CollectedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AddedDate = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolBillPayment", x => x.SchoolBillPaymentId);
                    table.ForeignKey(
                        name: "FK_SchoolBillPayment_SchoolBilling_SchoolBillId",
                        column: x => x.SchoolBillId,
                        principalTable: "SchoolBilling",
                        principalColumn: "SchoolBillId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SchoolBilling_SchoolId",
                table: "SchoolBilling",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolBillPayment_SchoolBillId",
                table: "SchoolBillPayment",
                column: "SchoolBillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SchoolBillPayment");

            migrationBuilder.DropTable(
                name: "SchoolBilling");

            migrationBuilder.DropTable(
                name: "SchoolConfig");
        }
    }
}

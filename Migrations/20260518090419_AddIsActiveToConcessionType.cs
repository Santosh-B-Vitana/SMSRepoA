using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToConcessionType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StoreOrderItems_StoreOrders_StoreOrderId",
                table: "StoreOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_StoreOrderItems_StoreOrderId",
                table: "StoreOrderItems");

            migrationBuilder.DropColumn(
                name: "StoreOrderId",
                table: "StoreOrderItems");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "ConcessionTypes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "BoardConfigurations",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000014"),
                column: "GradingScaleJson",
                value: "[{\"grade\":\"★\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Star Distinction\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Third Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "ConcessionTypes");

            migrationBuilder.AddColumn<Guid>(
                name: "StoreOrderId",
                table: "StoreOrderItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "BoardConfigurations",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000014"),
                column: "GradingScaleJson",
                value: "[{\"grade\":\"?\",\"minPercentage\":90,\"maxPercentage\":100,\"gradePoint\":10.0,\"description\":\"Star Distinction\",\"isPassing\":true},{\"grade\":\"A\",\"minPercentage\":80,\"maxPercentage\":89,\"gradePoint\":9.0,\"description\":\"Distinction\",\"isPassing\":true},{\"grade\":\"B+\",\"minPercentage\":70,\"maxPercentage\":79,\"gradePoint\":8.0,\"description\":\"First Class\",\"isPassing\":true},{\"grade\":\"B\",\"minPercentage\":60,\"maxPercentage\":69,\"gradePoint\":7.0,\"description\":\"Second Class\",\"isPassing\":true},{\"grade\":\"C\",\"minPercentage\":50,\"maxPercentage\":59,\"gradePoint\":6.0,\"description\":\"Third Class\",\"isPassing\":true},{\"grade\":\"D\",\"minPercentage\":40,\"maxPercentage\":49,\"gradePoint\":5.0,\"description\":\"Pass\",\"isPassing\":true},{\"grade\":\"E\",\"minPercentage\":33,\"maxPercentage\":39,\"gradePoint\":4.0,\"description\":\"Pass (Marginal)\",\"isPassing\":true},{\"grade\":\"F\",\"minPercentage\":0,\"maxPercentage\":32,\"gradePoint\":0.0,\"description\":\"Fail\",\"isPassing\":false}]");

            migrationBuilder.CreateIndex(
                name: "IX_StoreOrderItems_StoreOrderId",
                table: "StoreOrderItems",
                column: "StoreOrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_StoreOrderItems_StoreOrders_StoreOrderId",
                table: "StoreOrderItems",
                column: "StoreOrderId",
                principalTable: "StoreOrders",
                principalColumn: "Id");
        }
    }
}

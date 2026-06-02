using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeStructureBoardConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BoardConfigurationId",
                table: "FeeStructures",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_BoardConfigurationId",
                table: "FeeStructures",
                column: "BoardConfigurationId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructures_BoardConfigurations_BoardConfigurationId",
                table: "FeeStructures",
                column: "BoardConfigurationId",
                principalTable: "BoardConfigurations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructures_BoardConfigurations_BoardConfigurationId",
                table: "FeeStructures");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructures_BoardConfigurationId",
                table: "FeeStructures");

            migrationBuilder.DropColumn(
                name: "BoardConfigurationId",
                table: "FeeStructures");
        }
    }
}

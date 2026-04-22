using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardToExamination : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BoardConfigurationId",
                table: "Examinations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_BoardConfigurationId",
                table: "Examinations",
                column: "BoardConfigurationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Examinations_BoardConfigurations_BoardConfigurationId",
                table: "Examinations",
                column: "BoardConfigurationId",
                principalTable: "BoardConfigurations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Examinations_BoardConfigurations_BoardConfigurationId",
                table: "Examinations");

            migrationBuilder.DropIndex(
                name: "IX_Examinations_BoardConfigurationId",
                table: "Examinations");

            migrationBuilder.DropColumn(
                name: "BoardConfigurationId",
                table: "Examinations");
        }
    }
}

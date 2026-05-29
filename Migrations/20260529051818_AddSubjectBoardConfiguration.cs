using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSubjectBoardConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BoardConfigurationId",
                table: "Subjects",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_BoardConfigurationId",
                table: "Subjects",
                column: "BoardConfigurationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_BoardConfigurations_BoardConfigurationId",
                table: "Subjects",
                column: "BoardConfigurationId",
                principalTable: "BoardConfigurations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_BoardConfigurations_BoardConfigurationId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_BoardConfigurationId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "BoardConfigurationId",
                table: "Subjects");
        }
    }
}

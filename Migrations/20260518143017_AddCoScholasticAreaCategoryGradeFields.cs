using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCoScholasticAreaCategoryGradeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApplicableFromGrade",
                table: "CoScholasticAreas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApplicableToGrade",
                table: "CoScholasticAreas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "CoScholasticAreas",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicableFromGrade",
                table: "CoScholasticAreas");

            migrationBuilder.DropColumn(
                name: "ApplicableToGrade",
                table: "CoScholasticAreas");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "CoScholasticAreas");
        }
    }
}

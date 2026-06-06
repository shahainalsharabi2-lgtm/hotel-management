using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Replace_GeneralCodeBedCountWithBedTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BedCount",
                table: "AppGeneralCodeItems",
                newName: "RegularBedCount");

            migrationBuilder.AddColumn<int>(
                name: "FamilyBedCount",
                table: "AppGeneralCodeItems",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FamilyBedCount",
                table: "AppGeneralCodeItems");

            migrationBuilder.RenameColumn(
                name: "RegularBedCount",
                table: "AppGeneralCodeItems",
                newName: "BedCount");
        }
    }
}

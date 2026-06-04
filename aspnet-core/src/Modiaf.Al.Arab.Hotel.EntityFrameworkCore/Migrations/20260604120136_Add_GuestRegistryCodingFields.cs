using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Add_GuestRegistryCodingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Price_Code",
                table: "AppGuestRegistries",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Purpose_Of_Stay",
                table: "AppGuestRegistries",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Relationship_Type",
                table: "AppGuestRegistries",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Price_Code",
                table: "AppGuestRegistries");

            migrationBuilder.DropColumn(
                name: "Purpose_Of_Stay",
                table: "AppGuestRegistries");

            migrationBuilder.DropColumn(
                name: "Relationship_Type",
                table: "AppGuestRegistries");
        }
    }
}

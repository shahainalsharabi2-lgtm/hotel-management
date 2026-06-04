using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Add_RoomArchitectureLocationFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RoomArchitecture",
                table: "AppRooms",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoomFeatures",
                table: "AppRooms",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoomLocation",
                table: "AppRooms",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RoomArchitecture",
                table: "AppRooms");

            migrationBuilder.DropColumn(
                name: "RoomFeatures",
                table: "AppRooms");

            migrationBuilder.DropColumn(
                name: "RoomLocation",
                table: "AppRooms");
        }
    }
}

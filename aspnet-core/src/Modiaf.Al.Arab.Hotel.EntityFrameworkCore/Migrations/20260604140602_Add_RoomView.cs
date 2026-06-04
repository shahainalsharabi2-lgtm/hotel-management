using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Add_RoomView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RoomView",
                table: "AppRooms",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RoomView",
                table: "AppRooms");
        }
    }
}

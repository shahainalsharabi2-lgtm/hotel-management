using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Add_HotelAppUserRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "AppHotelAppUsers",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "user");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "AppHotelAppUsers");
        }
    }
}

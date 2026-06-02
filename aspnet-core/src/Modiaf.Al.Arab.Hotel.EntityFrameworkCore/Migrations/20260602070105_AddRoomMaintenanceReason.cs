using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomMaintenanceReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MaintenanceReason",
                table: "AppRooms",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaintenanceReason",
                table: "AppRooms");
        }
    }
}

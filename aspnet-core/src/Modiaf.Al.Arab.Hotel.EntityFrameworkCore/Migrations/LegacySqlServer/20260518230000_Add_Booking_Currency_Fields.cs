using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    [DbContext(typeof(HotelDbContext))]
    [Migration("20260518230000_Add_Booking_Currency_Fields")]
    /// <inheritdoc />
    public partial class Add_Booking_Currency_Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "AppBookings",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "YER");

            migrationBuilder.AddColumn<string>(
                name: "CurrencySymbol",
                table: "AppBookings",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "YR");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "AppBookings");

            migrationBuilder.DropColumn(
                name: "CurrencySymbol",
                table: "AppBookings");
        }
    }
}

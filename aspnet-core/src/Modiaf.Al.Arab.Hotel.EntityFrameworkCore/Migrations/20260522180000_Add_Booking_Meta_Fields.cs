using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    [DbContext(typeof(HotelDbContext))]
    [Migration("20260522180000_Add_Booking_Meta_Fields")]
    public partial class Add_Booking_Meta_Fields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('AppBookings', 'Booking_Confirmed') IS NULL
    ALTER TABLE [AppBookings] ADD [Booking_Confirmed] bit NOT NULL CONSTRAINT [DF_AppBookings_Booking_Confirmed] DEFAULT CAST(1 AS bit);
IF COL_LENGTH('AppBookings', 'Booking_Source') IS NULL
    ALTER TABLE [AppBookings] ADD [Booking_Source] nvarchar(32) NOT NULL CONSTRAINT [DF_AppBookings_Booking_Source] DEFAULT N'direct';
IF COL_LENGTH('AppBookings', 'Guest_Notes') IS NULL
    ALTER TABLE [AppBookings] ADD [Guest_Notes] nvarchar(max) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Booking_Confirmed", table: "AppBookings");
            migrationBuilder.DropColumn(name: "Booking_Source", table: "AppBookings");
            migrationBuilder.DropColumn(name: "Guest_Notes", table: "AppBookings");
        }
    }
}

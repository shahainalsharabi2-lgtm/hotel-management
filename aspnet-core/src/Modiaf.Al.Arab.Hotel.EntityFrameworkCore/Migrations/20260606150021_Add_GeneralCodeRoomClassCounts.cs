using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Add_GeneralCodeRoomClassCounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "AppGeneralCodeItems" ADD COLUMN IF NOT EXISTS "BedCount" integer;
                ALTER TABLE "AppGeneralCodeItems" ADD COLUMN IF NOT EXISTS "RoomCount" integer;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BedCount",
                table: "AppGeneralCodeItems");

            migrationBuilder.DropColumn(
                name: "RoomCount",
                table: "AppGeneralCodeItems");
        }
    }
}

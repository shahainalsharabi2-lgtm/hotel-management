using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    /// <inheritdoc />
    public partial class Added_Rooms_And_Bookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            //CreateTable AppBookings
            migrationBuilder.CreateTable(
                name: "AppBookings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    //false استخدام
                    First_Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Last_Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone_Number = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Payment_Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Id_Number = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Id_Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Room_Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Room_Number = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Floor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Booking_Date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Booking_Time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BookingDateTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Payment_Method = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    People_Count = table.Column<int>(type: "int", nullable: false),
                    Adults_Count = table.Column<int>(type: "int", nullable: false),
                    Children_Count = table.Column<int>(type: "int", nullable: false),
                    Invoice_Number = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Stay_Days = table.Column<int>(type: "int", nullable: false),
                    Total_Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Remaining_Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                //PrimaryKey
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppBookings", x => x.Id);
                });
            //CreateTable AppIdentityTypes
            migrationBuilder.CreateTable(
                name: "AppIdentityTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                    //false إلزامي لا يمكن أن يكون NULL
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppIdentityTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppRooms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Floor = table.Column<int>(type: "int", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRooms", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppBookings");

            migrationBuilder.DropTable(
                name: "AppIdentityTypes");

            migrationBuilder.DropTable(
                name: "AppRooms");
        }
    }
}

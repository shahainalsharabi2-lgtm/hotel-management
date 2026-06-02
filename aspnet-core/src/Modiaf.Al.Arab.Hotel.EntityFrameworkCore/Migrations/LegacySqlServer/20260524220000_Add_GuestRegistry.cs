using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    [DbContext(typeof(HotelDbContext))]
    [Migration("20260524220000_Add_GuestRegistry")]
    public partial class Add_GuestRegistry : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppGuestRegistries')
BEGIN
    CREATE TABLE [AppGuestRegistries] (
        [Id] int NOT NULL IDENTITY,
        [First_Name] nvarchar(128) NOT NULL,
        [Middle_Name] nvarchar(128) NOT NULL,
        [Last_Name] nvarchar(128) NOT NULL,
        [Phone_Number] nvarchar(32) NOT NULL,
        [Gender] nvarchar(16) NOT NULL,
        [Nationality] nvarchar(128) NOT NULL,
        [Country] nvarchar(128) NOT NULL,
        [Birth_Date] datetime2 NULL,
        [Id_Type] nvarchar(64) NOT NULL,
        [Id_Issuing_Country] nvarchar(128) NOT NULL,
        [Id_Number] nvarchar(64) NOT NULL,
        [CreationTime] datetime2 NOT NULL,
        [CreatorId] uniqueidentifier NULL,
        [LastModificationTime] datetime2 NULL,
        [LastModifierId] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL DEFAULT CAST(0 AS bit),
        [DeleterId] uniqueidentifier NULL,
        [DeletionTime] datetime2 NULL,
        CONSTRAINT [PK_AppGuestRegistries] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_AppGuestRegistries_Id_Number] ON [AppGuestRegistries] ([Id_Number]);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AppGuestRegistries");
        }
    }
}

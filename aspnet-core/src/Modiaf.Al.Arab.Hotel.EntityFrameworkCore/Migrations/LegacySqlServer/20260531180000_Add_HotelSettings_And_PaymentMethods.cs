using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations
{
    [DbContext(typeof(HotelDbContext))]
    [Migration("20260531180000_Add_HotelSettings_And_PaymentMethods")]
    public partial class Add_HotelSettings_And_PaymentMethods : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppHotelSettingsDocuments')
BEGIN
    CREATE TABLE [AppHotelSettingsDocuments] (
        [Id] uniqueidentifier NOT NULL,
        [SettingsPassword] nvarchar(128) NOT NULL,
        [HotelImageDataUrl] nvarchar(max) NULL,
        [ProfileJson] nvarchar(max) NOT NULL,
        [CurrencyId] nvarchar(32) NOT NULL,
        [CurrencySymbol] nvarchar(16) NULL,
        [CurrencyCode] nvarchar(16) NULL,
        CONSTRAINT [PK_AppHotelSettingsDocuments] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppPaymentMethods')
BEGIN
    CREATE TABLE [AppPaymentMethods] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(128) NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_AppPaymentMethods] PRIMARY KEY ([Id])
    );
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM [AppHotelSettingsDocuments] WHERE [Id] = '11111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO [AppHotelSettingsDocuments] (
        [Id], [SettingsPassword], [HotelImageDataUrl], [ProfileJson], [CurrencyId], [CurrencySymbol], [CurrencyCode])
    VALUES (
        '11111111-1111-1111-1111-111111111111', N'123', NULL, N'{}', N'sar', NULL, NULL);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AppHotelSettingsDocuments");
            migrationBuilder.DropTable(name: "AppPaymentMethods");
        }
    }
}

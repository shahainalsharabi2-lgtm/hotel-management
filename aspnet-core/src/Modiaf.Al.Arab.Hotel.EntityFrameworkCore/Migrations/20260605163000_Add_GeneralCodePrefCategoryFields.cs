using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Modiaf.Al.Arab.Hotel.Migrations;

/// <inheritdoc />
public partial class Add_GeneralCodePrefCategoryFields : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "AppGeneralCodeItems" ADD COLUMN IF NOT EXISTS "CountryDialCode" character varying(32);
            ALTER TABLE "AppGeneralCodeItems" ADD COLUMN IF NOT EXISTS "FlagImageData" text;
            ALTER TABLE "AppGeneralCodeItems" ADD COLUMN IF NOT EXISTS "FlagImageName" character varying(256);
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "CountryDialCode",
            table: "AppGeneralCodeItems");

        migrationBuilder.DropColumn(
            name: "FlagImageData",
            table: "AppGeneralCodeItems");

        migrationBuilder.DropColumn(
            name: "FlagImageName",
            table: "AppGeneralCodeItems");
    }
}

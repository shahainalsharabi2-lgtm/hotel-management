using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

/* This class is needed for EF Core console commands
 * (like Add-Migration and Update-Database commands) */
public class HotelDbContextFactory : IDesignTimeDbContextFactory<HotelDbContext>
{
    public HotelDbContext CreateDbContext(string[] args)
    {
        HotelEfCoreEntityExtensionMappings.Configure();

        var configuration = BuildConfiguration();

        var provider = (configuration["Database:Provider"] ?? "SqlServer").Trim();
        var conn = configuration.GetConnectionString("Default");

        var builder = new DbContextOptionsBuilder<HotelDbContext>();
        if (provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase) ||
            provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) ||
            provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            builder.UseNpgsql(conn);
        }
        else
        {
            builder.UseSqlServer(conn);
        }

        return new HotelDbContext(builder.Options);
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Modiaf.Al.Arab.Hotel.DbMigrator/"))
            .AddJsonFile("appsettings.json", optional: false);

        return builder.Build();
    }
}

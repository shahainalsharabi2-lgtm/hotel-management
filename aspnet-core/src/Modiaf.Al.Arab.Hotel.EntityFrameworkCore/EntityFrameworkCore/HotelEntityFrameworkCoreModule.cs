using System;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.PostgreSql;
using Volo.Abp.EntityFrameworkCore.SqlServer;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.Modularity;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.TenantManagement.EntityFrameworkCore;
using Volo.Abp.Timing;
using Modiaf.Al.Arab.Hotel.Bookings;
using Modiaf.Al.Arab.Hotel.Floors;
using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Modiaf.Al.Arab.Hotel.Repository;
using Modiaf.Al.Arab.Hotel.Rooms;
using Modiaf.Al.Arab.Hotel.RoomTypes;
using Microsoft.Extensions.Configuration;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

[DependsOn(
    typeof(HotelDomainModule),
    typeof(AbpIdentityEntityFrameworkCoreModule),
    typeof(AbpOpenIddictEntityFrameworkCoreModule),
    typeof(AbpPermissionManagementEntityFrameworkCoreModule),
    typeof(AbpSettingManagementEntityFrameworkCoreModule),
    typeof(AbpEntityFrameworkCoreSqlServerModule),
    typeof(AbpEntityFrameworkCorePostgreSqlModule),
    typeof(AbpBackgroundJobsEntityFrameworkCoreModule),
    typeof(AbpAuditLoggingEntityFrameworkCoreModule),
    typeof(AbpTenantManagementEntityFrameworkCoreModule),
    typeof(AbpFeatureManagementEntityFrameworkCoreModule)
    )]
public class HotelEntityFrameworkCoreModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        HotelEfCoreEntityExtensionMappings.Configure();
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();
        var provider = (configuration["Database:Provider"] ?? "SqlServer").Trim();

        context.Services.AddAbpDbContext<HotelDbContext>(options =>
        {
                /* Remove "includeAllEntities: true" to create
                 * default repositories only for aggregate roots */
            options.AddDefaultRepositories(includeAllEntities: true);
            options.AddRepository<Room, EfCoreRoomRepository>();
            options.AddRepository<Booking, EfCoreBookingRepository>();
            options.AddRepository<Floor, EfCoreFloorRepository>();
            options.AddRepository<IdentityType, EfCoreIdentityTypeRepository>();
            options.AddRepository<RoomType, EfCoreRoomTypeRepository>();
        });

        var isPostgreSql = provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase) ||
                           provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) ||
                           provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase);

        if (isPostgreSql)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            Configure<AbpClockOptions>(options => options.Kind = DateTimeKind.Utc);
        }

        Configure<AbpDbContextOptions>(options =>
        {
                /* The main point to change your DBMS.
                 * See also HotelMigrationsDbContextFactory for EF Core tooling. */
            if (isPostgreSql)
            {
                options.UseNpgsql();
                return;
            }
            options.UseSqlServer();
        });

    }
}

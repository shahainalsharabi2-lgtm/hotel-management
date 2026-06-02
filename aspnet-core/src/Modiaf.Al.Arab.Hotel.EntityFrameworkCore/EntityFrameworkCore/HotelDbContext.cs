using Microsoft.EntityFrameworkCore;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.TenantManagement;
using Volo.Abp.TenantManagement.EntityFrameworkCore;

using Modiaf.Al.Arab.Hotel.Bookings;
using Modiaf.Al.Arab.Hotel.GuestRegistries;
using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Modiaf.Al.Arab.Hotel.Rooms;
using Modiaf.Al.Arab.Hotel.Floors;
using Modiaf.Al.Arab.Hotel.RoomTypes;
using Modiaf.Al.Arab.Hotel.GeneralCodes;
using Modiaf.Al.Arab.Hotel.HotelSettings;
using Modiaf.Al.Arab.Hotel.PaymentMethods;
using Modiaf.Al.Arab.Hotel.UiTranslations;
using Volo.Abp.EntityFrameworkCore.Modeling;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore;


[ReplaceDbContext(typeof(IIdentityDbContext))]
[ReplaceDbContext(typeof(ITenantManagementDbContext))]
[ConnectionStringName("Default")]
public class HotelDbContext(DbContextOptions<HotelDbContext> options) :
    AbpDbContext<HotelDbContext>(options),
    IIdentityDbContext,
    ITenantManagementDbContext
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */

    #region Entities from the modules

    /* Notice: We only implemented IIdentityDbContext and ITenantManagementDbContext
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityDbContext and ITenantManagementDbContext.
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */

    //Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }
    // Tenant Management
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConnectionString> TenantConnectionStrings { get; set; }

    public DbSet<Room> Rooms { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<IdentityType> IdentityTypes { get; set; }
    public DbSet<GuestRegistry> GuestRegistries { get; set; }
    public DbSet<Floor> Floors { get; set; }
    public DbSet<RoomType> RoomTypes { get; set; }
    public DbSet<UiTranslationsStore> UiTranslationsStores { get; set; }
    public DbSet<GeneralCodeItem> GeneralCodeItems { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }
    public DbSet<HotelSettingsDocument> HotelSettingsDocuments { get; set; }

    #endregion

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureFeatureManagement();
        builder.ConfigureTenantManagement();

        /* Configure your own tables/entities inside here */

        //builder.Entity<YourEntity>(b =>
        //{
        //    b.ToTable(HotelConsts.DbTablePrefix + "YourEntities", HotelConsts.DbSchema);
        //    b.ConfigureByConvention(); //auto configure for the base class props
        //    //...
        //});

        builder.Entity<Room>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "Rooms", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.RoomNumber).IsRequired().HasMaxLength(50);
            b.Property(x => x.MaintenanceReason).HasMaxLength(256);
            b.Property(x => x.CurrencyCode).HasMaxLength(16).HasDefaultValue("YER");
            b.Property(x => x.CurrencySymbol).HasMaxLength(16).HasDefaultValue("YR");
        });

        builder.Entity<Booking>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "Bookings", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.CurrencyCode).HasMaxLength(16).HasDefaultValue("YER");
            b.Property(x => x.CurrencySymbol).HasMaxLength(16).HasDefaultValue("YR");
        });

        builder.Entity<IdentityType>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "IdentityTypes", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(100);
        });

        builder.Entity<GuestRegistry>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "GuestRegistries", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.First_Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Middle_Name).HasMaxLength(128);
            b.Property(x => x.Last_Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Phone_Number).HasMaxLength(32);
            b.Property(x => x.Gender).HasMaxLength(16);
            b.Property(x => x.Nationality).HasMaxLength(128);
            b.Property(x => x.Country).HasMaxLength(128);
            b.Property(x => x.Id_Type).HasMaxLength(64);
            b.Property(x => x.Id_Issuing_Country).HasMaxLength(128);
            b.Property(x => x.Id_Number).HasMaxLength(64);
            b.HasIndex(x => x.Id_Number);
        });

        builder.Entity<Floor>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "Floors", HotelConsts.DbSchema);
            b.ConfigureByConvention();
        });

        builder.Entity<RoomType>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "RoomTypes", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(100);
        });

        builder.Entity<UiTranslationsStore>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "UiTranslationsStores", HotelConsts.DbSchema);
            b.ConfigureByConvention();
        });

        builder.Entity<GeneralCodeItem>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "GeneralCodeItems", HotelConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Category).IsRequired().HasMaxLength(64);
            b.Property(x => x.Name).IsRequired().HasMaxLength(256);
            b.Property(x => x.FName).HasMaxLength(256);
            b.Property(x => x.Description).HasMaxLength(1024);
            b.HasIndex(x => x.Category);
        });

        builder.Entity<PaymentMethod>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "PaymentMethods", HotelConsts.DbSchema);
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
        });

        builder.Entity<HotelSettingsDocument>(b =>
        {
            b.ToTable(HotelConsts.DbTablePrefix + "HotelSettingsDocuments", HotelConsts.DbSchema);
            b.Property(x => x.SettingsPassword).IsRequired().HasMaxLength(128);
            b.Property(x => x.HotelImageDataUrl);
            b.Property(x => x.ProfileJson).IsRequired();
            b.Property(x => x.CurrencyId).IsRequired().HasMaxLength(32);
            b.Property(x => x.CurrencySymbol).HasMaxLength(16);
            b.Property(x => x.CurrencyCode).HasMaxLength(16);
        });
    }
}


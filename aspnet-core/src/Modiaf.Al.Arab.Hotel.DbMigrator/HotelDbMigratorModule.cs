using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace Modiaf.Al.Arab.Hotel.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(HotelEntityFrameworkCoreModule),
    typeof(HotelApplicationContractsModule)
    )]
public class HotelDbMigratorModule : AbpModule
{
}

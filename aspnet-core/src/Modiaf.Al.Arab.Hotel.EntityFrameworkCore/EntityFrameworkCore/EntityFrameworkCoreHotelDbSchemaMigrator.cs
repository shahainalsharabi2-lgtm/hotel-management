using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Modiaf.Al.Arab.Hotel.Data;
using Volo.Abp.DependencyInjection;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

public class EntityFrameworkCoreHotelDbSchemaMigrator(IServiceProvider serviceProvider)
    : IHotelDbSchemaMigrator, ITransientDependency
{
    public async Task MigrateAsync()
    {
        /* We intentionally resolve the HotelDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await serviceProvider
            .GetRequiredService<HotelDbContext>()
            .Database
            .MigrateAsync();
    }
}

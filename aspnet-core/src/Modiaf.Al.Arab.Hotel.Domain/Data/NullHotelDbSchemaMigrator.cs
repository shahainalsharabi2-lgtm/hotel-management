using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Modiaf.Al.Arab.Hotel.Data;

/* This is used if database provider does't define
 * IHotelDbSchemaMigrator implementation.
 */
public class NullHotelDbSchemaMigrator : IHotelDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}

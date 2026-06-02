using System.Threading.Tasks;

namespace Modiaf.Al.Arab.Hotel.Data;

public interface IHotelDbSchemaMigrator
{
    Task MigrateAsync();
}

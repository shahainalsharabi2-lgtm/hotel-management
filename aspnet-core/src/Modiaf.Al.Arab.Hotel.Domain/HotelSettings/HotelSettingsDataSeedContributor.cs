using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.HotelSettings;

public class HotelSettingsDataSeedContributor(IRepository<HotelSettingsDocument, System.Guid> repository)
    : IDataSeedContributor, ITransientDependency
{
    public async Task SeedAsync(DataSeedContext context)
    {
        if (await repository.FindAsync(HotelSettingsDocument.SingletonId) != null)
        {
            return;
        }

        await repository.InsertAsync(new HotelSettingsDocument(HotelSettingsDocument.SingletonId), autoSave: true);
    }
}

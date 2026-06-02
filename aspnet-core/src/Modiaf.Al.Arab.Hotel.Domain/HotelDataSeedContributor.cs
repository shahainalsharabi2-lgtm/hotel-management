using System.Threading.Tasks;
using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Modiaf.Al.Arab.Hotel.Rooms;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel;
//البذر
public class HotelDataSeedContributor(
    IRepository<Room, int> roomRepository,
    IRepository<IdentityType, int> identityTypeRepository) : IDataSeedContributor, ITransientDependency
{
    public async Task SeedAsync(DataSeedContext context)
    {
        if (await roomRepository.GetCountAsync() <= 0)
        {
            await roomRepository.InsertAsync(new Room("101", "Single", "available", 100, 1));
            await roomRepository.InsertAsync(new Room("102", "Double", "available", 150, 1));
            await roomRepository.InsertAsync(new Room("201", "Suite", "available", 300, 2));
            await roomRepository.InsertAsync(new Room("202", "Single", "available", 100, 2));
        }

        if (await identityTypeRepository.GetCountAsync() <= 0)
        {
            await identityTypeRepository.InsertAsync(new IdentityType("جواز سفر"));
            await identityTypeRepository.InsertAsync(new IdentityType("هوية وطنية"));
            await identityTypeRepository.InsertAsync(new IdentityType("عقد زواج"));
        }
    }
}

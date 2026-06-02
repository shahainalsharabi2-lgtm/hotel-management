using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Modiaf.Al.Arab.Hotel.RoomTypes;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

namespace Modiaf.Al.Arab.Hotel.Repository;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IRepository<RoomType, int>), typeof(IRoomTypeRepository))]
public class EfCoreRoomTypeRepository(IDbContextProvider<HotelDbContext> dbContextProvider)
    : EfCoreRepository<HotelDbContext, RoomType, int>(dbContextProvider), IRoomTypeRepository;

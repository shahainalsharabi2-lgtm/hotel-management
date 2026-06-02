using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Modiaf.Al.Arab.Hotel.Rooms;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

namespace Modiaf.Al.Arab.Hotel.Repository;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IRepository<Room, int>), typeof(IRoomRepository))]
public class EfCoreRoomRepository(IDbContextProvider<HotelDbContext> dbContextProvider)
    : EfCoreRepository<HotelDbContext, Room, int>(dbContextProvider), IRoomRepository;

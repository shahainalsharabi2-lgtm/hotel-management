using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Modiaf.Al.Arab.Hotel.Floors;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

namespace Modiaf.Al.Arab.Hotel.Repository;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IRepository<Floor, int>), typeof(IFloorRepository))]
public class EfCoreFloorRepository(IDbContextProvider<HotelDbContext> dbContextProvider)
    : EfCoreRepository<HotelDbContext, Floor, int>(dbContextProvider), IFloorRepository;

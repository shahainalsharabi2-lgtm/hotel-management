using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

namespace Modiaf.Al.Arab.Hotel.Repository;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IRepository<IdentityType, int>), typeof(IIdentityTypeRepository))]
public class EfCoreIdentityTypeRepository(IDbContextProvider<HotelDbContext> dbContextProvider)
    : EfCoreRepository<HotelDbContext, IdentityType, int>(dbContextProvider), IIdentityTypeRepository;

using Modiaf.Al.Arab.Hotel.Bookings;
using Modiaf.Al.Arab.Hotel.EntityFrameworkCore;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;

namespace Modiaf.Al.Arab.Hotel.Repository;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IRepository<Booking, int>), typeof(IBookingRepository))]
public class EfCoreBookingRepository(IDbContextProvider<HotelDbContext> dbContextProvider)
    : EfCoreRepository<HotelDbContext, Booking, int>(dbContextProvider), IBookingRepository;

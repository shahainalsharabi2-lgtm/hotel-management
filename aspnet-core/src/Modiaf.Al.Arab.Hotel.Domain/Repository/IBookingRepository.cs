using Modiaf.Al.Arab.Hotel.Bookings;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.Repository;

public interface IBookingRepository : IRepository<Booking, int>
{
}

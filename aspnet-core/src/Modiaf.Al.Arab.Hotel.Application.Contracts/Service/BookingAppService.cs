using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.Bookings;

public interface IBookingAppService : ICrudAppService<BookingDto, int, PagedAndSortedResultRequestDto, CreateUpdateBookingDto>
{
}

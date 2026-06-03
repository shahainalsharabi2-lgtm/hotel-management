using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public interface IHotelAppUserAppService
    : ICrudAppService<HotelAppUserDto, int, PagedAndSortedResultRequestDto, CreateUpdateHotelAppUserDto>
{
}

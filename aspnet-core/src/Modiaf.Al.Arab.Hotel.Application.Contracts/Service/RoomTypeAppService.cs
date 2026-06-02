using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.RoomTypes;

public interface IRoomTypeAppService : ICrudAppService<RoomTypeDto, int, PagedAndSortedResultRequestDto, CreateUpdateRoomTypeDto>
{
}

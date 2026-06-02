using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.Rooms;

public interface IRoomAppService : ICrudAppService<RoomDto, int, PagedAndSortedResultRequestDto, CreateUpdateRoomDto>
{
    Task<ResetRoomStatusesResultDto> ResetAllStatusesAsync(ResetRoomStatusesInput input);
}

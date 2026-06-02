using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.Floors;

public interface IFloorAppService : ICrudAppService<FloorDto, int, PagedAndSortedResultRequestDto, CreateUpdateFloorDto>
{
}

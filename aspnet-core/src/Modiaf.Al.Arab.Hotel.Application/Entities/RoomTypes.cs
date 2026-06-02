using Modiaf.Al.Arab.Hotel.RoomTypes;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;

namespace Modiaf.Al.Arab.Hotel.RoomTypes;

[AllowAnonymous]
public class RoomTypeAppService(IRepository<RoomType, int> repository)
    : CrudAppService<RoomType, RoomTypeDto, int, PagedAndSortedResultRequestDto, CreateUpdateRoomTypeDto>(repository),
        IRoomTypeAppService
{
    protected override RoomTypeDto MapToGetOutputDto(RoomType entity)
    {
        return new RoomTypeDto { Id = entity.Id, Name = entity.Name };
    }

    protected override RoomType MapToEntity(CreateUpdateRoomTypeDto createInput)
    {
        return new RoomType(createInput.Name);
    }

    protected override void MapToEntity(CreateUpdateRoomTypeDto updateInput, RoomType entity)
    {
        entity.Name = updateInput.Name;
    }
}

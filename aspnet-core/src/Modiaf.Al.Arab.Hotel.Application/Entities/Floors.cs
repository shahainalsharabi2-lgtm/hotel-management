using Modiaf.Al.Arab.Hotel.Floors;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;

namespace Modiaf.Al.Arab.Hotel.Floors;

[AllowAnonymous]
public class FloorAppService(IRepository<Floor, int> repository)
    : CrudAppService<Floor, FloorDto, int, PagedAndSortedResultRequestDto, CreateUpdateFloorDto>(repository),
        IFloorAppService
{
    protected override FloorDto MapToGetOutputDto(Floor entity)
    {
        return new FloorDto
        {
            Id = entity.Id,
            Level = entity.Level,
            RoomsCount = entity.RoomsCount,
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }

    protected override Floor MapToEntity(CreateUpdateFloorDto createInput)
    {
        return new Floor(createInput.Level, createInput.RoomsCount);
    }

    protected override void MapToEntity(CreateUpdateFloorDto updateInput, Floor entity)
    {
        entity.Level = updateInput.Level;
        entity.RoomsCount = updateInput.RoomsCount;
    }
}

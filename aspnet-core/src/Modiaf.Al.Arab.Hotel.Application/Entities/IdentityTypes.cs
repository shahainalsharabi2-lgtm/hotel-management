using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;

namespace Modiaf.Al.Arab.Hotel.IdentityTypes;

[AllowAnonymous]
public class IdentityTypeAppService(IRepository<IdentityType, int> repository)
    : CrudAppService<IdentityType, IdentityTypeDto, int, PagedAndSortedResultRequestDto, CreateUpdateIdentityTypeDto>(repository),
        IIdentityTypeAppService
{
    protected override IdentityTypeDto MapToGetOutputDto(IdentityType entity)
    {
        return new IdentityTypeDto
        {
            Id = entity.Id,
            Name = entity.Name
        };
    }

    protected override IdentityType MapToEntity(CreateUpdateIdentityTypeDto createInput)
    {
        return new IdentityType(createInput.Name);
    }

    protected override void MapToEntity(CreateUpdateIdentityTypeDto updateInput, IdentityType entity)
    {
        entity.Name = updateInput.Name;
    }
}

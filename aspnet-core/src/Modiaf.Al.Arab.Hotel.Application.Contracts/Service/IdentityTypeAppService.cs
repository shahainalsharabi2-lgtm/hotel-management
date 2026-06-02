using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.IdentityTypes;

public interface IIdentityTypeAppService : ICrudAppService<IdentityTypeDto, int, PagedAndSortedResultRequestDto, CreateUpdateIdentityTypeDto>
{
}

using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.GuestRegistries;

public interface IGuestRegistryAppService
    : ICrudAppService<GuestRegistryDto, int, PagedAndSortedResultRequestDto, CreateUpdateGuestRegistryDto>
{
    Task<GuestRegistryDto> SaveProfileAsync(CreateUpdateGuestRegistryDto input);
}

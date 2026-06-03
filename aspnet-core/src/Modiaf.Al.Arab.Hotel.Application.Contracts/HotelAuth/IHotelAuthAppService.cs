using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.HotelAuth;

public interface IHotelAuthAppService : IApplicationService
{
    Task<HotelLoginResultDto> LoginAsync(HotelLoginInputDto input);
}

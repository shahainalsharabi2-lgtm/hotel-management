using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.HotelSettings;

public interface IHotelSettingsAppService : IApplicationService
{
    Task<HotelSettingsDto> GetAsync();

    Task<HotelSettingsDto> UpdateAsync(HotelSettingsDto input);
}

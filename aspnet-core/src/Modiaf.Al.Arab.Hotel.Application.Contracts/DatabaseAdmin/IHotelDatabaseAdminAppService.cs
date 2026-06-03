using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.DatabaseAdmin;

public interface IHotelDatabaseAdminAppService : IApplicationService
{
    Task<HotelDatabaseBackupDto> CreateBackupAsync();
    Task<HotelDatabaseOperationResultDto> UpdateDatabaseAsync();
}

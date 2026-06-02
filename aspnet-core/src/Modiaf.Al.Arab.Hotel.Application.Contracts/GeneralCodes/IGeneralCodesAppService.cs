using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public interface IGeneralCodesAppService : IApplicationService
{
    Task<IReadOnlyList<GeneralCodeItemDto>> GetListAsync(GetGeneralCodeListInput input);

    Task<GeneralCodeItemDto> CreateAsync(CreateGeneralCodeItemInput input);

    Task<GeneralCodeItemDto> UpdateAsync(Guid id, CreateUpdateGeneralCodeItemDto input);

    Task DeleteAsync(Guid id);
}

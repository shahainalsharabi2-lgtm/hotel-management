using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

[AllowAnonymous]
public class GeneralCodesAppService(IGeneralCodesStore store)
    : ApplicationService, IGeneralCodesAppService
{
    public Task<IReadOnlyList<GeneralCodeItemDto>> GetListAsync(GetGeneralCodeListInput input)
    {
        return store.GetByCategoryAsync(input.Category);
    }

    public Task<GeneralCodeItemDto> CreateAsync(CreateGeneralCodeItemInput input)
    {
        return store.CreateAsync(input.Category, input);
    }

    public Task<GeneralCodeItemDto> UpdateAsync(Guid id, CreateUpdateGeneralCodeItemDto input)
    {
        return store.UpdateAsync(id, input);
    }

    public Task DeleteAsync(Guid id)
    {
        return store.DeleteAsync(id);
    }
}

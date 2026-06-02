using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public interface IGeneralCodesStore
{
    Task<IReadOnlyList<GeneralCodeItemDto>> GetByCategoryAsync(
        string category,
        CancellationToken cancellationToken = default);

    Task<GeneralCodeItemDto> CreateAsync(
        string category,
        CreateUpdateGeneralCodeItemDto input,
        CancellationToken cancellationToken = default);

    Task<GeneralCodeItemDto> UpdateAsync(
        Guid id,
        CreateUpdateGeneralCodeItemDto input,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

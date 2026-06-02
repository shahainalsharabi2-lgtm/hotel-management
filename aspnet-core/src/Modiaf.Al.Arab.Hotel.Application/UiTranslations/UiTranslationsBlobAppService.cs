using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;


[AllowAnonymous]
public class UiTranslationsBlobAppService(IUiTranslationsFileStore fileStore)
    : ApplicationService, IUiTranslationsBlobAppService
{
    public async Task<UiTranslationsBlobDto> GetAsync()
    {
        var json = await fileStore.ReadCombinedPayloadJsonAsync().ConfigureAwait(false);
        return new UiTranslationsBlobDto { PayloadJson = json };
    }

    public async Task UpdateAsync(UiTranslationsBlobDto input)
    {
        await fileStore
            .WriteCombinedPayloadJsonAsync(input.PayloadJson ?? "{}")
            .ConfigureAwait(false);
    }
}

using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

public interface IUiTranslationsBlobAppService : IApplicationService
{
    Task<UiTranslationsBlobDto> GetAsync();

    Task UpdateAsync(UiTranslationsBlobDto input);
}

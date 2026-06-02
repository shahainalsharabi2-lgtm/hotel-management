using System.Threading;
using System.Threading.Tasks;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

public interface IUiTranslationsFileStore
{
    Task<string> ReadCombinedPayloadJsonAsync(CancellationToken cancellationToken = default);

    Task WriteCombinedPayloadJsonAsync(string payloadJson, CancellationToken cancellationToken = default);
}

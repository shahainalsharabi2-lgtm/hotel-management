using Microsoft.Extensions.Localization;
using Modiaf.Al.Arab.Hotel.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace Modiaf.Al.Arab.Hotel;

[Dependency(ReplaceServices = true)]
public class HotelBrandingProvider(IStringLocalizer<HotelResource> localizer) : DefaultBrandingProvider
{
    public override string AppName => localizer["AppName"];
}

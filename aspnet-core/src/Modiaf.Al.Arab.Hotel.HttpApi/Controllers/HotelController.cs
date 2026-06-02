using Modiaf.Al.Arab.Hotel.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace Modiaf.Al.Arab.Hotel.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class HotelController : AbpControllerBase
{
    protected HotelController()
    {
        LocalizationResource = typeof(HotelResource);
    }
}

using System;
using System.Collections.Generic;
using System.Text;
using Modiaf.Al.Arab.Hotel.Localization;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel;

/* Inherit your application services from this class.
 */
public abstract class HotelAppService : ApplicationService
{
    protected HotelAppService()
    {
        LocalizationResource = typeof(HotelResource);
    }
}

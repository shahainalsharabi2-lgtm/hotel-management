using Volo.Abp.Modularity;

namespace Modiaf.Al.Arab.Hotel;

/* Inherit from this class for your domain layer tests. */
public abstract class HotelDomainTestBase<TStartupModule> : HotelTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}

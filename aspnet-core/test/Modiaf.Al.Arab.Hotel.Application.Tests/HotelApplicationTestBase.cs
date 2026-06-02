using Volo.Abp.Modularity;

namespace Modiaf.Al.Arab.Hotel;

public abstract class HotelApplicationTestBase<TStartupModule> : HotelTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}

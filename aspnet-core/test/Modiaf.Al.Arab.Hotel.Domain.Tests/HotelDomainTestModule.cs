using Volo.Abp.Modularity;

namespace Modiaf.Al.Arab.Hotel;

[DependsOn(
    typeof(HotelDomainModule),
    typeof(HotelTestBaseModule)
)]
public class HotelDomainTestModule : AbpModule
{

}

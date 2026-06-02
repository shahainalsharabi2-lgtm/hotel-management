using Volo.Abp.Modularity;

namespace Modiaf.Al.Arab.Hotel;

[DependsOn(
    typeof(HotelApplicationModule),
    typeof(HotelDomainTestModule)
)]
public class HotelApplicationTestModule : AbpModule
{

}

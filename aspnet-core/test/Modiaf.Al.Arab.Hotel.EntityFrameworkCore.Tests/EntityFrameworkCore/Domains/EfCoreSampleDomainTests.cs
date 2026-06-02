using Modiaf.Al.Arab.Hotel.Samples;
using Xunit;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore.Domains;

[Collection(HotelTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<HotelEntityFrameworkCoreTestModule>
{

}

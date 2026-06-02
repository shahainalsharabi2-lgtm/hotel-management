using Modiaf.Al.Arab.Hotel.Samples;
using Xunit;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore.Applications;

[Collection(HotelTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<HotelEntityFrameworkCoreTestModule>
{

}

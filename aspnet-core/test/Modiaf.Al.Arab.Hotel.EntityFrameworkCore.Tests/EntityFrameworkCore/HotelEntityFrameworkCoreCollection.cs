using Xunit;

namespace Modiaf.Al.Arab.Hotel.EntityFrameworkCore;

[CollectionDefinition(HotelTestConsts.CollectionDefinitionName)]
public class HotelEntityFrameworkCoreCollection : ICollectionFixture<HotelEntityFrameworkCoreFixture>
{

}

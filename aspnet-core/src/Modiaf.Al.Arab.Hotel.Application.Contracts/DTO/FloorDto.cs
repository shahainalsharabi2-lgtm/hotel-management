using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.Floors;

public class FloorDto : FullAuditedEntityDto<int>
{
    public int Level { get; set; }
    public int RoomsCount { get; set; }
}

public class CreateUpdateFloorDto
{
    public int Level { get; set; }
    public int RoomsCount { get; set; }
}

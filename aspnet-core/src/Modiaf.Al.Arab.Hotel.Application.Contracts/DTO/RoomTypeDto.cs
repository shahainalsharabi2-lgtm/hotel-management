using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.RoomTypes;

public class RoomTypeDto : EntityDto<int>
{
    public string Name { get; set; }
}

public class CreateUpdateRoomTypeDto
{
    public string Name { get; set; }
}

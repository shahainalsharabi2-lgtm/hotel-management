using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.Floors;

public class Floor : FullAuditedEntity<int>
{
    public int Level { get; set; }
    public int RoomsCount { get; set; }

    protected Floor()
    {
    }

    public Floor(int level, int roomsCount)
    {
        Level = level;
        RoomsCount = roomsCount;
    }
}

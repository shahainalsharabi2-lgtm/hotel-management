using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.RoomTypes;

public class RoomType : Entity<int>
{
    public string Name { get; set; }

    protected RoomType()
    {
    }

    public RoomType(string name)
    {
        Name = name;
    }
}
